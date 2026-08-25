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
    final languages = [
      {'code': 'RU', 'name': 'Русский'},
      {'code': 'GB', 'name': 'English'},
      {'code': 'DE', 'name': 'Deutsch'},
      {'code': 'RO', 'name': 'Română'},
      {'code': 'BG', 'name': 'Български'},
      {'code': 'PL', 'name': 'Polski'},
      {'code': 'UA', 'name': 'Українська'},
      {'code': 'UZ', 'name': 'O\'zbekcha'},
      {'code': 'TJ', 'name': 'Тоҷикӣ'},
    ];

    return Container(
      decoration: BoxDecoration(
        color: const Color(0xFF0F0F0F),
        borderRadius: const BorderRadius.only(
          topLeft: Radius.circular(24),
          topRight: Radius.circular(24),
        ),
        border: Border.all(color: Colors.white12),
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
                color: Colors.white24,
                borderRadius: BorderRadius.circular(2),
              ),
            ),
          ),
          
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 24),
            child: Row(
              children: [
                Text(
                  context.read<LocaleProvider>().t('header.language'),
                  style: GoogleFonts.inter(
                    fontSize: 18,
                    fontWeight: FontWeight.bold,
                    color: Colors.white,
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
                final isActive = lang['code']!.toLowerCase() == context.watch<LocaleProvider>().currentLang;
                return InkWell(
                  onTap: () {
                    context.read<LocaleProvider>().setLanguage(lang['code']!.toLowerCase());
                    Navigator.pop(context);
                  },
                  child: Padding(
                    padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 16),
                    child: Row(
                      children: [
                        SizedBox(
                          width: 32,
                          child: Text(
                            lang['code']!,
                            style: GoogleFonts.inter(
                              color: Colors.white,
                              fontWeight: FontWeight.bold,
                              fontSize: 12,
                            ),
                          ),
                        ),
                        Expanded(
                          child: Text(
                            lang['name']!,
                            style: GoogleFonts.inter(
                              color: Colors.white,
                              fontSize: 16,
                            ),
                          ),
                        ),
                        if (isActive)
                          const Icon(LucideIcons.check, color: Colors.white38, size: 20),
                      ],
                    ),
                  ),
                );
              },
            ),
          )
        ],
      ),
    );
  }
}
