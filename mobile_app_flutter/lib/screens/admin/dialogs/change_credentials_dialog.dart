import 'package:provider/provider.dart';
import 'package:mobile_app_flutter/providers/locale_provider.dart';
import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:flutter_lucide/flutter_lucide.dart';
import '../../../theme/app_theme.dart';

class ChangeCredentialsDialog extends StatefulWidget {
  final String userId;
  final String userName;
  final String userEmail;

  const ChangeCredentialsDialog({
    super.key,
    required this.userId,
    required this.userName,
    required this.userEmail,
  });

  static Future<void> show(BuildContext context, {required String userId, required String userName, required String userEmail}) {
    return showDialog(
      context: context,
      barrierDismissible: true,
      builder: (_) => ChangeCredentialsDialog(
        userId: userId,
        userName: userName,
        userEmail: userEmail,
      ),
    );
  }

  @override
  State<ChangeCredentialsDialog> createState() => _ChangeCredentialsDialogState();
}

class _ChangeCredentialsDialogState extends State<ChangeCredentialsDialog> {
  late TextEditingController _loginController;
  late TextEditingController _passwordController;
  bool _obscurePassword = true;

  @override
  void initState() {
    super.initState();
    _loginController = TextEditingController(text: widget.userEmail);
    _passwordController = TextEditingController();
  }

  @override
  void dispose() {
    _loginController.dispose();
    _passwordController.dispose();
    super.dispose();
  }

  Widget _buildTextField(String label, TextEditingController controller, {bool isPassword = false}) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          label,
          style: GoogleFonts.inter(
            color: Theme.of(context).appColors.foreground,
            fontSize: 14,
            fontWeight: FontWeight.bold,
          ),
        ),
        SizedBox(height: 8),
        TextField(
          controller: controller,
          obscureText: isPassword && _obscurePassword,
          style: GoogleFonts.inter(color: Theme.of(context).appColors.foreground, fontSize: 14),
          decoration: InputDecoration(
            filled: true,
            fillColor: Theme.of(context).cardColor,
            contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
            suffixIcon: isPassword
                ? IconButton(
                    icon: Icon(
                      _obscurePassword ? LucideIcons.eye : LucideIcons.eye_off,
                      color: Theme.of(context).appColors.foreground.withValues(alpha: 0.54),
                      size: 20,
                    ),
                    onPressed: () {
                      setState(() {
                        _obscurePassword = !_obscurePassword;
                      });
                    },
                  )
                : null,
            enabledBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(12),
              borderSide: BorderSide(color: Theme.of(context).appColors.foreground.withValues(alpha: 0.12)),
            ),
            focusedBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(12),
              borderSide: BorderSide(color: Theme.of(context).appColors.foreground.withValues(alpha: 0.38)),
            ),
          ),
        ),
        SizedBox(height: 16),
      ],
    );
  }

  @override
  Widget build(BuildContext context) {
    return Dialog(
      backgroundColor: Colors.transparent,
      insetPadding: const EdgeInsets.symmetric(horizontal: 16),
      child: Container(
        width: double.infinity,
        padding: const EdgeInsets.all(24),
        decoration: BoxDecoration(
          color: Theme.of(context).cardColor,
          borderRadius: BorderRadius.circular(20),
          border: Border.all(color: Theme.of(context).appColors.foreground.withValues(alpha: 0.12)),
        ),
        child: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  SizedBox(width: 24),
                  Expanded(
                    child: Text(
                      context.watch<LocaleProvider>().t('users.change_creds') ?? 'Логин/пароль',
                      textAlign: TextAlign.center,
                      style: GoogleFonts.inter(
                        color: Theme.of(context).appColors.foreground,
                        fontSize: 18,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ),
                  GestureDetector(
                    onTap: () => Navigator.of(context).pop(),
                    child: Icon(LucideIcons.x, color: Theme.of(context).appColors.foreground.withValues(alpha: 0.54), size: 24),
                  ),
                ],
              ),
              SizedBox(height: 12),
              Text(
                widget.userName,
                textAlign: TextAlign.center,
                style: GoogleFonts.inter(
                  color: Theme.of(context).appColors.foreground.withValues(alpha: 0.7),
                  fontSize: 14,
                ),
              ),
              SizedBox(height: 24),

              _buildTextField(context.watch<LocaleProvider>().t('auth.email') ?? 'Email (Логин)', _loginController),
              _buildTextField(context.watch<LocaleProvider>().t('auth.password') ?? 'Пароль', _passwordController, isPassword: true),

              SizedBox(height: 16),
              
              SizedBox(
                width: double.infinity,
                child: ElevatedButton(
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFF334155), // Slate 700
                    foregroundColor: Theme.of(context).appColors.foreground,
                    padding: const EdgeInsets.symmetric(vertical: 16),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                    elevation: 0,
                  ),
                  onPressed: () {
                    // Logic to update password/login via Supabase Admin API / Edge Function goes here
                    // For now we just close the dialog
                    Navigator.of(context).pop();
                    ScaffoldMessenger.of(context).showSnackBar(
                      SnackBar(content: Text(context.read<LocaleProvider>().t('users.creds_updated') ?? 'Данные обновлены (Mock)')),
                    );
                  },
                  child: Text(context.watch<LocaleProvider>().t('calendar.save') ?? 'Сохранить', style: GoogleFonts.inter(fontSize: 14, fontWeight: FontWeight.bold)),
                ),
              ),
              SizedBox(height: 8),
              SizedBox(
                width: double.infinity,
                child: TextButton(
                  style: TextButton.styleFrom(
                    padding: const EdgeInsets.symmetric(vertical: 16),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                  ),
                  onPressed: () => Navigator.of(context).pop(),
                  child: Text(context.watch<LocaleProvider>().t('calendar.cancel') ?? 'Отмена', style: GoogleFonts.inter(color: Theme.of(context).appColors.foreground, fontSize: 14, fontWeight: FontWeight.bold)),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
