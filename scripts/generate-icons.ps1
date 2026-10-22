Add-Type -AssemblyName System.Drawing

function Resize-Png {
  param(
    [Parameter(Mandatory = $true)][string]$SourcePath,
    [Parameter(Mandatory = $true)][int]$Size,
    [Parameter(Mandatory = $true)][string]$OutputPath
  )

  $source = [System.Drawing.Image]::FromFile($SourcePath)
  $bitmap = [System.Drawing.Bitmap]::new($Size, $Size)
  $graphics = [System.Drawing.Graphics]::FromImage($bitmap)

  try {
    $graphics.CompositingMode = [System.Drawing.Drawing2D.CompositingMode]::SourceCopy
    $graphics.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
    $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $graphics.DrawImage(
      $source,
      [System.Drawing.Rectangle]::new(0, 0, $Size, $Size),
      0,
      0,
      $source.Width,
      $source.Height,
      [System.Drawing.GraphicsUnit]::Pixel
    )
    $bitmap.Save($OutputPath, [System.Drawing.Imaging.ImageFormat]::Png)
  }
  finally {
    $graphics.Dispose()
    $bitmap.Dispose()
    $source.Dispose()
  }
}

$assetDirectory = Join-Path $PSScriptRoot '..\assets'
$publicDirectory = Join-Path $PSScriptRoot '..\public'
$source180 = Join-Path $assetDirectory 'hanger-icon-source-180.png'
$source512 = Join-Path $assetDirectory 'hanger-icon-source-512.png'

Copy-Item -LiteralPath $source180 -Destination (Join-Path $publicDirectory 'my-archive-icon-180.png') -Force
Resize-Png -SourcePath $source512 -Size 192 -OutputPath (Join-Path $publicDirectory 'my-archive-icon-192.png')
Copy-Item -LiteralPath $source512 -Destination (Join-Path $publicDirectory 'my-archive-icon-512.png') -Force
