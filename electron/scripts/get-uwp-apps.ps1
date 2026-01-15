param (
    [string]$IconFolder
)

# Debug outputs
# Write-Host "Starting UWP Scan..."

if (-not (Test-Path $IconFolder)) {
    New-Item -ItemType Directory -Force -Path $IconFolder | Out-Null
}

$apps = @()

# Get all packages (including those on other drives)
$packages = Get-AppxPackage

foreach ($pkg in $packages) {
    if ($pkg.IsFramework -or $pkg.IsResourcePackage -or $pkg.IsStub) { continue }
    
    $installPath = $pkg.InstallLocation
    if (-not $installPath -or -not (Test-Path $installPath)) { continue }

    $manifestPath = Join-Path $installPath "AppxManifest.xml"
    if (-not (Test-Path $manifestPath)) { continue }

    try {
        # Parse XML (Use XmlDocument for speed and safety vs [xml] casting)
        $xml = New-Object System.Xml.XmlDocument
        $xml.Load($manifestPath)

        # Namespace manager for default namespace (x)
        $ns = New-Object System.Xml.XmlNamespaceManager($xml.NameTable)
        $ns.AddNamespace("x", "http://schemas.microsoft.com/appx/manifest/foundation/windows10")
        $ns.AddNamespace("uap", "http://schemas.microsoft.com/appx/manifest/uap/windows10")
        
        # Find Applications
        # Standard UWP Apps are in <Applications><Application>
        $appNodes = $xml.SelectNodes("//x:Applications/x:Application", $ns)

        foreach ($node in $appNodes) {
            $appId = $node.Attributes["Id"].Value
            
            # Display Name can be a resource reference "ms-resource:..."
            # For now, we fallback to Package Name if it's a resource, 
            # OR we try to resolve it (hard in pure PS without WinRT).
            # But VisualElements usually has a DisplayName too.
            
            # Detailed visual elements
            $visuals = $node.SelectSingleNode("uap:VisualElements", $ns)
            if (-not $visuals) { 
                # Fallback for older apps
                $visuals = $node.SelectSingleNode("x:VisualElements", $ns)
            }
            
            if ($visuals) {
                $displayName = $visuals.Attributes["DisplayName"].Value
                $logoRel = $visuals.Attributes["Square150x150Logo"].Value
                if (-not $logoRel) { $logoRel = $visuals.Attributes["Square44x44Logo"].Value }
                if (-not $logoRel) { $logoRel = $visuals.Attributes["Logo"].Value }
            } else {
                $displayName = $pkg.Name
                $logoRel = ""
            }

            # Handle Resource Names strings
            if ($displayName -match "^ms-resource:") {
                # Fallback: Use package name or try to be smart.
                # Minecraft usually has hardcoded name in English locale, but let's see.
                # Simplest fallback:
                $displayName = $pkg.Name 
            }

            # AUMID
            $aumid = "$($pkg.PackageFamilyName)!$appId"

            # Icon Resolution
            $topIconPath = ""
            if ($logoRel) {
                $basePath = Join-Path $installPath $logoRel
                
                # Try exact match
                if (Test-Path $basePath) {
                    $topIconPath = $basePath
                } else {
                    # Try scaling patterns
                    # image.png -> image.scale-100.png, image.scale-200.png, image.targetsize-XXX.png
                    $dir = Split-Path $basePath
                    $nameNoExt = [System.IO.Path]::GetFileNameWithoutExtension($basePath)
                    $ext = [System.IO.Path]::GetExtension($basePath)
                    
                    # Common scales
                    $candidates = @(
                        "$nameNoExt.scale-100$ext",
                        "$nameNoExt.scale-125$ext",
                        "$nameNoExt.scale-150$ext",
                        "$nameNoExt.scale-200$ext",
                        "$nameNoExt.scale-400$ext",
                        "targetsize-256$ext", # generic check pattern
                        "unplated.targetsize-256$ext"
                    )

                    foreach ($c in $candidates) {
                        $p = Join-Path $dir $c
                        if (Test-Path $p) {
                            $topIconPath = $p
                            break
                        }
                    }
                    
                    # Fuzzy find if still null
                    if (-not $topIconPath -and (Test-Path $dir)) {
                        $fuzzy = Get-ChildItem -Path $dir -Filter "$nameNoExt*scale*$ext" | Select-Object -First 1
                         if ($fuzzy) { $topIconPath = $fuzzy.FullName }
                    }
                }
            }

            # Copy icon to nice folder
            $finalIcon = ""
            if ($topIconPath) {
                $safeName = $displayName -replace '[\\/:*?"<>|]', '_'
                $dest = Join-Path $IconFolder "$safeName.png" # Assuming png for now, usually is
                try {
                    Copy-Item -Path $topIconPath -Destination $dest -Force
                    $finalIcon = $dest
                } catch {}
            }

            $apps += [PSCustomObject]@{
                name = $displayName
                path = "shell:AppsFolder\$aumid"
                icon = $finalIcon
                isUwp = $true
            }
        }
    } catch {
        # Write-Host "Error parsing $($pkg.Name): $_"
    }
}

$apps | ConvertTo-Json -Depth 2 -Compress
