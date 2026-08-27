$files = Get-ChildItem -Path 'lib\screens\admin' -Recurse -Filter '*.dart'
$files += Get-ChildItem -Path 'lib\screens\chat_screen.dart' -ErrorAction SilentlyContinue

foreach ($f in $files) {
    $c = Get-Content $f.FullName -Raw
    $original = $c
    
    # Replace Colors.white variations with Theme foregrounds
    $c = $c -replace 'Colors\.white54', 'Theme.of(context).appColors.foreground.withValues(alpha: 0.54)'
    $c = $c -replace 'Colors\.white70', 'Theme.of(context).appColors.foreground.withValues(alpha: 0.7)'
    $c = $c -replace 'Colors\.white38', 'Theme.of(context).appColors.foreground.withValues(alpha: 0.38)'
    $c = $c -replace 'Colors\.white12', 'Theme.of(context).appColors.foreground.withValues(alpha: 0.12)'
    $c = $c -replace 'Colors\.white24', 'Theme.of(context).appColors.foreground.withValues(alpha: 0.24)'
    $c = $c -replace 'Colors\.white', 'Theme.of(context).appColors.foreground'
    $c = $c -replace 'const Color\(0xFF94a3b8\)', 'Theme.of(context).appColors.foreground.withValues(alpha: 0.54)'
    
    if ($c -ne $original) {
        Set-Content $f.FullName $c -NoNewline
        Write-Host "Updated $($f.FullName)"
    }
}
