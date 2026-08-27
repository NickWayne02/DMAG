import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';
import '../providers/locale_provider.dart';
import '../theme/app_theme.dart';

class TranslationOverlay {
  static Future<void> show(BuildContext context, Future<void> Function() action) async {
    showDialog(
      context: context,
      barrierDismissible: false,
      barrierColor: Colors.black.withValues(alpha: 0.4),
      builder: (ctx) => const _TranslationDialog(),
    );

    await Future.delayed(const Duration(milliseconds: 300));
    await action();
    await Future.delayed(const Duration(milliseconds: 1000));
    
    if (context.mounted) {
      Navigator.of(context, rootNavigator: true).pop();
    }
  }
}

class _TranslationDialog extends StatelessWidget {
  const _TranslationDialog();

  @override
  Widget build(BuildContext context) {
    final colors = Theme.of(context).appColors;
    final localeProvider = context.watch<LocaleProvider>();
    final text = localeProvider.t('translating') ?? 'Перевод интерфейса...';

    return PopScope(
      canPop: false,
      child: Center(
        child: TweenAnimationBuilder<double>(
          tween: Tween(begin: 0.0, end: 1.0),
          duration: const Duration(milliseconds: 300),
          builder: (context, val, child) {
            return Transform.scale(
              scale: 0.9 + (0.1 * val),
              child: Opacity(
                opacity: val,
                child: child,
              ),
            );
          },
          child: Container(
            margin: const EdgeInsets.symmetric(horizontal: 40),
            padding: const EdgeInsets.all(24),
            decoration: BoxDecoration(
              color: colors.card,
              borderRadius: BorderRadius.circular(24),
              border: Border.all(color: colors.border),
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withValues(alpha: 0.5),
                  blurRadius: 30,
                  spreadRadius: 5,
                )
              ],
            ),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                SizedBox(
                  width: 40,
                  height: 40,
                  child: CircularProgressIndicator(
                    color: Theme.of(context).primaryColor,
                    strokeWidth: 3,
                  ),
                ),
                const SizedBox(height: 20),
                Text(
                  text,
                  style: GoogleFonts.inter(
                    color: colors.foreground,
                    fontSize: 16,
                    fontWeight: FontWeight.w500,
                  ),
                  textAlign: TextAlign.center,
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
