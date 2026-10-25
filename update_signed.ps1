Add-Type -AssemblyName "System.IO.Compression"
Add-Type -AssemblyName "System.IO.Compression.FileSystem"

$tempExtract = Join-Path $env:TEMP "AryPlusSignedExtract"
if (Test-Path $tempExtract) { Remove-Item $tempExtract -Recurse -Force }
New-Item -ItemType Directory -Path $tempExtract | Out-Null

$signedWgt = Join-Path (Get-Location).Path "AryPlusTV_signed.wgt"
[System.IO.Compression.ZipFile]::ExtractToDirectory($signedWgt, $tempExtract)

# Copy the updated files into the extracted folder
Copy-Item "index.html" -Destination $tempExtract -Force
Copy-Item "css\style.css" -Destination (Join-Path $tempExtract "css") -Force
Copy-Item "js\app.js" -Destination (Join-Path $tempExtract "js") -Force
Copy-Item "js\fallback_data.js" -Destination (Join-Path $tempExtract "js") -Force

# Re-zip
Remove-Item $signedWgt -Force
[System.IO.Compression.ZipFile]::CreateFromDirectory($tempExtract, $signedWgt)
Remove-Item $tempExtract -Recurse -Force

Write-Host "AryPlusTV_signed.wgt updated with full episodes support! Size: $((Get-Item $signedWgt).Length) bytes."

