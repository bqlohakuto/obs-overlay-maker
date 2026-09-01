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
    private const string VictoryPattern = "000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000111100011011001111111111111011111101111110111001110111110011111101111111111111111111111111111101110111111011101111110111111111111111111111111111110111111011101110110111011100000011100111001111111111001111000110011111011101110000001110011100111111111100111100011001111101110111111000111001111111111001110001110001100111100111011111110011100111111111100111000111001110001110001100111111001110001111110110011100011100111000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000";
    private const string DefeatPattern = "000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000001111111011111111111111111111101111111111111110000000111111111111111111111111111110111111111111111000000011100111111111011111101111111111001110011110000000001110011111111111111111111111111111111001111000000000111001111111111111111111111111111111100111100000000011111111111111111100001111111111001110011110000000001111111011111111110000111111111100111001111000000000111111101111110011000001111110110001100011000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000";

    private delegate IntPtr HookProc(int nCode, IntPtr wParam, IntPtr lParam);
    private readonly HookProc hookProc;
    private IntPtr hook = IntPtr.Zero;
    private readonly TcpListener listener;
    private readonly List<TcpClient> clients = new List<TcpClient>();
    private readonly Timer timer = new Timer();
    private readonly Label keyLabel = new Label();
    private readonly Label statusLabel = new Label();
    private readonly Button captureButton = new Button();
    private readonly Button resetButton = new Button();
    private bool captureNext;
    private int triggerKey;
    private bool triggerKeyDown;
    private int scanTick;
    private int victoryFrames;
    private int defeatFrames;
    private bool ultReady;
    private DateTime lastVictory = DateTime.MinValue;
    private DateTime lastDefeat = DateTime.MinValue;
    private DateTime lastUlt = DateTime.MinValue;

    public GameLinkBridgeForm()
    {
        Text = "OBS Game Link Bridge";
        ClientSize = new Size(430, 260);
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
        resetButton.Text = "Reset WIN / LOSS";
        resetButton.Size = new Size(180, 40);
        resetButton.Location = new Point(195, 108);
        resetButton.Click += delegate { Broadcast("counters.reset"); };
        statusLabel.Location = new Point(26, 174);
        var note = new Label { Text = "Keep this window open while using OBS.", AutoSize = true, ForeColor = Color.DimGray, Location = new Point(26, 214) };
        Controls.AddRange(new Control[] { title, keyLabel, captureButton, resetButton, statusLabel, note });

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
        if (++scanTick % 2 == 0) DetectGameScreen();
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

    private void Broadcast(string type)
    {
        byte[] payload = Encoding.UTF8.GetBytes("{\"type\":\"" + type + "\",\"source\":\"screen-bridge\"}");
        var frame = new byte[payload.Length + 2];
        frame[0] = 0x81;
        frame[1] = (byte)payload.Length;
        Buffer.BlockCopy(payload, 0, frame, 2, payload.Length);
        for (int i = clients.Count - 1; i >= 0; i--) {
            try { clients[i].GetStream().Write(frame, 0, frame.Length); }
            catch { clients[i].Close(); clients.RemoveAt(i); }
        }
        statusLabel.Text = type + " / Connected: " + clients.Count;
    }

    private void DetectGameScreen()
    {
        try {
            Rectangle screen = Screen.PrimaryScreen.Bounds;
            using (var image = new Bitmap(screen.Width, screen.Height, System.Drawing.Imaging.PixelFormat.Format24bppRgb))
            using (Graphics graphics = Graphics.FromImage(image)) {
                graphics.CopyFromScreen(screen.Left, screen.Top, 0, 0, screen.Size, CopyPixelOperation.SourceCopy);
                Rectangle resultArea = ScaleArea(screen, .24, .25, .76, .55);
                int yellow = CountPixels(image, resultArea, delegate(Color c) { return c.R > 180 && c.G > 115 && c.B < 105 && c.R > c.B * 1.8; }, 4);
                int red = CountPixels(image, resultArea, delegate(Color c) { return c.R > 175 && c.G < 105 && c.B < 115 && c.R > c.G * 1.8; }, 4);
                bool victoryShape = yellow > 180 && MatchesPattern(image, resultArea, delegate(Color c) { return c.R > 180 && c.G > 115 && c.B < 105 && c.R > c.B * 1.8; }, VictoryPattern);
                bool defeatShape = red > 180 && MatchesPattern(image, resultArea, delegate(Color c) { return c.R > 175 && c.G < 105 && c.B < 115 && c.R > c.G * 1.8; }, DefeatPattern);
                victoryFrames = victoryShape ? victoryFrames + 1 : 0;
                defeatFrames = defeatShape ? defeatFrames + 1 : 0;
                DateTime now = DateTime.UtcNow;
                if (victoryFrames >= 3 && (now - lastVictory).TotalSeconds > 15) { lastVictory = now; victoryFrames = 0; Broadcast("game.victory"); }
                if (defeatFrames >= 3 && (now - lastDefeat).TotalSeconds > 15) { lastDefeat = now; defeatFrames = 0; Broadcast("game.defeat"); }

                Rectangle ultArea = ScaleArea(screen, .455, .78, .545, .97);
                int ultGold = CountPixels(image, ultArea, delegate(Color c) { return c.R > 155 && c.G > 90 && c.B < 85 && c.R > c.B * 1.7; }, 2);
                if (ultGold > 85) ultReady = true;
                if (ultReady && ultGold < 24 && (now - lastUlt).TotalSeconds > 4) { ultReady = false; lastUlt = now; Broadcast("game.ult"); }
            }
        } catch { }
    }

    private static Rectangle ScaleArea(Rectangle screen, double left, double top, double right, double bottom)
    {
        return new Rectangle((int)(screen.Width * left), (int)(screen.Height * top), Math.Max(1, (int)(screen.Width * (right - left))), Math.Max(1, (int)(screen.Height * (bottom - top))));
    }

    private delegate bool PixelMatch(Color color);
    private static bool MatchesPattern(Bitmap image, Rectangle area, PixelMatch match, string expected)
    {
        const int columns = 52, rows = 18;
        int intersection = 0, union = 0;
        for (int row = 0; row < rows; row++) {
            for (int column = 0; column < columns; column++) {
                int left = area.Left + area.Width * column / columns, right = area.Left + area.Width * (column + 1) / columns;
                int top = area.Top + area.Height * row / rows, bottom = area.Top + area.Height * (row + 1) / rows;
                int matching = 0, sampled = 0;
                for (int y = top; y < bottom; y += 2)
                    for (int x = left; x < right; x += 2) { if (match(image.GetPixel(x, y))) matching++; sampled++; }
                bool actual = sampled > 0 && (double)matching / sampled > .12;
                bool reference = expected[row * columns + column] == '1';
                if (actual && reference) intersection++;
                if (actual || reference) union++;
            }
        }
        return union > 0 && (double)intersection / union >= .48;
    }

    private static int CountPixels(Bitmap image, Rectangle area, PixelMatch match, int step)
    {
        int count = 0;
        for (int y = area.Top; y < area.Bottom; y += step)
            for (int x = area.Left; x < area.Right; x += step)
                if (match(image.GetPixel(x, y))) count++;
        return count;
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
                    triggerKeyDown = true; BeginInvoke((MethodInvoker)delegate { Broadcast("overlay.trigger"); });
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
