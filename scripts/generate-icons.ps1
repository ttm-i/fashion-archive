Add-Type -AssemblyName System.Drawing

function New-FashionArchiveIcon {
  param(
    [Parameter(Mandatory = $true)][int]$Size,
    [Parameter(Mandatory = $true)][string]$OutputPath
  )

  $bitmap = [System.Drawing.Bitmap]::new($Size, $Size)
  $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
  $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
  $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
  $graphics.Clear([System.Drawing.ColorTranslator]::FromHtml('#f3eee7'))
  $scale = $Size / 512.0

  $graphics.ScaleTransform($scale, $scale)
  $pen = [System.Drawing.Pen]::new([System.Drawing.ColorTranslator]::FromHtml('#20283a'), 20)
  $pen.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
  $pen.EndCap = [System.Drawing.Drawing2D.LineCap]::Round
  $pen.LineJoin = [System.Drawing.Drawing2D.LineJoin]::Round

  $hook = [System.Drawing.Drawing2D.GraphicsPath]::new()
  $hook.AddBezier(226, 170, 226, 140, 250, 116, 280, 116)
  $hook.AddBezier(280, 116, 312, 116, 336, 141, 336, 173)
  $hook.AddBezier(336, 173, 336, 198, 322, 215, 300, 226)
  $hook.AddBezier(300, 226, 278, 237, 256, 248, 256, 270)
  $hook.AddLine(256, 270, 256, 292)
  $graphics.DrawPath($pen, $hook)

  $hanger = [System.Drawing.Drawing2D.GraphicsPath]::new()
  $hanger.AddLine(256, 292, 104, 380)
  $hanger.AddBezier(104, 380, 92, 387, 86, 398, 86, 411)
  $hanger.AddBezier(86, 428, 98, 440, 116, 440, 396, 440)
  $hanger.AddBezier(396, 440, 414, 440, 426, 428, 426, 411)
  $hanger.AddBezier(426, 411, 426, 398, 420, 387, 408, 380)
  $hanger.AddLine(408, 380, 256, 292)
  $graphics.DrawPath($pen, $hanger)

  $bitmap.Save($OutputPath, [System.Drawing.Imaging.ImageFormat]::Png)
  $hanger.Dispose()
  $hook.Dispose()
  $pen.Dispose()
  $graphics.Dispose()
  $bitmap.Dispose()
}

$publicDirectory = Join-Path $PSScriptRoot '..\public'
New-FashionArchiveIcon -Size 180 -OutputPath (Join-Path $publicDirectory 'apple-touch-icon.png')
New-FashionArchiveIcon -Size 192 -OutputPath (Join-Path $publicDirectory 'icon-192.png')
New-FashionArchiveIcon -Size 512 -OutputPath (Join-Path $publicDirectory 'icon-512.png')
