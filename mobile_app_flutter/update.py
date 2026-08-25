import sys

with open('lib/screens/dashboard_screen.dart', 'r', encoding='utf-8') as f:
    content = f.read()

# Imports
content = content.replace(
    "import 'admin/admin_dashboard_screen.dart';\nimport 'admin/admin_editable_calendar_dialog.dart';",
    "import 'admin/admin_dashboard_screen.dart';\nimport 'admin/admin_editable_calendar_dialog.dart';\nimport '../utils/app_toast.dart';\nimport '../utils/fade_page_route.dart';\nimport '../widgets/bounce_button.dart';"
)

# Start shift
content = content.replace(
    "await shift.startShift();\n                                }",
    "await shift.startShift();\n                                  if (mounted) AppToast.showSuccess(context, 'Смена начата');\n                                }"
)

# Start Lunch
content = content.replace(
    "onTap: () => shift.startLunch(),",
    "onTap: () async {\n                                  await shift.startLunch();\n                                  if (mounted) AppToast.showWarning(context, 'Перерыв начат');\n                                },"
)

# End Lunch
content = content.replace(
    "onTap: () => shift.endLunch(),",
    "onTap: () async {\n                                  await shift.endLunch();\n                                  if (mounted) AppToast.showSuccess(context, 'Перерыв завершен');\n                                },"
)

# End Shift
content = content.replace(
    "onTap: () => _handleEndShift(context, shift),",
    "onTap: () async {\n                                  await _handleEndShift(context, shift);\n                                  if (mounted && shift.status == ShiftStatus.finished) {\n                                    AppToast.showInfo(context, 'Смена завершена');\n                                  }\n                                },"
)

# Button wrappers
content = content.replace("return GestureDetector(\n      onTap: () async {", "return BounceButton(\n      onTap: () async {")
content = content.replace("GestureDetector(\n                          onTap: () => _openSiteSelector(context, shift),", "BounceButton(\n                          onTap: () => _openSiteSelector(context, shift),")
content = content.replace("GestureDetector(\n                          onTap: () {", "BounceButton(\n                          onTap: () {")
content = content.replace("MaterialPageRoute(builder: (_) => const ChatScreen())", "FadePageRoute(builder: (_) => const ChatScreen())")
content = content.replace("MaterialPageRoute(builder: (_) => const AdminDashboardScreen())", "FadePageRoute(builder: (_) => const AdminDashboardScreen())")
content = content.replace("GestureDetector(\n                          onTap: () => FooterSheets.showPrivacyPolicy(context),", "BounceButton(\n                          onTap: () => FooterSheets.showPrivacyPolicy(context),")
content = content.replace("GestureDetector(\n                          onTap: () => FooterSheets.showTermsOfService(context),", "BounceButton(\n                          onTap: () => FooterSheets.showTermsOfService(context),")
content = content.replace("GestureDetector(\n                          onTap: () => FooterSheets.showSupport(context),", "BounceButton(\n                          onTap: () => FooterSheets.showSupport(context),")
content = content.replace("GestureDetector(\n                onTap: () => SettingsSheet.show(context),", "BounceButton(\n                onTap: () => SettingsSheet.show(context),")
content = content.replace("GestureDetector(\n                onTap: () => LanguageSheet.show(context),", "BounceButton(\n                onTap: () => LanguageSheet.show(context),")
content = content.replace("GestureDetector(\n                onTap: () => AuthService.signOut(),", "BounceButton(\n                onTap: () => AuthService.signOut(),")


with open('lib/screens/dashboard_screen.dart', 'w', encoding='utf-8') as f:
    f.write(content)
