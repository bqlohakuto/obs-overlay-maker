$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing

$source = @'
using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Drawing;
using System.Net;
using System.Net.Sockets;
using System.Runtime.InteropServices;
using System.Security.Cryptography;
using System.Text;
using System.Windows.Forms;

public sealed class GameLinkBridgeForm : Form
{
    private const int WH_KEYBOARD_LL = 13, WM_KEYDOWN = 0x0100, WM_KEYUP = 0x0101, WM_SYSKEYDOWN = 0x0104, WM_SYSKEYUP = 0x0105, Port = 16888;
    private delegate IntPtr HookProc(int code, IntPtr wParam, IntPtr lParam);
    private readonly HookProc hookProc;
    private IntPtr hook = IntPtr.Zero;
    private readonly TcpListener listener;
    private readonly List<TcpClient> clients = new List<TcpClient>();
    private readonly HashSet<int> downKeys = new HashSet<int>();
    private readonly Timer timer = new Timer();
    private readonly Label victoryLabel = NewLabel("Victory key: Not set", 26, 74);
    private readonly Label defeatLabel = NewLabel("Defeat key: Not set", 26, 126);
    private readonly Label ultLabel = NewLabel("ULT key: Not set", 26, 178);
    private readonly Label statusLabel = NewLabel("Connected overlays: 0", 26, 282);
    private readonly Button victoryButton = NewButton("Set victory key", 220, 62);
    private readonly Button defeatButton = NewButton("Set defeat key", 220, 114);
    private readonly Button ultButton = NewButton("Set ULT key", 220, 166);
    private string captureTarget;
    private int victoryKey, defeatKey, ultKey;

    public GameLinkBridgeForm()
    {
        Text = "OBS Stream Deck Bridge"; ClientSize = new Size(430, 355); FormBorderStyle = FormBorderStyle.FixedDialog;
        MaximizeBox = false; StartPosition = FormStartPosition.CenterScreen; Font = new Font("Segoe UI", 10F);
        var title = NewLabel("OBS Stream Deck Bridge", 24, 22); title.Font = new Font("Segoe UI", 16F, FontStyle.Bold);
        victoryButton.Click += delegate { BeginCapture("victory"); };
        defeatButton.Click += delegate { BeginCapture("defeat"); };
        ultButton.Click += delegate { BeginCapture("ult"); };
        var resetButton = NewButton("Reset WIN / LOSS", 26, 226); resetButton.Size = new Size(180, 40); resetButton.Click += delegate { Broadcast("counters.reset"); };
        var note = NewLabel("Assign the same keys to Stream Deck Hotkey actions.", 26, 320); note.ForeColor = Color.DimGray;
        Controls.AddRange(new Control[] { title, victoryLabel, defeatLabel, ultLabel, victoryButton, defeatButton, ultButton, resetButton, statusLabel, note });
        hookProc = KeyboardHook; hook = SetHook(hookProc);
        listener = new TcpListener(IPAddress.Loopback, Port); listener.Start();
        timer.Interval = 250; timer.Tick += PollConnections; timer.Start();
    }

    private static Label NewLabel(string text, int x, int y) { return new Label { Text = text, AutoSize = true, Location = new Point(x, y) }; }
    private static Button NewButton(string text, int x, int y) { return new Button { Text = text, Size = new Size(180, 38), Location = new Point(x, y) }; }
    private void BeginCapture(string target) { captureTarget = target; statusLabel.Text = "Press the key for " + target + "..."; }

    private void PollConnections(object sender, EventArgs e)
    {
        try { while (listener.Pending()) { var client = listener.AcceptTcpClient(); client.NoDelay = true; if (Handshake(client)) clients.Add(client); else client.Close(); } } catch { }
        clients.RemoveAll(client => !IsConnected(client)); statusLabel.Text = "Connected overlays: " + clients.Count;
    }

    private static bool Handshake(TcpClient client)
    {
        try {
            var stream = client.GetStream(); stream.ReadTimeout = 2000; var bytes = new List<byte>(); var one = new byte[1];
            while (bytes.Count < 16384) { if (stream.Read(one, 0, 1) != 1) return false; bytes.Add(one[0]); int n = bytes.Count; if (n >= 4 && bytes[n-4] == 13 && bytes[n-3] == 10 && bytes[n-2] == 13 && bytes[n-1] == 10) break; }
            string key = null, request = Encoding.UTF8.GetString(bytes.ToArray());
            foreach (string line in request.Split(new[] { "\r\n" }, StringSplitOptions.None)) if (line.StartsWith("Sec-WebSocket-Key:", StringComparison.OrdinalIgnoreCase)) key = line.Substring(line.IndexOf(':') + 1).Trim();
            if (String.IsNullOrEmpty(key)) return false;
            string accept; using (var sha = SHA1.Create()) accept = Convert.ToBase64String(sha.ComputeHash(Encoding.ASCII.GetBytes(key + "258EAFA5-E914-47DA-95CA-C5AB0DC85B11")));
            byte[] response = Encoding.ASCII.GetBytes("HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Accept: " + accept + "\r\n\r\n");
            stream.Write(response, 0, response.Length); stream.ReadTimeout = System.Threading.Timeout.Infinite; return true;
        } catch { return false; }
    }

