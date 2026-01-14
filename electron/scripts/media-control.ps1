
# media-control.ps1
# Interface with Windows GlobalSystemMediaTransportControlsSessionManager
# Returns JSON with media info or executes commands.

Param(
    [string]$Command = "status"
)

$ErrorActionPreference = "SilentlyContinue"

# Helper to load WinRT types
Function Load-WinRT {
    # Check if type exists, if not load
    try {
        [Windows.Media.Control.GlobalSystemMediaTransportControlsSessionManager, Windows.Media, ContentType=WindowsRuntime] | Out-Null
    } catch {
        # Load necessary assemblies for WinRT interop in PS 5.1
        [System.Reflection.Assembly]::LoadWithPartialName("System.Runtime.WindowsRuntime") | Out-Null
        $path = "C:\Windows\System32\Windows.Media.dll"
        if (Test-Path $path) {
            [System.Reflection.Assembly]::LoadFrom($path) | Out-Null
        }
    }
}

# Helper to await async WinRT operations
Function Await($WinRtTask, $ResultType) {
    $asTaskGeneric = ([System.WindowsRuntimeSystemExtensions].GetMethods() | ? { $_.Name -eq 'AsTask' -and $_.GetParameters().Count -eq 1 -and $_.GetParameters()[0].ParameterType.Name -eq 'IAsyncOperation`1' })[0]
    $asTask = $asTaskGeneric.MakeGenericMethod($ResultType)
    $netTask = $asTask.Invoke($null, @($WinRtTask))
    $netTask.Wait(-1) | Out-Null
    return $netTask.Result
}

Function Await-Action($WinRtTask) {
    $asTask = [System.WindowsRuntimeSystemExtensions]::AsTask($WinRtTask)
    $asTask.Wait(-1) | Out-Null
}

Load-WinRT

# Get Manager
$Manager = [Windows.Media.Control.GlobalSystemMediaTransportControlsSessionManager]::RequestAsync().GetAwaiter().GetResult()
if (-not $Manager) {
    Write-Output '{"error": "NoManager"}'
    exit
}

# Get Current Session
$Session = $Manager.GetCurrentSession()
if (-not $Session) {
    Write-Output '{"status": "idle"}'
    exit
}

# Handle Commands
if ($Command -ne "status") {
    switch ($Command) {
        "playpause" { Await-Action($Session.TryTogglePlayPauseAsync()) }
        "next"      { Await-Action($Session.TrySkipNextAsync()) }
        "prev"      { Await-Action($Session.TrySkipPreviousAsync()) }
    }
    # Return new status after weak delay
    Start-Sleep -Milliseconds 100
}

# Get Info
$Info = Await ($Session.TryGetMediaPropertiesAsync()) ([Windows.Media.Control.GlobalSystemMediaTransportControlsSessionMediaProperties])
$Timeline = $Session.GetTimelineProperties()
$Status = $Session.GetPlaybackInfo().PlaybackStatus # Open, Closed, Changing, Stopped, Playing, Paused

# Thumbnail to Base64
$ThumbnailB64 = ""
if ($Info.Thumbnail) {
    try {
        $StreamRef = $Info.Thumbnail
        $Stream = Await ($StreamRef.OpenReadAsync()) ([Windows.Storage.Streams.IRandomAccessStreamWithContentType])
        
        $Reader = [Windows.Storage.Streams.DataReader]::new($Stream)
        Await-Action ($Reader.LoadAsync($Stream.Size))
        
        $Bytes = New-Object byte[] $Stream.Size
        $Reader.ReadBytes($Bytes)
        $ThumbnailB64 = [Convert]::ToBase64String($Bytes)
    } catch {
        # Ignore thumbnail errors
    }
}

$Result = @{
    status = "$Status"
    title = $Info.Title
    artist = $Info.Artist
    album = $Info.AlbumTitle
    thumbnail = $ThumbnailB64
}

# Convert to JSON
$Result | ConvertTo-Json -Compress
