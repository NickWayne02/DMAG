$files = Get-ChildItem -Path 'lib\screens\admin' -Recurse -Filter '*.dart'
foreach ($f in $files) {
    $c = Get-Content $f.FullName -Raw
    $original = $c
    $c = $c -replace 'const Color\(0xFF1E293B\)', 'Theme.of(context).cardColor'
    $c = $c -replace 'const Color\(0xFF0C0C0E\)', 'Theme.of(context).cardColor'
    $c = $c -replace 'const Color\(0xFF18181b\)', 'Theme.of(context).cardColor'
    $c = $c -replace 'const Color\(0xFF1E1E1E\)', 'Theme.of(context).cardColor'
    $c = $c -replace 'const Color\(0xFF09090b\)', 'Theme.of(context).cardColor'
    $c = $c -replace 'backgroundColor:\s*Colors\.black', 'backgroundColor: Theme.of(context).cardColor'
    
    if ($c -ne $original) {
        Set-Content $f.FullName $c -NoNewline
        Write-Host "Updated $($f.FullName)"
    }
}
