import 'dart:convert';
import 'package:provider/provider.dart';
import 'package:mobile_app_flutter/providers/locale_provider.dart';
import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:flutter_lucide/flutter_lucide.dart';
import '../../../theme/app_theme.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:http/http.dart' as http;
import 'package:flutter/foundation.dart';

class ChangeNameDialog extends StatefulWidget {
  final String userId;
  final String userName;
  final String? firstName;
  final String? lastName;
  final Map<String, dynamic>? firstNameTranslations;
  final Map<String, dynamic>? lastNameTranslations;
  final String? username;
  final String? birthDate;
  final VoidCallback onSuccess;

  const ChangeNameDialog({
    super.key,
    required this.userId,
    required this.userName,
    this.firstName,
    this.lastName,
    this.firstNameTranslations,
    this.lastNameTranslations,
    this.username,
    this.birthDate,
    required this.onSuccess,
  });

  static Future<void> show(BuildContext context, {required String userId, required String userName, String? firstName, Map<String, dynamic>? firstNameTranslations, String? lastName, Map<String, dynamic>? lastNameTranslations, String? username, String? birthDate, required VoidCallback onSuccess}) {
    return showDialog(
      context: context,
      barrierDismissible: true,
      builder: (_) => ChangeNameDialog(
        userId: userId,
        userName: userName,
        firstName: firstName,
        lastName: lastName,
        firstNameTranslations: firstNameTranslations,
        lastNameTranslations: lastNameTranslations,
        username: username,
        birthDate: birthDate,
        onSuccess: onSuccess,
      ),
    );
  }

  @override
  State<ChangeNameDialog> createState() => _ChangeNameDialogState();
}

class _ChangeNameDialogState extends State<ChangeNameDialog> {
  late TextEditingController _firstNameController;
  late TextEditingController _lastNameController;
  late TextEditingController _firstNameRuController;
  late TextEditingController _lastNameRuController;
  late TextEditingController _firstNameUkController;
  late TextEditingController _lastNameUkController;
  late TextEditingController _usernameController;
  late TextEditingController _birthDateController;
  bool _isLoading = false;

  Map<String, dynamic> _firstNameTranslations = {};
  Map<String, dynamic> _lastNameTranslations = {};

  @override
  void initState() {
    super.initState();
    final widgetType = widget as dynamic;
    
    _firstNameTranslations = widgetType.firstNameTranslations != null ? Map<String, dynamic>.from(widgetType.firstNameTranslations) : {};
    _lastNameTranslations = widgetType.lastNameTranslations != null ? Map<String, dynamic>.from(widgetType.lastNameTranslations) : {};

    _firstNameController = TextEditingController(text: widget.firstName ?? '');
    _lastNameController = TextEditingController(text: widget.lastName ?? '');
    _firstNameRuController = TextEditingController(text: _firstNameTranslations['ru'] as String? ?? '');
    _lastNameRuController = TextEditingController(text: _lastNameTranslations['ru'] as String? ?? '');
    _firstNameUkController = TextEditingController(text: _firstNameTranslations['uk'] as String? ?? '');
    _lastNameUkController = TextEditingController(text: _lastNameTranslations['uk'] as String? ?? '');
    _usernameController = TextEditingController(text: widget.username ?? '');
    _birthDateController = TextEditingController(text: _formatForDisplay(widget.birthDate));
  }

  @override
  void dispose() {
    _firstNameController.dispose();
    _lastNameController.dispose();
    _firstNameRuController.dispose();
    _lastNameRuController.dispose();
    _firstNameUkController.dispose();
    _lastNameUkController.dispose();
    _usernameController.dispose();
    _birthDateController.dispose();
    super.dispose();
  }

