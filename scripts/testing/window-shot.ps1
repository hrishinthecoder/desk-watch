# Screenshot of ONE window of a TEST COPY, title bar included (Windows' PrintWindow: works even when other windows
# cover it; nothing else on the screen is captured). For before/after pictures of the title bar and scrollbars.
#   powershell -NoProfile -File scripts/testing/window-shot.ps1 -ProcessId <test copy main PID> -Out <file.png>
param([Parameter(Mandatory)][int]$ProcessId, [Parameter(Mandatory)][string]$Out, [string]$Title = 'Desk Watch')
Add-Type -AssemblyName System.Drawing
Add-Type @"
using System; using System.Runtime.InteropServices; using System.Text;
public static class W {
  public delegate bool EnumProc(IntPtr h, IntPtr l);
  [DllImport("user32.dll")] public static extern bool EnumWindows(EnumProc f, IntPtr l);
  [DllImport("user32.dll")] public static extern int GetWindowThreadProcessId(IntPtr h, out int p);
  [DllImport("user32.dll", CharSet = CharSet.Unicode)] public static extern int GetWindowText(IntPtr h, StringBuilder s, int n);
  [DllImport("user32.dll")] public static extern bool IsWindowVisible(IntPtr h);
  [DllImport("user32.dll")] public static extern bool GetWindowRect(IntPtr h, out RECT r);
  [DllImport("user32.dll")] public static extern bool PrintWindow(IntPtr h, IntPtr dc, uint flags);
  [DllImport("user32.dll")] public static extern bool SetProcessDPIAware();
  [DllImport("dwmapi.dll")] public static extern int DwmGetWindowAttribute(IntPtr h, int a, out RECT r, int n);
  [StructLayout(LayoutKind.Sequential)] public struct RECT { public int Left, Top, Right, Bottom; }
}
"@
[void][W]::SetProcessDPIAware() # real pixels (the screen is scaled, e.g. 150%)
$found = [IntPtr]::Zero
[W]::EnumWindows({ param($h, $l)
  $p = 0; [void][W]::GetWindowThreadProcessId($h, [ref]$p)
  if ($p -eq $ProcessId -and [W]::IsWindowVisible($h)) {
    $s = New-Object System.Text.StringBuilder 256; [void][W]::GetWindowText($h, $s, 256)
    if ($s.ToString() -eq $Title) { $script:found = $h; return $false }
  }
  $true }, [IntPtr]::Zero) | Out-Null
if ($found -eq [IntPtr]::Zero) { Write-Error "No visible '$Title' window for process $ProcessId"; exit 1 }
$r = New-Object W+RECT; [void][W]::GetWindowRect($found, [ref]$r)
$bmp = New-Object System.Drawing.Bitmap ($r.Right - $r.Left), ($r.Bottom - $r.Top)
$g = [System.Drawing.Graphics]::FromImage($bmp); $dc = $g.GetHdc()
[void][W]::PrintWindow($found, $dc, 2) # 2 = PW_RENDERFULLCONTENT (the web page too)
$g.ReleaseHdc($dc); $g.Dispose()
# Crop to the visible window (DWMWA_EXTENDED_FRAME_BOUNDS = 9): without Windows' invisible resize border.
$v = New-Object W+RECT; [void][W]::DwmGetWindowAttribute($found, 9, [ref]$v, 16)
$crop = New-Object System.Drawing.Rectangle ($v.Left - $r.Left), ($v.Top - $r.Top), ($v.Right - $v.Left), ($v.Bottom - $v.Top)
$out2 = $bmp.Clone($crop, $bmp.PixelFormat); $bmp.Dispose()
$out2.Save($Out, [System.Drawing.Imaging.ImageFormat]::Png); $out2.Dispose()
"saved $Out ($($crop.Width) x $($crop.Height))"
