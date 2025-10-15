<#
Usage:
  .\install-and-log.ps1 install path\to\app.apk
  .\install-and-log.ps1 capture  # starts capturing logcat to logcat.txt (Ctrl+C to stop)

This script helps install an APK to a connected device and capture logcat output for diagnosis.
Replace the package name below if your app package isn't com.stefan.meowspace.
#>
param(
    [Parameter(Mandatory=$true,Position=0)]
    [ValidateSet('install','capture')]
    [string]$Mode,
    [string]$ApkPath
)

$packageName = 'com.stefan.meowspace'

function Check-ADB {
    $out = & adb devices 2>&1
    if ($LASTEXITCODE -ne 0) {
        Write-Error "adb not found or not in PATH. Please install Android SDK Platform Tools and add adb to PATH."
        exit 1
    }
}

Check-ADB

if ($Mode -eq 'install') {
    if (-not $ApkPath) { Write-Error "install mode requires an APK path"; exit 1 }
    if (-not (Test-Path $ApkPath)) { Write-Error "APK not found: $ApkPath"; exit 1 }

    Write-Output "Connected devices:"; adb devices

    Write-Output "Uninstalling existing app (if any): $packageName"
    adb uninstall $packageName | Write-Output

    Write-Output "Installing APK: $ApkPath"
    adb install -r $ApkPath | Write-Output
    Write-Output "Install finished. Launch the app on your device and then run capture mode to collect logs (or run capture before launching the app)."
    exit 0
}

if ($Mode -eq 'capture') {
    Write-Output "Clearing existing logs..."
    adb logcat -c
    Write-Output "Starting logcat (errors only) -> logcat.txt. Reproduce the crash on the device. Press Ctrl+C to stop capture."
    adb logcat *:E > logcat.txt
}
