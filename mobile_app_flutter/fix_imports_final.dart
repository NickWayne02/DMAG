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
    
    content = content.replaceAll('\$importStmt', importStmt);

    file.writeAsStringSync(content);
    print('Fixed literal \$importStmt in \$f');
  }
}
