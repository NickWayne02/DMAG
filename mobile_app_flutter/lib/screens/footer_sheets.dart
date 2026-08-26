import 'package:provider/provider.dart';
import '../providers/locale_provider.dart';
import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:flutter_lucide/flutter_lucide.dart';
import '../theme/app_theme.dart';
import 'package:url_launcher/url_launcher.dart';

class FooterSheets {
  static Future<void> showPrivacyPolicy(BuildContext context) {
    return _showSheet(
      context,
      context.read<LocaleProvider>().t('footer.privacy') ?? 'Политика конфиденциальности',
      [
        TextSpan(text: '''${context.watch<LocaleProvider>().t('footer.privacy_desc') ?? 'Настоящая Политика конфиденциальности...'}''' + '\n\n'),
        TextSpan(text: '''${context.watch<LocaleProvider>().t('footer.privacy_1') ?? '1. Сбор данных'}''' + '\n', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
        TextSpan(text: '''${context.watch<LocaleProvider>().t('footer.privacy_1_desc') ?? 'Мы собираем данные...'}''' + '\n\n'),
        TextSpan(text: '''${context.watch<LocaleProvider>().t('footer.privacy_2') ?? '2. Использование фотоотчётов'}''' + '\n', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
        TextSpan(text: '''${context.watch<LocaleProvider>().t('footer.privacy_2_desc') ?? 'Фотографии, загруженные...'}''' + '\n\n'),
        TextSpan(text: '''${context.watch<LocaleProvider>().t('footer.privacy_3') ?? '3. Безопасность'}''' + '\n', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
        TextSpan(text: '''${context.watch<LocaleProvider>().t('footer.privacy_3_desc') ?? 'Мы применяем...'}''' + '\n'),
      ]
    );
  }

  static Future<void> showTermsOfService(BuildContext context) {
    return _showSheet(
      context,
      context.read<LocaleProvider>().t('footer.terms') ?? 'Условия использования',
      [
        TextSpan(text: '''${context.watch<LocaleProvider>().t('footer.terms_desc') ?? 'Используя корпоративный портал...'}''' + '\n\n'),
        TextSpan(text: '''${context.watch<LocaleProvider>().t('footer.terms_1') ?? '• Сотрудник обязан...'}''' + '\n\n'),
        TextSpan(text: '''${context.watch<LocaleProvider>().t('footer.terms_2') ?? '• Отчёты по объектам...'}''' + '\n\n'),
        TextSpan(text: '''${context.watch<LocaleProvider>().t('footer.terms_3') ?? '• Запрещается...'}''' + '\n\n'),
        TextSpan(text: '''${context.watch<LocaleProvider>().t('footer.terms_concl') ?? 'Нарушение данных условий...'}''' + '\n'),
      ]
    );
  }

  static Future<void> showSupport(BuildContext context) {
    final colors = Theme.of(context).appColors;
    final primary = Theme.of(context).primaryColor;
    
    return showModalBottomSheet(
      context: context,
      backgroundColor: Colors.transparent,
      isScrollControlled: true,
      builder: (context) {
        return Container(
          decoration: BoxDecoration(
            color: Theme.of(context).cardColor,
            borderRadius: const BorderRadius.only(topLeft: Radius.circular(24), topRight: Radius.circular(24)),
            border: Border.all(color: colors.border),
          ),
          padding: const EdgeInsets.only(left: 24, right: 24, top: 24, bottom: 48),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Align(
                alignment: Alignment.topRight,
                child: GestureDetector(
                  onTap: () => Navigator.pop(context),
                  child: Icon(LucideIcons.x, color: colors.foreground.withOpacity(0.5)),
                ),
              ),
              const SizedBox(height: 8),
              Text(context.read<LocaleProvider>().t('support.title') ?? 'Нужна помощь?', style: GoogleFonts.inter(fontSize: 20, fontWeight: FontWeight.bold, color: colors.foreground)),
              const SizedBox(height: 24),
              Container(
                width: 64,
                height: 64,
                decoration: BoxDecoration(
                  color: primary.withOpacity(0.1),
                  shape: BoxShape.circle,
                ),
                alignment: Alignment.center,
                child: Icon(LucideIcons.phone, color: primary, size: 32),
              ),
              const SizedBox(height: 24),
              Text(context.read<LocaleProvider>().t('support.title') ?? 'Нужна помощь?', style: GoogleFonts.inter(fontSize: 18, fontWeight: FontWeight.bold, color: colors.foreground)),
              const SizedBox(height: 12),
              Text(
                context.watch<LocaleProvider>().t('support.desc') ?? 'Свяжитесь с диспетчерской или вашим куратором для решения технических проблем.',
                textAlign: TextAlign.center,
                style: GoogleFonts.inter(fontSize: 14, color: colors.foreground.withOpacity(0.7)),
              ),
              const SizedBox(height: 32),
              GestureDetector(
                onTap: () {
                  launchUrl(Uri.parse('tel:+498001234567'));
                },
                child: Container(
                  width: double.infinity,
                  padding: const EdgeInsets.symmetric(vertical: 20),
                  decoration: BoxDecoration(
                    color: Colors.transparent,
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(color: colors.border),
                  ),
                  child: Column(
                    children: [
                      Text(context.watch<LocaleProvider>().t('support.hotline') ?? 'Горячая линия (24/7)', style: GoogleFonts.inter(fontSize: 12, color: colors.foreground)),
                      const SizedBox(height: 8),
                      Text('+49 800 123 4567', style: GoogleFonts.inter(fontSize: 24, fontWeight: FontWeight.bold, color: colors.foreground)),
                    ],
                  ),
                ),
              ),
            ],
          ),
        );
      },
    );
  }

  static Future<void> _showSheet(BuildContext context, String title, List<TextSpan> textSpans) {
    final colors = Theme.of(context).appColors;
    
    return showModalBottomSheet(
      context: context,
      backgroundColor: Colors.transparent,
      isScrollControlled: true,
      builder: (context) {
        return Container(
          constraints: BoxConstraints(maxHeight: MediaQuery.of(context).size.height * 0.9),
          decoration: BoxDecoration(
            color: Theme.of(context).cardColor,
            borderRadius: const BorderRadius.only(topLeft: Radius.circular(24), topRight: Radius.circular(24)),
            border: Border.all(color: colors.border),
          ),
          padding: const EdgeInsets.only(left: 24, right: 24, top: 24, bottom: 48),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Expanded(
                    child: Text(
                      title,
                      style: GoogleFonts.inter(fontSize: 20, fontWeight: FontWeight.bold, color: colors.foreground),
                      textAlign: TextAlign.center,
                    ),
                  ),
                  GestureDetector(
                    onTap: () => Navigator.pop(context),
                    child: Icon(LucideIcons.x, color: colors.foreground.withOpacity(0.5)),
                  ),
                ],
              ),
              const SizedBox(height: 24),
              Flexible(
                child: SingleChildScrollView(
                  child: RichText(
                    text: TextSpan(
                      style: GoogleFonts.inter(fontSize: 14, color: colors.foreground.withOpacity(0.7), height: 1.5),
                      children: textSpans,
                    ),
                  ),
                ),
              ),
            ],
          ),
        );
      },
    );
  }
}