  Future<void> _updateName() async {
    final fn = _firstNameController.text.trim();
    final ln = _lastNameController.text.trim();
    final un = _usernameController.text.trim();
    final bd = _birthDateController.text.trim();
    if (fn.isEmpty || ln.isEmpty || un.isEmpty || bd.isEmpty) return;

    final ruFn = _firstNameRuController.text.trim();
    final ruLn = _lastNameRuController.text.trim();
    final ukFn = _firstNameUkController.text.trim();
    final ukLn = _lastNameUkController.text.trim();
    
    if (ruFn.isNotEmpty) _firstNameTranslations['ru'] = ruFn; else _firstNameTranslations.remove('ru');
    if (ruLn.isNotEmpty) _lastNameTranslations['ru'] = ruLn; else _lastNameTranslations.remove('ru');
    if (ukFn.isNotEmpty) _firstNameTranslations['uk'] = ukFn; else _firstNameTranslations.remove('uk');
    if (ukLn.isNotEmpty) _lastNameTranslations['uk'] = ukLn; else _lastNameTranslations.remove('uk');

    setState(() {
      _isLoading = true;
    });

    try {
      final session = Supabase.instance.client.auth.currentSession;
      if (session == null) throw Exception("No active session");

      const String baseUrl = kIsWeb ? 'http://127.0.0.1:5174' : 'http://10.0.2.2:5174';
      final response = await http.post(
        Uri.parse('$baseUrl/api/users/update'),
        headers: {
          'Authorization': 'Bearer ${session.accessToken}',
          'Content-Type': 'application/json',
        },
        body: jsonEncode({
          'user_id': widget.userId,
          'first_name': fn,
          'last_name': ln,
          'first_name_translations': _firstNameTranslations,
          'last_name_translations': _lastNameTranslations,
          'username': un,
          'birth_date': bd,
        }),
      );

      if (response.statusCode != 200) {
        throw Exception("Failed to update name: ${response.body}");
      }

      if (mounted) {
        Navigator.of(context).pop();
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(context.read<LocaleProvider>().t('users.name_updated') ?? 'Профиль успешно обновлен')),
        );
        widget.onSuccess();
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Ошибка: $e')),
        );
      }
    } finally {
      if (mounted) {
        setState(() {
          _isLoading = false;
        });
      }
    }
  }

  Widget _buildTextField(String label, TextEditingController controller) {
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
        const SizedBox(height: 8),
        TextField(
          controller: controller,
          style: GoogleFonts.inter(color: Theme.of(context).appColors.foreground, fontSize: 14),
          decoration: InputDecoration(
            filled: true,
            fillColor: Theme.of(context).cardColor,
            contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
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
        const SizedBox(height: 16),
      ],
    );
  }
  String _formatForApi(String dateStr) {
    if (dateStr.length == 10 && dateStr[2] == '.' && dateStr[5] == '.') {
      final parts = dateStr.split('.');
      if (parts.length == 3) {
        return '${parts[2]}-${parts[1]}-${parts[0]}';
      }
    }
    return dateStr;
  }

  String _formatForDisplay(String? dateStr) {
    if (dateStr == null || dateStr.isEmpty) return '';
    if (dateStr.length >= 10 && dateStr[4] == '-' && dateStr[7] == '-') {
      final parts = dateStr.substring(0, 10).split('-');
      if (parts.length == 3) {
        return '${parts[2]}.${parts[1]}.${parts[0]}';
      }
    }
    return dateStr;
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
                  const SizedBox(width: 24),
                  Expanded(
                    child: Text(
                      context.watch<LocaleProvider>().t('users.edit_name') ?? 'Редактировать',
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
              const SizedBox(height: 24),

              Row(
                children: [
                  Expanded(child: _buildTextField('${context.watch<LocaleProvider>().t('auth.firstName') ?? 'Имя'} (Default/EN)', _firstNameController)),
                  const SizedBox(width: 16),
                  Expanded(child: _buildTextField('${context.watch<LocaleProvider>().t('auth.lastName') ?? 'Фамилия'} (Default/EN)', _lastNameController)),
                ],
              ),
              Row(
                children: [
                  Expanded(child: _buildTextField('${context.watch<LocaleProvider>().t('auth.firstName') ?? 'Имя'} (RU)', _firstNameRuController)),
                  const SizedBox(width: 16),
                  Expanded(child: _buildTextField('${context.watch<LocaleProvider>().t('auth.lastName') ?? 'Фамилия'} (RU)', _lastNameRuController)),
                ],
              ),
              Row(
                children: [
                  Expanded(child: _buildTextField('${context.watch<LocaleProvider>().t('auth.firstName') ?? 'Имя'} (UK)', _firstNameUkController)),
                  const SizedBox(width: 16),
                  Expanded(child: _buildTextField('${context.watch<LocaleProvider>().t('auth.lastName') ?? 'Фамилия'} (UK)', _lastNameUkController)),
                ],
              ),
              
              _buildTextField(context.watch<LocaleProvider>().t('auth.username') ?? 'Имя пользователя', _usernameController),
              
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(context.read<LocaleProvider>().t('auth.birthDate') ?? 'Дата рождения', style: GoogleFonts.inter(color: Theme.of(context).appColors.foreground, fontSize: 14, fontWeight: FontWeight.bold)),
                  const SizedBox(height: 8),
                  GestureDetector(
                    onTap: () async {
                      final date = await showDatePicker(
                        context: context,
                        initialDate: DateTime.now(),
                        firstDate: DateTime(1900),
                        lastDate: DateTime.now(),
                      );
                      if (date != null) {
                        _birthDateController.text = "${date.day.toString().padLeft(2, '0')}.${date.month.toString().padLeft(2, '0')}.${date.year}";
                      }
                    },
                    child: AbsorbPointer(
                      child: TextField(
                        controller: _birthDateController,
                        style: TextStyle(color: Theme.of(context).appColors.foreground),
                        decoration: InputDecoration(
                          hintText: 'ДД.ММ.ГГГГ',
                          hintStyle: TextStyle(color: Theme.of(context).appColors.foreground.withValues(alpha: 0.3)),
                          filled: true,
                          fillColor: Theme.of(context).cardColor,
                          contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                          border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide(color: Theme.of(context).appColors.foreground.withValues(alpha: 0.12))),
                          enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide(color: Theme.of(context).appColors.foreground.withValues(alpha: 0.12))),
                          focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide(color: Theme.of(context).appColors.primary)),
                        ),
                      ),
                    ),
                  ),
                ],
              ),

              const SizedBox(height: 24),
              
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
                  onPressed: _isLoading ? null : _updateName,
                  child: _isLoading
                      ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2))
                      : Text(context.watch<LocaleProvider>().t('calendar.save') ?? 'Сохранить', style: GoogleFonts.inter(fontSize: 14, fontWeight: FontWeight.bold)),
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
