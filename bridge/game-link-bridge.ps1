$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing

$source = @'
using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Drawing;
using System.IO;
using System.Net;
using System.Net.Sockets;
using System.Runtime.InteropServices;
using System.Security.Cryptography;
using System.Text;
using System.Windows.Forms;

public sealed class GameLinkBridgeForm : Form
{
    private const int WH_KEYBOARD_LL = 13;
    private const int WM_KEYDOWN = 0x0100;
    private const int WM_KEYUP = 0x0101;
    private const int WM_SYSKEYDOWN = 0x0104;
    private const int WM_SYSKEYUP = 0x0105;
    private const int Port = 16888;

    private delegate IntPtr HookProc(int nCode, IntPtr wParam, IntPtr lParam);
    private readonly HookProc hookProc;
    private IntPtr hook = IntPtr.Zero;
    private readonly TcpListener listener;
    private readonly List<TcpClient> clients = new List<TcpClient>();
    private readonly Timer timer = new Timer();
    private readonly Label keyLabel = new Label();
    private readonly Label statusLabel = new Label();
    private readonly Button captureButton = new Button();
    private bool captureNext;
    private int triggerKey;
    private bool triggerKeyDown;

    public GameLinkBridgeForm()
    {
        Text = "OBS Game Link Bridge";
        ClientSize = new Size(430, 230);
        FormBorderStyle = FormBorderStyle.FixedDialog;
        MaximizeBox = false;
        StartPosition = FormStartPosition.CenterScreen;
        Font = new Font("Segoe UI", 10F);

        var title = new Label { Text = "OBS Game Link Bridge", Font = new Font("Segoe UI", 16F, FontStyle.Bold), AutoSize = true, Location = new Point(24, 22) };
        keyLabel.Text = "Trigger key: Not set";
        keyLabel.AutoSize = true;
        keyLabel.Location = new Point(26, 76);
        captureButton.Text = "Set trigger key";
        captureButton.Size = new Size(150, 40);
        captureButton.Location = new Point(25, 108);
        captureButton.Click += delegate { captureNext = true; captureButton.Text = "Press a key..."; };
        statusLabel.Text = "Connected overlays: 0";
        statusLabel.AutoSize = true;
        statusLabel.Location = new Point(26, 174);
        var note = new Label { Text = "Keep this window open while using OBS.", AutoSize = true, ForeColor = Color.DimGray, Location = new Point(195, 120) };
        Controls.AddRange(new Control[] { title, keyLabel, captureButton, statusLabel, note });

        hookProc = KeyboardHook;
        hook = SetHook(hookProc);
        listener = new TcpListener(IPAddress.Loopback, Port);
        listener.Start();
        timer.Interval = 250;
        timer.Tick += PollConnections;
        timer.Start();
    }

    private void PollConnections(object sender, EventArgs e)
    {
        try {
            while (listener.Pending()) {
                var client = listener.AcceptTcpClient();
                client.NoDelay = true;
                if (PerformHandshake(client)) clients.Add(client); else client.Close();
            }
        } catch { }
        clients.RemoveAll(c => !IsConnected(c));
        statusLabel.Text = "Connected overlays: " + clients.Count;
    }

    private static bool PerformHandshake(TcpClient client)
    {
        try {
            var stream = client.GetStream();
            stream.ReadTimeout = 2000;
            var bytes = new List<byte>();
            var buffer = new byte[1];
            while (bytes.Count < 16384) {
                if (stream.Read(buffer, 0, 1) != 1) return false;
                bytes.Add(buffer[0]);
                int n = bytes.Count;
                if (n >= 4 && bytes[n-4] == 13 && bytes[n-3] == 10 && bytes[n-2] == 13 && bytes[n-1] == 10) break;
            }
            string request = Encoding.UTF8.GetString(bytes.ToArray());
            string key = null;
            foreach (string line in request.Split(new[] { "\r\n" }, StringSplitOptions.None))
                if (line.StartsWith("Sec-WebSocket-Key:", StringComparison.OrdinalIgnoreCase)) key = line.Substring(line.IndexOf(':') + 1).Trim();
            if (String.IsNullOrEmpty(key)) return false;
            string accept;
            using (var sha = SHA1.Create()) accept = Convert.ToBase64String(sha.ComputeHash(Encoding.ASCII.GetBytes(key + "258EAFA5-E914-47DA-95CA-C5AB0DC85B11")));
            string response = "HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Accept: " + accept + "\r\n\r\n";
            byte[] responseBytes = Encoding.ASCII.GetBytes(response);
            stream.Write(responseBytes, 0, responseBytes.Length);
            stream.ReadTimeout = System.Threading.Timeout.Infinite;
            return true;
        } catch { return false; }
    }

