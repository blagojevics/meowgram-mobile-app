<#
Usage: .\check-apk-abis.ps1 -ApkPath path\to\app.apk
Lists native ABI folders contained in an APK (arm64-v8a, armeabi-v7a, x86, x86_64)
#>
param(
    [Parameter(Mandatory=$true)]
    [string]$ApkPath
)

if (-not (Test-Path $ApkPath)) {
    Write-Error "APK not found: $ApkPath"
    exit 1
}

Add-Type -AssemblyName System.IO.Compression.FileSystem
$zip = [System.IO.Compression.ZipFile]::OpenRead($ApkPath)
try {
    $libs = $zip.Entries | Where-Object { $_.FullName -like 'lib/*' } | Select-Object -ExpandProperty FullName
    if (-not $libs) {
        Write-Output "No native libs found in APK. It may be an AAB or pure JS bundle."
        exit 0
    }
    $abis = $libs | ForEach-Object { ($_ -split '/')[1] } | Sort-Object -Unique
    Write-Output "Found ABIs: $($abis -join ', ')"
    Write-Output "\nSample native lib entries (first 30):"
    $libs | Select-Object -First 30 | ForEach-Object { Write-Output "  $_" }
    if ($abis -contains 'x86' -or $abis -contains 'x86_64') {
        Write-Output "\nNOTE: Presence of only x86/x86_64 may indicate an emulator-only build."
    }
} finally {
    $zip.Dispose()
}
