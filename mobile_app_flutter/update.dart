import 'dart:io';

void main() async {
  final file = File('lib/screens/dashboard_screen.dart');
  var content = await file.readAsString();

  content = content.replaceAll(
    "import 'admin/admin_dashboard_screen.dart';\nimport 'admin/admin_editable_calendar_dialog.dart';",
    "import 'admin/admin_dashboard_screen.dart';\nimport 'admin/admin_editable_calendar_dialog.dart';\nimport '../utils/app_toast.dart';\nimport '../utils/fade_page_route.dart';\nimport '../widgets/bounce_button.dart';"
  );

  content = content.replaceAll(
    "await shift.startShift();\n                                }",
    "await shift.startShift();\n                                  if (mounted) AppToast.showSuccess(context, 'Смена начата');\n                                }"
  );

  content = content.replaceAll(
    "onTap: () => shift.startLunch(),",
    "onTap: () async {\n                                  await shift.startLunch();\n                                  if (mounted) AppToast.showWarning(context, 'Перерыв начат');\n                                },"
  );

  content = content.replaceAll(
    "onTap: () => shift.endLunch(),",
    "onTap: () async {\n                                  await shift.endLunch();\n                                  if (mounted) AppToast.showSuccess(context, 'Перерыв завершен');\n                                },"
  );

  content = content.replaceAll(
    "onTap: () => _handleEndShift(context, shift),",
    "onTap: () async {\n                                  await _handleEndShift(context, shift);\n                                  if (mounted && shift.status == ShiftStatus.finished) {\n                                    AppToast.showInfo(context, 'Смена завершена');\n                                  }\n                                },"
  );

  content = content.replaceAll("return GestureDetector(\n      onTap: () async {", "return BounceButton(\n      onTap: () async {");
  content = content.replaceAll("GestureDetector(\n                          onTap: () => _openSiteSelector(context, shift),", "BounceButton(\n                          onTap: () => _openSiteSelector(context, shift),");
  content = content.replaceAll("GestureDetector(\n                          onTap: () {", "BounceButton(\n                          onTap: () {");
  content = content.replaceAll("MaterialPageRoute(builder: (_) => const ChatScreen())", "FadePageRoute(builder: (_) => const ChatScreen())");
  content = content.replaceAll("MaterialPageRoute(builder: (_) => const AdminDashboardScreen())", "FadePageRoute(builder: (_) => const AdminDashboardScreen())");
  content = content.replaceAll("GestureDetector(\n                          onTap: () => FooterSheets.showPrivacyPolicy(context),", "BounceButton(\n                          onTap: () => FooterSheets.showPrivacyPolicy(context),");
  content = content.replaceAll("GestureDetector(\n                          onTap: () => FooterSheets.showTermsOfService(context),", "BounceButton(\n                          onTap: () => FooterSheets.showTermsOfService(context),");
  content = content.replaceAll("GestureDetector(\n                          onTap: () => FooterSheets.showSupport(context),", "BounceButton(\n                          onTap: () => FooterSheets.showSupport(context),");
  content = content.replaceAll("GestureDetector(\n                onTap: () => SettingsSheet.show(context),", "BounceButton(\n                onTap: () => SettingsSheet.show(context),");
  content = content.replaceAll("GestureDetector(\n                onTap: () => LanguageSheet.show(context),", "BounceButton(\n                onTap: () => LanguageSheet.show(context),");
  content = content.replaceAll("GestureDetector(\n                onTap: () => AuthService.signOut(),", "BounceButton(\n                onTap: () => AuthService.signOut(),");

  await file.writeAsString(content);
}
