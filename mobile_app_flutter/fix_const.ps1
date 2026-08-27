$files = Get-ChildItem -Path 'lib\screens\admin' -Recurse -Filter '*.dart'
$files += Get-ChildItem -Path 'lib\screens\chat_screen.dart' -ErrorAction SilentlyContinue

foreach ($f in $files) {
    $c = Get-Content $f.FullName -Raw
    $original = $c
    
    # We will use regex to find 'const WidgetName(' that are on the same line or before 'Theme.of(context)'
    # Since dart format often keeps small widgets on one line, this works for 99% of cases
    $lines = $c -split "`r`n"
    for ($i = 0; $i -lt $lines.Count; $i++) {
        if ($lines[$i] -match "Theme\.of\(context\)") {
            $lines[$i] = $lines[$i] -replace "const\s+(TextStyle|Icon|SizedBox|Row|Column|Padding|Center|CircularProgressIndicator|BorderSide|Divider|Container)\(", "`$1("
        }
    }
    $c = $lines -join "`r`n"
    
    if ($c -ne $original) {
        Set-Content $f.FullName $c -NoNewline
        Write-Host "Fixed const in $($f.FullName)"
    }
}
