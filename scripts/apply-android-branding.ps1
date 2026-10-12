param(
  [string]$SourceImage,
  [string]$ResRoot
)

$ErrorActionPreference = 'Stop'

Add-Type -AssemblyName System.Drawing

if (-not (Test-Path $SourceImage)) {
  throw "Missing source image: $SourceImage"
}

if (-not (Test-Path $ResRoot)) {
  throw "Missing Android res directory: $ResRoot"
}

$sizes = @{
  'mipmap-ldpi\ic_launcher.png' = 36
  'mipmap-mdpi\ic_launcher.png' = 48
  'mipmap-hdpi\ic_launcher.png' = 72
  'mipmap-xhdpi\ic_launcher.png' = 96
  'mipmap-xxhdpi\ic_launcher.png' = 144
  'mipmap-xxxhdpi\ic_launcher.png' = 192
  'mipmap-ldpi-v26\ic_launcher_foreground.png' = 108
  'mipmap-mdpi-v26\ic_launcher_foreground.png' = 108
  'mipmap-hdpi-v26\ic_launcher_foreground.png' = 162
  'mipmap-xhdpi-v26\ic_launcher_foreground.png' = 216
  'mipmap-xxhdpi-v26\ic_launcher_foreground.png' = 324
  'mipmap-xxxhdpi-v26\ic_launcher_foreground.png' = 432
  'mipmap-mdpi-v26\ic_launcher_monochrome.png' = 108
  'mipmap-hdpi-v26\ic_launcher_monochrome.png' = 162
  'mipmap-xhdpi-v26\ic_launcher_monochrome.png' = 216
  'mipmap-xxhdpi-v26\ic_launcher_monochrome.png' = 324
  'mipmap-xxxhdpi-v26\ic_launcher_monochrome.png' = 432
}

$backgroundTargets = @(
  'mipmap-mdpi-v26\ic_launcher_background.png',
  'mipmap-hdpi-v26\ic_launcher_background.png',
  'mipmap-xhdpi-v26\ic_launcher_background.png',
  'mipmap-xxhdpi-v26\ic_launcher_background.png',
  'mipmap-xxxhdpi-v26\ic_launcher_background.png'
)

$sourceBitmap = [System.Drawing.Image]::FromFile($SourceImage)

function Save-FittedSquareImage([System.Drawing.Image]$image, [int]$size, [string]$destination, [double]$scale) {
  $bitmap = New-Object System.Drawing.Bitmap $size, $size
  $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
  $graphics.Clear([System.Drawing.Color]::Transparent)
  $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
  $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
  $graphics.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
  $targetSize = [int]([Math]::Round($size * $scale))
  $targetX = [int](($size - $targetSize) / 2)
  $targetY = [int](($size - $targetSize) / 2)
  $graphics.DrawImage($image, $targetX, $targetY, $targetSize, $targetSize)
  $bitmap.Save($destination, [System.Drawing.Imaging.ImageFormat]::Png)
  $graphics.Dispose()
  $bitmap.Dispose()
}

foreach ($entry in $sizes.GetEnumerator()) {
  $targetPath = Join-Path $ResRoot $entry.Key
  $targetDir = Split-Path $targetPath -Parent
  if (-not (Test-Path $targetDir)) {
    New-Item -ItemType Directory -Path $targetDir -Force | Out-Null
  }
  $scale = if ($entry.Key -like '*foreground*' -or $entry.Key -like '*monochrome*') { 0.42 } else { 0.54 }
  Save-FittedSquareImage -image $sourceBitmap -size $entry.Value -destination $targetPath -scale $scale
}

foreach ($relativePath in $backgroundTargets) {
  $targetPath = Join-Path $ResRoot $relativePath
  $bitmap = New-Object System.Drawing.Bitmap 32, 32
  $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
  $graphics.Clear([System.Drawing.Color]::White)
  $bitmap.Save($targetPath, [System.Drawing.Imaging.ImageFormat]::Png)
  $graphics.Dispose()
  $bitmap.Dispose()
}

$legacySplashTarget = Join-Path $ResRoot 'drawable\ic_cdv_splashscreen.png'
if (Test-Path $legacySplashTarget) {
  Remove-Item $legacySplashTarget -Force
}

$splashTarget = Join-Path $ResRoot 'drawable\ic_cdv_splashscreen_image.png'
Save-FittedSquareImage -image $sourceBitmap -size 320 -destination $splashTarget -scale 0.72

$splashDrawablePath = Join-Path $ResRoot 'drawable\ic_cdv_splashscreen.xml'
$splashDrawableContent = @"
<?xml version="1.0" encoding="utf-8"?>
<layer-list xmlns:android="http://schemas.android.com/apk/res/android">
    <item android:drawable="@android:color/white" />
    <item>
        <bitmap
            android:antialias="true"
            android:gravity="center"
            android:src="@drawable/ic_cdv_splashscreen_image" />
    </item>
</layer-list>
"@
Set-Content -Path $splashDrawablePath -Value $splashDrawableContent -Encoding UTF8

$themesPath = Join-Path $ResRoot 'values\themes.xml'
if (Test-Path $themesPath) {
  [xml]$themesDoc = Get-Content $themesPath -Raw
  $styleNode = $themesDoc.resources.style | Where-Object { $_.name -eq 'Theme.App.SplashScreen' } | Select-Object -First 1

  if ($styleNode) {
    $desiredItems = [ordered]@{
      'windowSplashScreenAnimatedIcon' = '@drawable/ic_cdv_splashscreen_image'
      'windowSplashScreenAnimationDuration' = '0'
      'postSplashScreenTheme' = '@style/Theme.AppCompat.Light.NoActionBar'
      'android:windowOptOutEdgeToEdgeEnforcement' = 'true'
      'android:statusBarColor' = '@android:color/white'
      'android:navigationBarColor' = '@android:color/white'
      'android:windowLightStatusBar' = 'true'
      'android:windowDrawsSystemBarBackgrounds' = 'true'
    }

    foreach ($itemName in $desiredItems.Keys) {
      $itemNode = $styleNode.item | Where-Object { $_.name -eq $itemName } | Select-Object -First 1
      if (-not $itemNode) {
        $itemNode = $themesDoc.CreateElement('item')
        $nameAttr = $themesDoc.CreateAttribute('name')
        $nameAttr.Value = $itemName
        [void]$itemNode.Attributes.Append($nameAttr)
        [void]$styleNode.AppendChild($itemNode)
      }

      if ($itemName -eq 'android:windowOptOutEdgeToEdgeEnforcement') {
        $toolsAttr = $itemNode.Attributes['tools:targetApi']
        if (-not $toolsAttr) {
          $toolsAttr = $themesDoc.CreateAttribute('tools', 'targetApi', 'http://schemas.android.com/tools')
          [void]$itemNode.Attributes.Append($toolsAttr)
        }
        $toolsAttr.Value = '35'
      }

      $itemNode.InnerText = $desiredItems[$itemName]
    }

    $settings = New-Object System.Xml.XmlWriterSettings
    $settings.Encoding = [System.Text.UTF8Encoding]::new($false)
    $settings.Indent = $true
    $writer = [System.Xml.XmlWriter]::Create($themesPath, $settings)
    $themesDoc.Save($writer)
    $writer.Dispose()
  }
}

$sourceBitmap.Dispose()

Write-Host "Android branding assets updated from $SourceImage"
