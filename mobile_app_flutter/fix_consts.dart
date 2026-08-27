import 'dart:io';

void main() {
  final files = [
    'lib/screens/admin/tabs/calendar_tab.dart',
    'lib/screens/admin/tabs/personnel_tab.dart',
    'lib/screens/admin/tabs/users_tab.dart',
    'lib/screens/admin/tabs/sites_tab.dart',
    'lib/screens/admin/tabs/reports_tab.dart',
    'lib/screens/admin/admin_editable_calendar_dialog.dart'
  ];

  for (final f in files) {
    final file = File(f);
    if (!file.existsSync()) continue;
    
    var content = file.readAsStringSync();
    
    content = content.replaceAll('const BorderSide(color: Theme', 'BorderSide(color: Theme');
    content = content.replaceAll('const Divider(color: Theme', 'Divider(color: Theme');
    content = content.replaceAll('const CircularProgressIndicator(color: Theme', 'CircularProgressIndicator(color: Theme');
    
    // For Icons, they have varying names, e.g. const Icon(LucideIcons.check, color: Theme...
    content = content.replaceAllMapped(RegExp(r'const\s+Icon\(([^,]+),\s*color:\s*Theme'), (match) {
      return 'Icon(\${match.group(1)}, color: Theme';
    });
    content = content.replaceAllMapped(RegExp(r'const\s+Icon\(([^,]+),\s*size:\s*[^,]+,\s*color:\s*Theme'), (match) {
      return match.group(0)!.replaceFirst('const ', '');
    });

    file.writeAsStringSync(content);
    print('Fixed consts in \$f');
  }
}
