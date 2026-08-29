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
            duration: const Duration(milliseconds: 400),
            curve: Curves.easeOutBack,
            builder: (context, val, child) {
              return Transform.scale(
                scale: 0.9 + (0.1 * val),
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
                color: colors.card.withValues(alpha: 0.7),
                borderRadius: BorderRadius.circular(32),
                border: Border.all(color: colors.border.withValues(alpha: 0.5)),
                boxShadow: [
                  BoxShadow(
                    color: colors.primary.withValues(alpha: 0.15),
                    blurRadius: 40,
                    spreadRadius: 10,
                  )
                ],
              ),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  _AnimatedTranslationIcon(color: Theme.of(context).primaryColor),
                  const SizedBox(height: 24),
                  _PulsingText(
                    text: text,
                    style: GoogleFonts.inter(
                      color: colors.foreground,
                      fontSize: 16,
                      fontWeight: FontWeight.w600,
                    ),
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

class _AnimatedTranslationIcon extends StatefulWidget {
  final Color color;
  const _AnimatedTranslationIcon({required this.color});

  @override
  State<_AnimatedTranslationIcon> createState() => _AnimatedTranslationIconState();
}

class _AnimatedTranslationIconState extends State<_AnimatedTranslationIcon> with SingleTickerProviderStateMixin {
  late AnimationController _controller;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(vsync: this, duration: const Duration(milliseconds: 2500))..repeat();
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: _controller,
      builder: (context, child) {
        final val = _controller.value;
        final pulse = 0.5 - (val - 0.5).abs(); // 0 -> 0.5 -> 0
        
        return Stack(
          alignment: Alignment.center,
          children: [
            // Outer rotating ring (clockwise)
            Transform.rotate(
              angle: val * 2 * 3.14159,
              child: SizedBox(
                width: 72,
                height: 72,
                child: CircularProgressIndicator(
                  value: 0.3,
                  strokeWidth: 2,
                  strokeCap: StrokeCap.round,
                  color: widget.color.withValues(alpha: 0.3),
                  backgroundColor: Colors.transparent,
                ),
              ),
            ),
            // Inner rotating ring (counter-clockwise)
            Transform.rotate(
              angle: -val * 2 * 3.14159 * 1.5,
              child: SizedBox(
                width: 56,
                height: 56,
                child: CircularProgressIndicator(
                  value: 0.4,
                  strokeWidth: 3,
                  strokeCap: StrokeCap.round,
                  color: widget.color,
                  backgroundColor: Colors.transparent,
                ),
              ),
            ),
            // Pulsing center icon
            Transform.scale(
              scale: 0.85 + (pulse * 0.4),
              child: Icon(
                LucideIcons.languages,
                size: 28,
                color: widget.color.withValues(alpha: 0.8 + (pulse * 0.4)),
              ),
            ),
          ],
        );
      },
    );
  }
}

class _PulsingText extends StatefulWidget {
  final String text;
  final TextStyle style;
  
  const _PulsingText({required this.text, required this.style});

  @override
  State<_PulsingText> createState() => _PulsingTextState();
}

class _PulsingTextState extends State<_PulsingText> with SingleTickerProviderStateMixin {
  late AnimationController _controller;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(vsync: this, duration: const Duration(milliseconds: 1500))..repeat(reverse: true);
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: _controller,
      builder: (context, child) {
        return Opacity(
          opacity: 0.6 + (_controller.value * 0.4),
          child: Text(
            widget.text,
            style: widget.style,
            textAlign: TextAlign.center,
          ),
        );
      },
    );
  }
}
