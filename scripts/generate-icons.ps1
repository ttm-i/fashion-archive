Add-Type -AssemblyName System.Drawing

function New-FashionArchiveIcon {
  param(
    [Parameter(Mandatory = $true)][int]$Size,
    [Parameter(Mandatory = $true)][string]$OutputPath
  )

  $bitmap = [System.Drawing.Bitmap]::new($Size, $Size)
  $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
  $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
  $graphics.Clear([System.Drawing.ColorTranslator]::FromHtml('#f7f3ed'))
  $scale = $Size / 512.0

  $path = [System.Drawing.Drawing2D.GraphicsPath]::new([System.Drawing.Drawing2D.FillMode]::Alternate)
  $outer = [System.Drawing.PointF[]]@(
    [System.Drawing.PointF]::new(116 * $scale, 374 * $scale),
    [System.Drawing.PointF]::new(226 * $scale, 112 * $scale),
    [System.Drawing.PointF]::new(290 * $scale, 112 * $scale),
    [System.Drawing.PointF]::new(398 * $scale, 374 * $scale),
    [System.Drawing.PointF]::new(326 * $scale, 374 * $scale),
    [System.Drawing.PointF]::new(305 * $scale, 316 * $scale),
    [System.Drawing.PointF]::new(207 * $scale, 316 * $scale),
    [System.Drawing.PointF]::new(186 * $scale, 374 * $scale)
  )
  $counter = [System.Drawing.PointF[]]@(
    [System.Drawing.PointF]::new(228 * $scale, 258 * $scale),
    [System.Drawing.PointF]::new(285 * $scale, 258 * $scale),
    [System.Drawing.PointF]::new(257 * $scale, 176 * $scale)
  )
  $path.AddPolygon($outer)
  $path.AddPolygon($counter)
  $inkBrush = [System.Drawing.SolidBrush]::new([System.Drawing.ColorTranslator]::FromHtml('#171614'))
  $graphics.FillPath($inkBrush, $path)

  $accentBrush = [System.Drawing.SolidBrush]::new([System.Drawing.ColorTranslator]::FromHtml('#d96b4f'))
  $graphics.FillRectangle($accentBrush, 344 * $scale, 118 * $scale, 54 * $scale, 54 * $scale)

  $bitmap.Save($OutputPath, [System.Drawing.Imaging.ImageFormat]::Png)
  $accentBrush.Dispose()
  $inkBrush.Dispose()
  $path.Dispose()
  $graphics.Dispose()
  $bitmap.Dispose()
}

$publicDirectory = Join-Path $PSScriptRoot '..\public'
New-FashionArchiveIcon -Size 180 -OutputPath (Join-Path $publicDirectory 'apple-touch-icon.png')
New-FashionArchiveIcon -Size 192 -OutputPath (Join-Path $publicDirectory 'icon-192.png')
New-FashionArchiveIcon -Size 512 -OutputPath (Join-Path $publicDirectory 'icon-512.png')
