param(
  [string]$ConfigPath
)

$ErrorActionPreference = 'Stop'

if (-not (Test-Path $ConfigPath)) {
  throw "Missing config.xml: $ConfigPath"
}

$xml = Get-Content -Path $ConfigPath -Raw
$xml = [regex]::Replace(
  $xml,
  '<preference name="StatusBarOverlaysWebView" value="(true|false)" />',
  '<preference name="StatusBarOverlaysWebView" value="false" />'
)

if ($xml -notmatch 'StatusBarOverlaysWebView') {
  $xml = $xml.Replace(
    '</widget>',
    "    <preference name=`"StatusBarOverlaysWebView`" value=`"false`" />`r`n</widget>"
  )
}

$xml = [regex]::Replace(
  $xml,
  '<preference name="StatusBarBackgroundColor" value="#[^"]+" />',
  '<preference name="StatusBarBackgroundColor" value="#FFFFFF" />'
)

if ($xml -notmatch 'StatusBarBackgroundColor') {
  $xml = $xml.Replace(
    '</widget>',
    "    <preference name=`"StatusBarBackgroundColor`" value=`"#FFFFFF`" />`r`n</widget>"
  )
}

$xml = [regex]::Replace(
  $xml,
  '<preference name="Fullscreen" value="(true|false)" />',
  '<preference name="Fullscreen" value="true" />'
)

if ($xml -notmatch 'Fullscreen') {
  $xml = $xml.Replace(
    '</widget>',
    "    <preference name=`"Fullscreen`" value=`"true`" />`r`n</widget>"
  )
}

Set-Content -Path $ConfigPath -Value $xml -Encoding UTF8

Write-Host "Patched Cordova status bar preferences in $ConfigPath"
