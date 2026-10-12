param(
  [string]$ThemesPath
)

$ErrorActionPreference = 'Stop'

if (-not (Test-Path $ThemesPath)) {
  throw "Missing themes.xml: $ThemesPath"
}

$content = @"
<?xml version="1.0" encoding="utf-8"?>
<resources xmlns:tools="http://schemas.android.com/tools">
    <style name="Theme.App.Main" parent="Theme.AppCompat.Light.NoActionBar">
        <item name="android:statusBarColor">@android:color/white</item>
        <item name="android:navigationBarColor">@android:color/white</item>
        <item name="android:windowLightStatusBar">true</item>
        <item name="android:windowDrawsSystemBarBackgrounds">true</item>
        <item name="android:windowBackground">@android:color/white</item>
    </style>

    <style name="Theme.App.SplashScreen" parent="Theme.SplashScreen.IconBackground">
        <item name="windowSplashScreenBackground">@color/cdv_splashscreen_background</item>
        <item name="windowSplashScreenAnimatedIcon">@drawable/ic_cdv_splashscreen_image</item>
        <item name="windowSplashScreenAnimationDuration">0</item>
        <item name="postSplashScreenTheme">@style/Theme.App.Main</item>
        <item name="android:windowOptOutEdgeToEdgeEnforcement" tools:targetApi="35">true</item>
        <item name="android:statusBarColor">@android:color/white</item>
        <item name="android:navigationBarColor">@android:color/white</item>
        <item name="android:windowLightStatusBar">true</item>
        <item name="android:windowDrawsSystemBarBackgrounds">true</item>
    </style>
</resources>
"@

Set-Content -Path $ThemesPath -Value $content -Encoding UTF8

Write-Host "Wrote Android themes to $ThemesPath"
