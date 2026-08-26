import 'package:provider/provider.dart';
import 'package:mobile_app_flutter/providers/locale_provider.dart';
import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:flutter_lucide/flutter_lucide.dart';

class CreateUserDialog extends StatefulWidget {
  const CreateUserDialog({super.key});

  static Future<void> show(BuildContext context) {
    return showDialog(
      context: context,
      barrierDismissible: true,
      builder: (_) => const CreateUserDialog(),
    );
  }

  @override
  State<CreateUserDialog> createState() => _CreateUserDialogState();
}

class _CreateUserDialogState extends State<CreateUserDialog> {
  String _selectedRole = 'employee';
  final List<String> _roles = ['employee', 'brigadier', 'admin', 'super_admin'];

  Widget _buildTextField(String label) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          label,
          style: GoogleFonts.inter(
            color: Colors.white,
            fontSize: 14,
            fontWeight: FontWeight.bold,
          ),
        ),
        const SizedBox(height: 8),
        TextField(
          style: GoogleFonts.inter(color: Colors.white, fontSize: 14),
          decoration: InputDecoration(
            filled: true,
            fillColor: Colors.black,
            contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
            enabledBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(12),
              borderSide: const BorderSide(color: Colors.white12),
            ),
            focusedBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(12),
              borderSide: const BorderSide(color: Colors.white38),
            ),
          ),
        ),
        const SizedBox(height: 16),
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
          color: Colors.black, // true black
          borderRadius: BorderRadius.circular(20),
          border: Border.all(color: Colors.white12),
        ),
        child: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const SizedBox(width: 24), // balance for close icon
                  Expanded(
                    child: Text(
                      context.watch<LocaleProvider>().t('create_user.title') ?? 'Создать пользователя',
                      textAlign: TextAlign.center,
                      style: GoogleFonts.inter(
                        color: Colors.white,
                        fontSize: 18,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ),
                  GestureDetector(
                    onTap: () => Navigator.of(context).pop(),
                    child: const Icon(LucideIcons.x, color: Colors.white54, size: 24),
                  ),
                ],
              ),
              const SizedBox(height: 12),
              Text(
                context.watch<LocaleProvider>().t('create_user.subtitle') ?? 'Логин и пароль будут выданы новому сотруднику или администратору.',
                textAlign: TextAlign.center,
                style: GoogleFonts.inter(color: Colors.white54, fontSize: 13),
              ),
              const SizedBox(height: 24),
              
              _buildTextField(context.watch<LocaleProvider>().t('create_user.name') ?? 'Полное имя'),
              _buildTextField(context.watch<LocaleProvider>().t('create_user.email') ?? 'Email (логин)'),
              _buildTextField(context.watch<LocaleProvider>().t('create_user.password') ?? 'Пароль'),
              
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    context.watch<LocaleProvider>().t('create_user.role') ?? 'Роль',
                    style: GoogleFonts.inter(
                      color: Colors.white,
                      fontSize: 14,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  const SizedBox(height: 8),
                  Container(
                    width: double.infinity,
                    padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
                    decoration: BoxDecoration(
                      color: Colors.black,
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: Colors.white12),
                    ),
                    child: DropdownButtonHideUnderline(
                      child: DropdownButton<String>(
                        value: _selectedRole,
                        dropdownColor: const Color(0xFF18181b),
                        icon: const Icon(LucideIcons.chevron_down, color: Colors.white54, size: 16),
                        style: GoogleFonts.inter(color: Colors.white, fontSize: 14),
                        items: _roles.map((r) => DropdownMenuItem(value: r, child: Text(context.watch<LocaleProvider>().t('role.$r') ?? r))).toList(),
                        onChanged: (v) {
                          if (v != null) setState(() => _selectedRole = v);
                        },
                      ),
                    ),
                  ),
                ],
              ),
              
              const SizedBox(height: 32),
              
              SizedBox(
                width: double.infinity,
                child: ElevatedButton(
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFF334155), // Slate 700
                    foregroundColor: Colors.white,
                    padding: const EdgeInsets.symmetric(vertical: 16),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                    elevation: 0,
                  ),
                  onPressed: () {
                    Navigator.of(context).pop();
                  },
                  child: Text(context.watch<LocaleProvider>().t('users.create') ?? 'Создать', style: GoogleFonts.inter(fontSize: 14, fontWeight: FontWeight.bold)),
                ),
              ),
              const SizedBox(height: 8),
              SizedBox(
                width: double.infinity,
                child: TextButton(
                  style: TextButton.styleFrom(
                    padding: const EdgeInsets.symmetric(vertical: 16),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                  ),
                  onPressed: () => Navigator.of(context).pop(),
                  child: Text(context.watch<LocaleProvider>().t('calendar.cancel') ?? 'Отмена', style: GoogleFonts.inter(color: Colors.white, fontSize: 14, fontWeight: FontWeight.bold)),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
