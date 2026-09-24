import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:flutter_lucide/flutter_lucide.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:provider/provider.dart';
import '../theme/app_theme.dart';
import '../providers/locale_provider.dart';
import '../services/auth_service.dart';
import 'language_sheet.dart';
import 'settings_sheet.dart';
import '../providers/settings_provider.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  bool _isLoading = false;
  bool _isLoginMode = true;
  bool _obscurePassword = true;
  bool _obscureConfirmPassword = true;
  final TextEditingController _firstNameController = TextEditingController();
  final TextEditingController _lastNameController = TextEditingController();
  final TextEditingController _usernameController = TextEditingController();
  final TextEditingController _birthDateController = TextEditingController();
  final TextEditingController _emailController = TextEditingController();
  final TextEditingController _passwordController = TextEditingController();
  final TextEditingController _confirmPasswordController = TextEditingController();

  void _handleLogin() async {
    final email = _emailController.text.trim();
    final password = _passwordController.text;

    if (email.isEmpty || password.isEmpty || (!_isLoginMode && (_firstNameController.text.isEmpty || _lastNameController.text.isEmpty || _usernameController.text.isEmpty || _birthDateController.text.isEmpty || _confirmPasswordController.text.isEmpty))) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(context.read<LocaleProvider>().t('auth.errors.fill_fields') ?? 'Пожалуйста, заполните все поля')),
      );
      return;
    }
    
    if (!_isLoginMode && password != _confirmPasswordController.text) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(context.read<LocaleProvider>().t('auth.errors.passwords_not_match') ?? 'Пароли не совпадают')),
      );
      return;
    }

    setState(() => _isLoading = true);
    
    try {
      if (_isLoginMode) {
        await AuthService.signIn(email: email, password: password);
      } else {
        await AuthService.signUp(
          email: email, 
          password: password, 
          firstName: _firstNameController.text.trim(),
          lastName: _lastNameController.text.trim(),
          username: _usernameController.text.trim(),
          birthDate: _formatForApi(_birthDateController.text.trim()),
        );
      }
      // Navigation is handled automatically by AuthWrapper
    } on AuthException catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(e.message)),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(context.read<LocaleProvider>().t('auth.errors.default') ?? 'Ошибка авторизации')),
        );
      }
    } finally {
      if (mounted) {
        setState(() => _isLoading = false);
      }
    }
  }

  @override
  void dispose() {
    _firstNameController.dispose();
    _lastNameController.dispose();
    _usernameController.dispose();
    _birthDateController.dispose();
    _emailController.dispose();
    _passwordController.dispose();
    _confirmPasswordController.dispose();
    super.dispose();
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


  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final appColors = theme.appColors;
    final localeProvider = context.watch<LocaleProvider>();
    final t = localeProvider.t;

    final Color inputBg = appColors.card;
    final Color buttonBg = appColors.primary;
    final Color tabBg = appColors.card;
    final Color textColor = appColors.foreground;
    final Color mutedTextColor = appColors.foreground.withValues(alpha: 0.7);

    return Scaffold(
      backgroundColor: theme.scaffoldBackgroundColor,
      body: SafeArea(
        child: SingleChildScrollView(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              // Top Right Controls (Language & Settings)
              Padding(
                padding: const EdgeInsets.all(16.0),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.end,
                  children: [
                    GestureDetector(
                      onTap: () => LanguageSheet.show(context),
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                        decoration: BoxDecoration(
                          color: tabBg,
                          borderRadius: BorderRadius.circular(20),
                        ),
                        child: Row(
                          children: [
                            Icon(LucideIcons.globe, color: textColor, size: 16),
                            const SizedBox(width: 6),
                            Text(
                              localeProvider.currentLanguage['flag'] ?? '',
                              style: const TextStyle(fontSize: 14),
                            ),
                            const SizedBox(width: 4),
                            Text(
                              localeProvider.currentLang.toUpperCase(),
                              style: GoogleFonts.inter(color: textColor, fontSize: 12, fontWeight: FontWeight.bold),
                            ),
                          ],
                        ),
                      ),
                    ),
                    const SizedBox(width: 8),
                    GestureDetector(
                      onTap: () => SettingsSheet.show(context),
                      child: Container(
                        padding: const EdgeInsets.all(8),
                        decoration: BoxDecoration(
                          color: tabBg,
                          shape: BoxShape.circle,
                        ),
                        child: Icon(LucideIcons.settings, color: textColor, size: 16),
                      ),
                    ),
                  ],
                ),
              ),

              const SizedBox(height: 32),

              // Logo & Title
              Center(
                child: Column(
                  children: [
                    ClipRRect(
                      borderRadius: BorderRadius.circular(16),
                      child: context.watch<SettingsProvider>().settings.appLogoUrl != null 
                        ? Image.network(
                            context.watch<SettingsProvider>().settings.appLogoUrl!,
                            width: 140,
                            height: 140,
                            fit: BoxFit.cover,
                          )
                        : Image.asset(
                            'assets/dmag_logo.png',
                            width: 140,
                            height: 140,
                            fit: BoxFit.cover,
                          ),
                    ),
                  ],
                ),
              ),

              const SizedBox(height: 32),

              // Login / Register Tabs
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 32.0),
                child: Container(
                  height: 44,
                  decoration: BoxDecoration(
                    color: tabBg,
                    borderRadius: BorderRadius.circular(22),
                  ),
                  child: Row(
                    children: [
                      Expanded(
                        child: GestureDetector(
                          onTap: () => setState(() => _isLoginMode = true),
                          child: Container(
                            decoration: BoxDecoration(
                              color: _isLoginMode ? appColors.background : Colors.transparent,
                              borderRadius: BorderRadius.circular(22),
                            ),
                            alignment: Alignment.center,
                            child: Text(
                              t('auth.tabLogin') ?? 'Вход',
                              style: GoogleFonts.inter(
                                color: _isLoginMode ? textColor : mutedTextColor,
                                fontWeight: _isLoginMode ? FontWeight.bold : FontWeight.normal,
                              ),
                            ),
                          ),
                        ),
                      ),
                      Expanded(
                        child: GestureDetector(
                          onTap: () => setState(() => _isLoginMode = false),
                          child: Container(
                            decoration: BoxDecoration(
                              color: !_isLoginMode ? appColors.background : Colors.transparent,
                              borderRadius: BorderRadius.circular(22),
                            ),
                            alignment: Alignment.center,
                            child: Text(
                              t('auth.tabSignup') ?? 'Регистрация',
                              style: GoogleFonts.inter(
                                color: !_isLoginMode ? textColor : mutedTextColor,
                                fontWeight: !_isLoginMode ? FontWeight.bold : FontWeight.normal,
                              ),
                            ),
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ),

              const SizedBox(height: 32),

              // Form Fields
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 32.0),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // Fields for Registration only
                    if (!_isLoginMode) ...[
                      Row(
                        children: [
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  t('auth.firstName') ?? 'Имя',
                                  style: GoogleFonts.inter(color: textColor, fontSize: 14, fontWeight: FontWeight.w600),
                                ),
                                const SizedBox(height: 8),
                                TextField(
                                  controller: _firstNameController,
                                  style: TextStyle(color: textColor),
                                  decoration: InputDecoration(
                                    hintText: 'Имя',
                                    hintStyle: TextStyle(color: mutedTextColor),
                                    filled: true,
                                    fillColor: inputBg,
                                    contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
                                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide(color: appColors.border)),
                                    enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide(color: appColors.border)),
                                    focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide(color: appColors.primary)),
                                  ),
                                ),
                              ],
                            ),
                          ),
                          const SizedBox(width: 16),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  t('auth.lastName') ?? 'Фамилия',
                                  style: GoogleFonts.inter(color: textColor, fontSize: 14, fontWeight: FontWeight.w600),
                                ),
                                const SizedBox(height: 8),
                                TextField(
                                  controller: _lastNameController,
                                  style: TextStyle(color: textColor),
                                  decoration: InputDecoration(
                                    hintText: 'Фамилия',
                                    hintStyle: TextStyle(color: mutedTextColor),
                                    filled: true,
                                    fillColor: inputBg,
                                    contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
                                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide(color: appColors.border)),
                                    enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide(color: appColors.border)),
                                    focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide(color: appColors.primary)),
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 24),
                      Text(
                        t('auth.username') ?? 'Имя пользователя',
                        style: GoogleFonts.inter(color: textColor, fontSize: 14, fontWeight: FontWeight.w600),
                      ),
                      const SizedBox(height: 8),
                      TextField(
                        controller: _usernameController,
                        style: TextStyle(color: textColor),
                        decoration: InputDecoration(
                          hintText: 'Имя пользователя',
                          hintStyle: TextStyle(color: mutedTextColor),
                          filled: true,
                          fillColor: inputBg,
                          contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
                          border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide(color: appColors.border)),
                          enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide(color: appColors.border)),
                          focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide(color: appColors.primary)),
                        ),
                      ),
                      const SizedBox(height: 24),
                      Text(
                        t('auth.birthDate') ?? 'Дата рождения',
                        style: GoogleFonts.inter(color: textColor, fontSize: 14, fontWeight: FontWeight.w600),
                      ),
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
                            style: TextStyle(color: textColor),
                            decoration: InputDecoration(
                              hintText: 'ДД.ММ.ГГГГ',
                              hintStyle: TextStyle(color: mutedTextColor),
                              filled: true,
                              fillColor: inputBg,
                              contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
                              suffixIcon: Icon(LucideIcons.calendar, color: mutedTextColor),
                              border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide(color: appColors.border)),
                              enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide(color: appColors.border)),
                              focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide(color: appColors.primary)),
                            ),
                          ),
                        ),
                      ),
                      const SizedBox(height: 24),
                    ],

                    Text(
                      _isLoginMode ? (t('auth.loginOrEmailOrPhone') ?? 'Телефон или Email') : (t('auth.emailOrPhone') ?? 'Телефон или Email'),
                      style: GoogleFonts.inter(
                        color: textColor,
                        fontSize: 14,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                    const SizedBox(height: 8),
                    TextField(
                      controller: _emailController,
                      keyboardType: TextInputType.emailAddress,
                      style: TextStyle(color: textColor),
                      decoration: InputDecoration(
                        hintText: _isLoginMode ? 'Имя пользователя, Email или Телефон' : 'Email или телефон',
                        hintStyle: TextStyle(color: mutedTextColor),
                        filled: true,
                        fillColor: inputBg,
                        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
                        border: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(12),
                          borderSide: BorderSide(color: appColors.border),
                        ),
                        enabledBorder: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(12),
                          borderSide: BorderSide(color: appColors.border),
                        ),
                        focusedBorder: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(12),
                          borderSide: BorderSide(color: appColors.primary),
                        ),
                      ),
                    ),

                    const SizedBox(height: 24),

                    Text(
                      t('auth.password') ?? 'Пароль',
                      style: GoogleFonts.inter(
                        color: textColor,
                        fontSize: 14,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                    const SizedBox(height: 8),
                    TextField(
                      controller: _passwordController,
                      obscureText: _obscurePassword,
                      style: TextStyle(color: textColor),
                      decoration: InputDecoration(
                        filled: true,
                        fillColor: inputBg,
                        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
                        border: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(12),
                          borderSide: BorderSide(color: appColors.border),
                        ),
                        enabledBorder: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(12),
                          borderSide: BorderSide(color: appColors.border),
                        ),
                        focusedBorder: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(12),
                          borderSide: BorderSide(color: appColors.primary),
                        ),
                        suffixIcon: IconButton(
                          icon: Icon(
                            _obscurePassword ? LucideIcons.eye : LucideIcons.eye_off,
                            color: mutedTextColor,
                          ),
                          onPressed: () {
                            setState(() => _obscurePassword = !_obscurePassword);
                          },
                        ),
                      ),
                    ),

                    if (!_isLoginMode) ...[
                      const SizedBox(height: 24),
                      Text(
                        t('auth.confirm_password') ?? 'Подтверждение пароля',
                        style: GoogleFonts.inter(
                          color: textColor,
                          fontSize: 14,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                      const SizedBox(height: 8),
                      TextField(
                        controller: _confirmPasswordController,
                        obscureText: _obscureConfirmPassword,
                        style: TextStyle(color: textColor),
                        decoration: InputDecoration(
                          filled: true,
                          fillColor: inputBg,
                          contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
                          border: OutlineInputBorder(
                            borderRadius: BorderRadius.circular(12),
                            borderSide: BorderSide(color: appColors.border),
                          ),
                          enabledBorder: OutlineInputBorder(
                            borderRadius: BorderRadius.circular(12),
                            borderSide: BorderSide(color: appColors.border),
                          ),
                          focusedBorder: OutlineInputBorder(
                            borderRadius: BorderRadius.circular(12),
                            borderSide: BorderSide(color: appColors.primary),
                          ),
                          suffixIcon: IconButton(
                            icon: Icon(
                              _obscureConfirmPassword ? LucideIcons.eye : LucideIcons.eye_off,
                              color: mutedTextColor,
                            ),
                            onPressed: () {
                              setState(() => _obscureConfirmPassword = !_obscureConfirmPassword);
                            },
                          ),
                        ),
                      ),
                    ],

                    const SizedBox(height: 32),

                    // Login Button
                    GestureDetector(
                      onTap: _isLoading ? null : _handleLogin,
                      child: Container(
                        width: double.infinity,
                        height: 52,
                        decoration: BoxDecoration(
                          color: buttonBg,
                          borderRadius: BorderRadius.circular(16),
                        ),
                        alignment: Alignment.center,
                        child: _isLoading
                            ? SizedBox(
                                height: 24,
                                width: 24,
                                child: CircularProgressIndicator(color: appColors.primaryForeground, strokeWidth: 2),
                              )
                            : Text(
                                _isLoginMode ? (t('auth.signin') ?? 'Войти') : (t('auth.signup') ?? 'Создать учётную запись'),
                                style: GoogleFonts.inter(
                                  color: appColors.primaryForeground,
                                  fontSize: 16,
                                  fontWeight: FontWeight.w600,
                                ),
                              ),
                      ),
                    ),

                    const SizedBox(height: 32),

                    // Forgot Password
                    Center(
                      child: GestureDetector(
                        onTap: () {
                          ScaffoldMessenger.of(context).showSnackBar(
                            SnackBar(
                              content: Row(
                                children: [
                                  Expanded(
                                    child: Text(
                                      t('auth.recover') ?? 'Восстановление пароля производится через Администратора или Супер-админа.',
                                      style: GoogleFonts.inter(
                                        color: const Color(0xFF0284c7),
                                        fontWeight: FontWeight.w500,
                                      ),
                                    ),
                                  ),
                                ],
                              ),
                              backgroundColor: const Color(0xFFe0f2fe),
                              behavior: SnackBarBehavior.floating,
                              margin: const EdgeInsets.all(16),
                              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                              duration: const Duration(seconds: 4),
                            ),
                          );
                        },
                        child: Text(
                          t('auth.forgot_password') ?? 'Забыли пароль?',
                          style: GoogleFonts.inter(
                            color: appColors.primary,
                            fontSize: 14,
                            fontWeight: FontWeight.w500,
                          ),
                        ),
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 32),
            ],
          ),
        ),
      ),
    );
  }
}
