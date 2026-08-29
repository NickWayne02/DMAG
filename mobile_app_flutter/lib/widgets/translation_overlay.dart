import 'dart:ui';
import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';
import 'package:flutter_lucide/flutter_lucide.dart';
import '../providers/locale_provider.dart';
import '../theme/app_theme.dart';

class TranslationOverlay {
  static Future<void> show(BuildContext context, Future<void> Function() action) async {
    final nav = Navigator.of(context, rootNavigator: true);
    
    showDialog(
      context: context,
      barrierDismissible: false,
      barrierColor: Colors.black.withValues(alpha: 0.2), // Lighter barrier because of blur
      builder: (ctx) => const _TranslationDialog(),
    );

    await Future.delayed(const Duration(milliseconds: 100));
    try {
      await action();
    } finally {
      await Future.delayed(const Duration(milliseconds: 200));
      nav.pop();
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
      child: BackdropFilter(
        filter: ImageFilter.blur(sigmaX: 12, sigmaY: 12),
        child: Center(
          child: TweenAnimationBuilder<double>(
            tween: Tween(begin: 0.0, end: 1.0),
            duration: const Duration(milliseconds: 300),
            curve: Curves.easeOutCubic, // Safe curve, no bounce/overshoot
            builder: (context, val, child) {
              return Transform.scale(
                scale: 0.95 + (0.05 * val),
                child: Opacity(
                  opacity: val.clamp(0.0, 1.0),
                  child: child,
                ),
              );
            },
            child: Container(
              margin: const EdgeInsets.symmetric(horizontal: 40),
              padding: const EdgeInsets.symmetric(vertical: 32, horizontal: 24),
              decoration: BoxDecoration(
                color: colors.card.withValues(alpha: 0.8),
                borderRadius: BorderRadius.circular(28),
                border: Border.all(color: colors.border.withValues(alpha: 0.5)),
                boxShadow: [
                  BoxShadow(
                    color: colors.primary.withValues(alpha: 0.1),
                    blurRadius: 30,
                    spreadRadius: 5,
                  )
                ],
              ),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Stack(
                    alignment: Alignment.center,
                    children: [
                      SizedBox(
                        width: 50,
                        height: 50,
                        child: CircularProgressIndicator(
                          strokeWidth: 2,
                          color: Theme.of(context).primaryColor,
                        ),
                      ),
                      Icon(
                        LucideIcons.languages,
                        size: 24,
                        color: Theme.of(context).primaryColor,
                      ),
                    ],
                  ),
                  const SizedBox(height: 24),
                  Text(
                    text,
                    style: GoogleFonts.inter(
                      color: colors.foreground,
                      fontSize: 15,
                      fontWeight: FontWeight.w500,
                    ),
                    textAlign: TextAlign.center,
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}
