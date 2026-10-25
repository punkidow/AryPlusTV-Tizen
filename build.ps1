param (
    [string]$TvIp = ""
)

Add-Type -AssemblyName "System.IO.Compression.FileSystem"

$Sdb = "C:\Users\Irfan\.tizen-extension-platform\server\sdktools\data\tools\sdb.exe"
$WgtName = "AryPlusTV.wgt"

Write-Host "=========================================="
Write-Host "       ARY Plus TV - Tizen Build          "
Write-Host "=========================================="

if (Test-Path $WgtName) {
    Remove-Item $WgtName -Force
}

Write-Host "Packaging widget: $WgtName..."

node package_wgt.js

$zipPath = Join-Path (Get-Location).Path $WgtName
$fileSize = (Get-Item $WgtName).Length
Write-Host "SUCCESS: Package created -> $WgtName ($fileSize bytes)"

Write-Host "`nChecking connected devices with SDB..."
if ($TvIp -ne "") {
    Write-Host "Connecting to TV at $TvIp:26101..."
    & $Sdb connect ($TvIp + ":26101")
}

& $Sdb devices

Write-Host "=========================================="
Write-Host "Ready for installation to Samsung Q60A!"
Write-Host "Install command:"
Write-Host "$Sdb install $zipPath"
Write-Host "Launch command:"
Write-Host "$Sdb shell 0 was_execute tL8G1A0X4A.AryPlusTV"
Write-Host "=========================================="

