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
  $pen = [System.Drawing.Pen]::new([System.Drawing.ColorTranslator]::FromHtml('#20283a'), 24)
  $pen.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
  $pen.EndCap = [System.Drawing.Drawing2D.LineCap]::Round
  $pen.LineJoin = [System.Drawing.Drawing2D.LineJoin]::Round

  $hook = [System.Drawing.Drawing2D.GraphicsPath]::new()
  $hook.AddBezier(210, 156, 210, 114, 244, 82, 286, 82)
  $hook.AddBezier(286, 82, 330, 82, 364, 116, 364, 160)
  $hook.AddBezier(364, 160, 364, 195, 345, 220, 314, 235)
  $hook.AddBezier(314, 235, 280, 252, 256, 273, 256, 289)
  $hook.AddLine(256, 289, 256, 306)
  $graphics.DrawPath($pen, $hook)

  $hanger = [System.Drawing.Drawing2D.GraphicsPath]::new()
  $hanger.AddLine(256, 306, 110, 390)
  $hanger.AddBezier(110, 390, 98, 397, 92, 408, 92, 421)
  $hanger.AddBezier(92, 435, 103, 444, 118, 444, 394, 444)
  $hanger.AddBezier(394, 444, 409, 444, 420, 435, 420, 421)
  $hanger.AddBezier(420, 421, 420, 408, 414, 397, 402, 390)
  $hanger.AddLine(402, 390, 256, 306)
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