    private static bool IsConnected(TcpClient client) { try { return client.Connected && !(client.Client.Poll(1, SelectMode.SelectRead) && client.Client.Available == 0); } catch { return false; } }

    private void Broadcast(string type)
    {
        byte[] payload = Encoding.UTF8.GetBytes("{\"type\":\"" + type + "\",\"source\":\"stream-deck\"}");
        var frame = new byte[payload.Length + 2]; frame[0] = 0x81; frame[1] = (byte)payload.Length; Buffer.BlockCopy(payload, 0, frame, 2, payload.Length);
        for (int i = clients.Count - 1; i >= 0; i--) { try { clients[i].GetStream().Write(frame, 0, frame.Length); } catch { clients[i].Close(); clients.RemoveAt(i); } }
        statusLabel.Text = type + " / Connected: " + clients.Count;
    }

    private IntPtr KeyboardHook(int code, IntPtr wParam, IntPtr lParam)
    {
        if (code >= 0) {
            int message = wParam.ToInt32(), key = Marshal.ReadInt32(lParam);
            if (message == WM_KEYDOWN || message == WM_SYSKEYDOWN) {
                if (!downKeys.Add(key)) return CallNextHookEx(hook, code, wParam, lParam);
                if (!String.IsNullOrEmpty(captureTarget)) {
                    string target = captureTarget; captureTarget = null;
                    if (target == "victory") victoryKey = key; else if (target == "defeat") defeatKey = key; else ultKey = key;
                    BeginInvoke((MethodInvoker)delegate { UpdateKeyLabel(target, key); });
                } else if (key == victoryKey && victoryKey != 0) BeginInvoke((MethodInvoker)delegate { Broadcast("game.victory"); });
                else if (key == defeatKey && defeatKey != 0) BeginInvoke((MethodInvoker)delegate { Broadcast("game.defeat"); });
                else if (key == ultKey && ultKey != 0) BeginInvoke((MethodInvoker)delegate { Broadcast("game.ult"); });
            } else if (message == WM_KEYUP || message == WM_SYSKEYUP) downKeys.Remove(key);
        }
        return CallNextHookEx(hook, code, wParam, lParam);
    }

    private void UpdateKeyLabel(string target, int key)
    {
        string name = ((Keys)key).ToString();
        if (target == "victory") victoryLabel.Text = "Victory key: " + name;
        else if (target == "defeat") defeatLabel.Text = "Defeat key: " + name;
        else ultLabel.Text = "ULT key: " + name;
        statusLabel.Text = "Assigned " + name + " to " + target;
    }

    protected override void OnFormClosed(FormClosedEventArgs e) { timer.Stop(); foreach (var client in clients) client.Close(); listener.Stop(); if (hook != IntPtr.Zero) UnhookWindowsHookEx(hook); base.OnFormClosed(e); }
    private static IntPtr SetHook(HookProc proc) { using (Process process = Process.GetCurrentProcess()) using (ProcessModule module = process.MainModule) return SetWindowsHookEx(WH_KEYBOARD_LL, proc, GetModuleHandle(module.ModuleName), 0); }
    [DllImport("user32.dll", CharSet = CharSet.Auto, SetLastError = true)] private static extern IntPtr SetWindowsHookEx(int id, HookProc callback, IntPtr module, uint threadId);
    [DllImport("user32.dll", CharSet = CharSet.Auto, SetLastError = true)] private static extern bool UnhookWindowsHookEx(IntPtr hook);
    [DllImport("user32.dll", CharSet = CharSet.Auto, SetLastError = true)] private static extern IntPtr CallNextHookEx(IntPtr hook, int code, IntPtr wParam, IntPtr lParam);
    [DllImport("kernel32.dll", CharSet = CharSet.Auto, SetLastError = true)] private static extern IntPtr GetModuleHandle(string name);
}
'@

Add-Type -TypeDefinition $source -ReferencedAssemblies System.Windows.Forms,System.Drawing,System,System.Core
if ($env:OBS_GAME_LINK_COMPILE_ONLY -eq '1') { exit 0 }
[System.Windows.Forms.Application]::EnableVisualStyles()
[System.Windows.Forms.Application]::Run([GameLinkBridgeForm]::new())