    private static bool IsConnected(TcpClient client)
    {
        try { return client.Connected && !(client.Client.Poll(1, SelectMode.SelectRead) && client.Client.Available == 0); }
        catch { return false; }
    }

    private void BroadcastTrigger()
    {
        byte[] payload = Encoding.UTF8.GetBytes("{\"type\":\"overlay.trigger\",\"source\":\"keyboard\"}");
        var frame = new byte[payload.Length + 2];
        frame[0] = 0x81;
        frame[1] = (byte)payload.Length;
        Buffer.BlockCopy(payload, 0, frame, 2, payload.Length);
        for (int i = clients.Count - 1; i >= 0; i--) {
            try { clients[i].GetStream().Write(frame, 0, frame.Length); }
            catch { clients[i].Close(); clients.RemoveAt(i); }
        }
        statusLabel.Text = "Triggered / Connected: " + clients.Count;
    }

    private IntPtr KeyboardHook(int nCode, IntPtr wParam, IntPtr lParam)
    {
        if (nCode >= 0) {
            int message = wParam.ToInt32();
            int vk = Marshal.ReadInt32(lParam);
            if (message == WM_KEYDOWN || message == WM_SYSKEYDOWN) {
                if (captureNext) {
                    captureNext = false; triggerKey = vk; triggerKeyDown = true;
                    BeginInvoke((MethodInvoker)delegate { keyLabel.Text = "Trigger key: " + ((Keys)vk); captureButton.Text = "Set trigger key"; });
                } else if (triggerKey != 0 && vk == triggerKey && !triggerKeyDown) {
                    triggerKeyDown = true; BeginInvoke((MethodInvoker)BroadcastTrigger);
                }
            } else if ((message == WM_KEYUP || message == WM_SYSKEYUP) && vk == triggerKey) triggerKeyDown = false;
        }
        return CallNextHookEx(hook, nCode, wParam, lParam);
    }

    protected override void OnFormClosed(FormClosedEventArgs e)
    {
        timer.Stop();
        foreach (var client in clients) client.Close();
        listener.Stop();
        if (hook != IntPtr.Zero) UnhookWindowsHookEx(hook);
        base.OnFormClosed(e);
    }

    private static IntPtr SetHook(HookProc proc)
    {
        using (Process process = Process.GetCurrentProcess())
        using (ProcessModule module = process.MainModule)
            return SetWindowsHookEx(WH_KEYBOARD_LL, proc, GetModuleHandle(module.ModuleName), 0);
    }

    [DllImport("user32.dll", CharSet = CharSet.Auto, SetLastError = true)] private static extern IntPtr SetWindowsHookEx(int idHook, HookProc callback, IntPtr module, uint threadId);
    [DllImport("user32.dll", CharSet = CharSet.Auto, SetLastError = true)] private static extern bool UnhookWindowsHookEx(IntPtr hook);
    [DllImport("user32.dll", CharSet = CharSet.Auto, SetLastError = true)] private static extern IntPtr CallNextHookEx(IntPtr hook, int code, IntPtr wParam, IntPtr lParam);
    [DllImport("kernel32.dll", CharSet = CharSet.Auto, SetLastError = true)] private static extern IntPtr GetModuleHandle(string moduleName);
}
'@

Add-Type -TypeDefinition $source -ReferencedAssemblies System.Windows.Forms,System.Drawing,System,System.Core
if ($env:OBS_GAME_LINK_COMPILE_ONLY -eq '1') { exit 0 }
[System.Windows.Forms.Application]::EnableVisualStyles()
[System.Windows.Forms.Application]::Run([GameLinkBridgeForm]::new())
