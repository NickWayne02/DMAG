import 'dart:io';

void main() {
  final files = [
    'lib/screens/admin/tabs/calendar_tab.dart',
    'lib/screens/admin/tabs/personnel_tab.dart',
    'lib/screens/admin/tabs/sites_tab.dart',
    'lib/screens/admin/tabs/reports_tab.dart',
    'lib/screens/admin/admin_editable_calendar_dialog.dart'
  ];

  for (final f in files) {
    final file = File(f);
    if (!file.existsSync()) continue;
    
    var content = file.readAsStringSync();
    
    final importStmt = f.contains('tabs') 
        ? "import '../../../theme/app_theme.dart';" 
        : "import '../../theme/app_theme.dart';";
    if (!content.contains('app_theme.dart')) {
      content = content.replaceFirst(
        "import 'package:flutter/material.dart';", 
        "import 'package:flutter/material.dart';\n\$importStmt"
      );
    }
    
    content = content.replaceAll('Colors.white70', 'Theme.of(context).appColors.foreground.withValues(alpha: 0.7)');
    content = content.replaceAll('Colors.white54', 'Theme.of(context).appColors.foreground.withValues(alpha: 0.54)');
    content = content.replaceAll('Colors.white38', 'Theme.of(context).appColors.foreground.withValues(alpha: 0.38)');
    content = content.replaceAll('Colors.white30', 'Theme.of(context).appColors.foreground.withValues(alpha: 0.30)');
    content = content.replaceAll('Colors.white24', 'Theme.of(context).appColors.foreground.withValues(alpha: 0.24)');
    content = content.replaceAll('Colors.white12', 'Theme.of(context).appColors.foreground.withValues(alpha: 0.12)');
    content = content.replaceAll('Colors.white', 'Theme.of(context).appColors.foreground');
    
    content = content.replaceAll('const Color(0xFF09090b)', 'Theme.of(context).cardColor');
    content = content.replaceAll('Color(0xFF09090b)', 'Theme.of(context).cardColor');
    content = content.replaceAll('Colors.black', 'Theme.of(context).cardColor');
    
    // Fix consts correctly
    content = content.replaceAll('const BorderSide(color: Theme', 'BorderSide(color: Theme');
    content = content.replaceAll('const Divider(color: Theme', 'Divider(color: Theme');
    content = content.replaceAll('const CircularProgressIndicator(color: Theme', 'CircularProgressIndicator(color: Theme');
    
    // Using RegExp properly
    content = content.replaceAllMapped(RegExp(r'const\s+(Icon\([^)]*Theme[^)]*\))'), (match) {
      return match.group(1)!;
    });

    file.writeAsStringSync(content);
    print('Fully fixed \$f');
  }
}
