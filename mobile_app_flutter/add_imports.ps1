$files = Get-ChildItem -Path 'lib\screens\admin' -Recurse -Filter '*.dart'
$files += Get-ChildItem -Path 'lib\screens\chat_screen.dart' -ErrorAction SilentlyContinue

foreach ($f in $files) {
    $c = Get-Content $f.FullName -Raw
    
    if ($c -match 'appColors' -and $c -notmatch 'app_theme\.dart') {
        # Determine the relative path to lib/theme/app_theme.dart
        # Count the number of directories deep the file is from 'lib'
        $relPath = $f.FullName.Substring((Resolve-Path "lib").Path.Length + 1)
        $depth = ($relPath -split '\\').Count - 1
        
        $up = "../" * $depth
        $importString = "import '${up}theme/app_theme.dart';"
        
        # Insert import after the last import statement
        $c = $c -replace '(?m)^(import .*;\r?\n)(?!import)', "`$1$importString`r`n"
        
        Set-Content $f.FullName $c -NoNewline
        Write-Host "Added app_theme import to $($f.FullName)"
    }
}
