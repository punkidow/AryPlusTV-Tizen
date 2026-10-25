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

$tempDir = Join-Path $env:TEMP "AryPlusTV_Build"
if (Test-Path $tempDir) { Remove-Item $tempDir -Recurse -Force }
New-Item -ItemType Directory -Path $tempDir | Out-Null

Copy-Item "config.xml", "index.html", "README.md" -Destination $tempDir
Copy-Item "css", "js", "icons" -Destination $tempDir -Recurse

$zipPath = Join-Path (Get-Location).Path $WgtName
[System.IO.Compression.ZipFile]::CreateFromDirectory($tempDir, $zipPath)
Remove-Item $tempDir -Recurse -Force

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

