import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:flutter_lucide/flutter_lucide.dart';
import 'package:provider/provider.dart';
import '../providers/locale_provider.dart';
import '../theme/app_theme.dart';

class LanguageSheet extends StatelessWidget {
  const LanguageSheet({Key? key}) : super(key: key);

  static Future<void> show(BuildContext context) {
    return showModalBottomSheet(
      context: context,
      backgroundColor: Colors.transparent,
      isScrollControlled: true,
      builder: (context) => const LanguageSheet(),
    );
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colors = theme.appColors;
    final localeProvider = context.watch<LocaleProvider>();

    final languages = [
      {'code': 'RU', 'name': 'Русский', 'flag': '🇷🇺'},
      {'code': 'GB', 'name': 'English', 'flag': '🇬🇧'},
      {'code': 'DE', 'name': 'Deutsch', 'flag': '🇩🇪'},
      {'code': 'RO', 'name': 'Română', 'flag': '🇷🇴'},
      {'code': 'BG', 'name': 'Български', 'flag': '🇧🇬'},
      {'code': 'PL', 'name': 'Polski', 'flag': '🇵🇱'},
      {'code': 'UA', 'name': 'Українська', 'flag': '🇺🇦'},
      {'code': 'UZ', 'name': 'O\'zbekcha', 'flag': '🇺🇿'},
      {'code': 'TJ', 'name': 'Тоҷикӣ', 'flag': '🇹🇯'},
    ];

    return Container(
      decoration: BoxDecoration(
        color: colors.card,
        borderRadius: const BorderRadius.only(
          topLeft: Radius.circular(24),
          topRight: Radius.circular(24),
        ),
        border: Border.all(color: colors.border),
      ),
      padding: const EdgeInsets.only(bottom: 24),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          // Drag handle
          Center(
            child: Container(
              margin: const EdgeInsets.only(top: 12, bottom: 24),
              width: 40,
              height: 4,
              decoration: BoxDecoration(
                color: colors.foreground.withOpacity(0.24),
                borderRadius: BorderRadius.circular(2),
              ),
            ),
          ),
          
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 24),
            child: Row(
              children: [
                Text(
                  localeProvider.t('header.language') ?? 'Язык',
                  style: GoogleFonts.inter(
                    fontSize: 18,
                    fontWeight: FontWeight.bold,
                    color: colors.foreground,
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 16),
          
          Flexible(
            child: ListView.builder(
              shrinkWrap: true,
              padding: const EdgeInsets.symmetric(horizontal: 16),
              itemCount: languages.length,
              itemBuilder: (context, index) {
                final lang = languages[index];
                final isActive = lang['code']!.toLowerCase() == localeProvider.currentLang;
                return InkWell(
                  onTap: () {
                    localeProvider.setLanguage(lang['code']!.toLowerCase());
                    Navigator.pop(context);
                  },
                  child: Padding(
                    padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 16),
                    child: Row(
                      children: [
                        SizedBox(
                          width: 32,
                          child: Text(
                            lang['flag']!,
                            style: GoogleFonts.inter(
                              color: colors.foreground,
                              fontWeight: FontWeight.bold,
                              fontSize: 16,
                            ),
                          ),
                        ),
                        Expanded(
                          child: Text(
                            lang['name']!,
                            style: GoogleFonts.inter(
                              color: colors.foreground,
                              fontSize: 16,
                            ),
                          ),
                        ),
                        if (isActive)
                          Icon(LucideIcons.check, color: colors.primary, size: 20),
                      ],
                    ),
                  ),
                );
              },
            ),
          ),
        ],
      ),
    );
  }
}
