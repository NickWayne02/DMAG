import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';
import '../providers/theme_provider.dart';
import 'app_theme.dart';

class NeonCard extends StatelessWidget {
  final Widget child;
  final Color? glowColor;
  final EdgeInsetsGeometry padding;

  const NeonCard({
    super.key,
    required this.child,
    this.glowColor,
    this.padding = const EdgeInsets.all(16),
  });

  @override
  Widget build(BuildContext context) {
    final colors = Theme.of(context).appColors;
    final borderColor = glowColor ?? colors.border;
    final radius = context.watch<ThemeProvider>().borderRadius;
    return Container(
      padding: padding,
      decoration: BoxDecoration(
        color: colors.card,
        borderRadius: BorderRadius.circular(radius),
        border: Border.all(color: borderColor),
        boxShadow: glowColor != null
            ? [
                BoxShadow(
                  color: glowColor!.withValues(alpha: 0.1),
                  blurRadius: 10,
                  spreadRadius: 1,
                )
              ]
            : [],
      ),
      child: child,
    );
  }
}

class NeonIcon extends StatelessWidget {
  final Widget icon;
  final Color color;
  final Color glowColor;

  const NeonIcon({
    super.key,
    required this.icon,
    required this.color,
    required this.glowColor,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(8),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.15),
        shape: BoxShape.circle,
        border: Border.all(color: color.withValues(alpha: 0.3)),
        boxShadow: [
          BoxShadow(
            color: glowColor.withValues(alpha: 0.3),
            blurRadius: 8,
            spreadRadius: 1,
          )
        ],
      ),
      child: IconTheme(
        data: IconThemeData(color: color, size: 20),
        child: icon,
      ),
    );
  }
}

class MetricWidget extends StatelessWidget {
  final String label;
  final String value;
  final Color color;

  const MetricWidget({
    super.key,
    required this.label,
    required this.value,
    required this.color,
  });

  @override
  Widget build(BuildContext context) {
    final radius = context.watch<ThemeProvider>().borderRadius;
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(radius),
        border: Border.all(color: color.withValues(alpha: 0.2)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            label,
            style: GoogleFonts.inter(
              color: Colors.white70,
              fontSize: 10,
              fontWeight: FontWeight.w600,
              letterSpacing: 0.5,
            ),
          ),
          const SizedBox(height: 4),
          Text(
            value,
            style: GoogleFonts.inter(
              color: color,
              fontSize: 14,
              fontWeight: FontWeight.bold,
              shadows: [
                Shadow(
                  color: color.withValues(alpha: 0.5),
                  blurRadius: 4,
                )
              ],
            ),
          ),
        ],
      ),
    );
  }
}
