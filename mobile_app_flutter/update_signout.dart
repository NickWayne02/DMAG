import 'dart:io';

void main() async {
  final file = File('lib/screens/dashboard_screen.dart');
  var content = await file.readAsString();

  content = content.replaceAll(
    "onTap: () => AuthService.signOut(),",
    "onTap: () async {\n                  showDialog(\n                    context: context,\n                    barrierDismissible: false,\n                    builder: (c) => const Center(child: CircularProgressIndicator(color: Colors.white)),\n                  );\n                  await AuthService.signOut();\n                  if (context.mounted) Navigator.pop(context);\n                },"
  );

  await file.writeAsString(content);
}
