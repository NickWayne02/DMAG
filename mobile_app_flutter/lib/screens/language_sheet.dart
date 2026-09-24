import 'package:mobile_app_flutter/providers/locale_provider.dart';
import 'package:provider/provider.dart';
import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:flutter_lucide/flutter_lucide.dart';
import '../theme/app_theme.dart';
import '../widgets/translation_overlay.dart';

class LanguageSheet extends StatelessWidget {
  const LanguageSheet({super.key});

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

    const languages = LocaleProvider.languages;

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
                color: colors.foreground.withValues(alpha: 0.24),
                borderRadius: BorderRadius.circular(2),
              ),
            ),
          ),
          
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 24),
            child: Row(
              children: [
                Text(
                  localeProvider.t('header.language') ?? 'Язык интерфейса',
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
                final isActive = lang['code'] == localeProvider.currentLang;
                return InkWell(
                  borderRadius: BorderRadius.circular(12),
                  onTap: () {
                    final rootNav = Navigator.of(context, rootNavigator: true);
                    final newLang = lang['code']!;
                    Navigator.pop(context); // close the sheet
                    
                    if (newLang != localeProvider.currentLang) {
                      TranslationOverlay.show(rootNav.context, () async {
                        await localeProvider.setLanguage(newLang);
                      });
                    }
                  },
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
                    child: Row(
                      children: [
                        Text(
                          lang['flag']!,
                          style: GoogleFonts.inter(fontSize: 18),
                        ),
                        const SizedBox(width: 16),
                        Expanded(
                          child: Text(
                            lang['name']!,
                            style: GoogleFonts.inter(
                              color: colors.foreground,
                              fontSize: 16,
                            ),
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                          ),
                        ),
                        if (isActive)
                          Icon(LucideIcons.check, color: colors.foreground.withValues(alpha: 0.3), size: 20),
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
