$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

Add-Type -AssemblyName System.Drawing

function New-HexColor {
  param(
    [Parameter(Mandatory = $true)]
    [string] $Hex,
    [int] $Alpha = 255
  )

  $value = $Hex.TrimStart("#")
  if ($value.Length -ne 6) {
    throw "Expected a 6-digit hex color, received '$Hex'."
  }

  return [System.Drawing.Color]::FromArgb(
    $Alpha,
    [Convert]::ToInt32($value.Substring(0, 2), 16),
    [Convert]::ToInt32($value.Substring(2, 2), 16),
    [Convert]::ToInt32($value.Substring(4, 2), 16)
  )
}

function New-Bitmap {
  param(
    [Parameter(Mandatory = $true)]
    [int] $Size
  )

  return New-Object System.Drawing.Bitmap($Size, $Size, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
}

function Set-GraphicsQuality {
  param(
    [Parameter(Mandatory = $true)]
    [System.Drawing.Graphics] $Graphics
  )

  $Graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
  $Graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  $Graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
  $Graphics.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
  $Graphics.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAliasGridFit
}

function Get-TextPath {
  param(
    [Parameter(Mandatory = $true)]
    [string] $Text,
    [Parameter(Mandatory = $true)]
    [int] $CanvasSize,
    [Parameter(Mandatory = $true)]
    [double] $TargetWidth,
    [Parameter(Mandatory = $true)]
    [double] $TargetHeight
  )

  $family = New-Object System.Drawing.FontFamily("Segoe UI")
  $format = New-Object System.Drawing.StringFormat([System.Drawing.StringFormat]::GenericTypographic)
  $path = New-Object System.Drawing.Drawing2D.GraphicsPath
  $path.AddString(
    $Text,
    $family,
    [int] [System.Drawing.FontStyle]::Bold,
    100,
    [System.Drawing.PointF]::new(0, 0),
    $format
  )

  $bounds = $path.GetBounds()
  $scale = [Math]::Min($TargetWidth / $bounds.Width, $TargetHeight / $bounds.Height)

  $scaleMatrix = New-Object System.Drawing.Drawing2D.Matrix
  $scaleMatrix.Scale([single] $scale, [single] $scale)
  $path.Transform($scaleMatrix)

  $scaledBounds = $path.GetBounds()
  $translateX = ($CanvasSize / 2.0) - ($scaledBounds.Left + ($scaledBounds.Width / 2.0))
  $translateY = ($CanvasSize / 2.0) - ($scaledBounds.Top + ($scaledBounds.Height / 2.0))

  $translateMatrix = New-Object System.Drawing.Drawing2D.Matrix
  $translateMatrix.Translate([single] $translateX, [single] $translateY)
  $path.Transform($translateMatrix)

  $scaleMatrix.Dispose()
  $translateMatrix.Dispose()
  $format.Dispose()
  $family.Dispose()

  return $path
}

function Save-Png {
  param(
    [Parameter(Mandatory = $true)]
    [System.Drawing.Bitmap] $Bitmap,
    [Parameter(Mandatory = $true)]
    [string] $Path
  )

  $directory = Split-Path -Parent $Path
  if (-not (Test-Path $directory)) {
    New-Item -ItemType Directory -Path $directory -Force | Out-Null
  }

  $Bitmap.Save($Path, [System.Drawing.Imaging.ImageFormat]::Png)
}

function Save-IcoFromBitmap {
  param(
    [Parameter(Mandatory = $true)]
    [System.Drawing.Bitmap] $Bitmap,
    [Parameter(Mandatory = $true)]
    [string] $Path
  )

  $pngStream = New-Object System.IO.MemoryStream
  $Bitmap.Save($pngStream, [System.Drawing.Imaging.ImageFormat]::Png)
  $pngBytes = $pngStream.ToArray()
  $pngStream.Dispose()

  $directory = Split-Path -Parent $Path
  if (-not (Test-Path $directory)) {
    New-Item -ItemType Directory -Path $directory -Force | Out-Null
  }

  $fileStream = [System.IO.File]::Open($Path, [System.IO.FileMode]::Create, [System.IO.FileAccess]::Write)
  $writer = New-Object System.IO.BinaryWriter($fileStream)

  try {
    $writer.Write([UInt16] 0)
    $writer.Write([UInt16] 1)
    $writer.Write([UInt16] 1)
    $writer.Write([byte] $Bitmap.Width)
    $writer.Write([byte] $Bitmap.Height)
    $writer.Write([byte] 0)
    $writer.Write([byte] 0)
    $writer.Write([UInt16] 1)
    $writer.Write([UInt16] 32)
    $writer.Write([UInt32] $pngBytes.Length)
    $writer.Write([UInt32] 22)
    $writer.Write($pngBytes)
  }
  finally {
    $writer.Dispose()
    $fileStream.Dispose()
  }
}

function Draw-Icon {
  param(
    [Parameter(Mandatory = $true)]
    [int] $Size,
    [Parameter(Mandatory = $true)]
    [string] $OutputPath,
    [Parameter(Mandatory = $true)]
    [ValidateSet("circle", "square")]
    [string] $Shape
  )

  $blue = New-HexColor "#0F172A"
  $white = New-HexColor "#F8FAFC"
  $bitmap = New-Bitmap -Size $Size
  $graphics = [System.Drawing.Graphics]::FromImage($bitmap)

  try {
    Set-GraphicsQuality -Graphics $graphics
    $graphics.Clear([System.Drawing.Color]::Transparent)

    if ($Shape -eq "circle") {
      $margin = [Math]::Round($Size * 0.07)
      $diameter = $Size - ($margin * 2)
      $graphics.FillEllipse((New-Object System.Drawing.SolidBrush($blue)), $margin, $margin, $diameter, $diameter)
      $textPath = Get-TextPath -Text "SF" -CanvasSize $Size -TargetWidth ($Size * 0.50) -TargetHeight ($Size * 0.29)
    }
    else {
      $graphics.FillRectangle((New-Object System.Drawing.SolidBrush($blue)), 0, 0, $Size, $Size)
      $textPath = Get-TextPath -Text "SF" -CanvasSize $Size -TargetWidth ($Size * 0.54) -TargetHeight ($Size * 0.32)
    }

    $textBrush = New-Object System.Drawing.SolidBrush($white)
    $graphics.FillPath($textBrush, $textPath)

    $textBrush.Dispose()
    $textPath.Dispose()
    Save-Png -Bitmap $bitmap -Path $OutputPath
  }
  finally {
    $graphics.Dispose()
    $bitmap.Dispose()
  }
}

function Draw-Favicon {
  param(
    [Parameter(Mandatory = $true)]
    [string] $OutputPath
  )

  $blue = New-HexColor "#0F172A"
  $white = New-HexColor "#F8FAFC"
  $bitmap = New-Bitmap -Size 64
  $graphics = [System.Drawing.Graphics]::FromImage($bitmap)

  try {
    Set-GraphicsQuality -Graphics $graphics
    $graphics.Clear([System.Drawing.Color]::Transparent)
    $graphics.FillEllipse((New-Object System.Drawing.SolidBrush($blue)), 4, 4, 56, 56)

    $textPath = Get-TextPath -Text "SF" -CanvasSize 64 -TargetWidth 31 -TargetHeight 18
    $textBrush = New-Object System.Drawing.SolidBrush($white)
    $graphics.FillPath($textBrush, $textPath)

    $textBrush.Dispose()
    $textPath.Dispose()
    Save-IcoFromBitmap -Bitmap $bitmap -Path $OutputPath
  }
  finally {
    $graphics.Dispose()
    $bitmap.Dispose()
  }
}

$repoRoot = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)

Draw-Favicon -OutputPath (Join-Path $repoRoot "app\\favicon.ico")
Draw-Icon -Size 512 -Shape "circle" -OutputPath (Join-Path $repoRoot "app\\icon.png")
Draw-Icon -Size 180 -Shape "square" -OutputPath (Join-Path $repoRoot "app\\apple-icon.png")
Draw-Icon -Size 192 -Shape "square" -OutputPath (Join-Path $repoRoot "public\\icons\\icon-192.png")
Draw-Icon -Size 512 -Shape "square" -OutputPath (Join-Path $repoRoot "public\\icons\\icon-512.png")
Draw-Icon -Size 512 -Shape "square" -OutputPath (Join-Path $repoRoot "public\\icons\\icon-512-maskable.png")

Write-Host "Generated icon set."
