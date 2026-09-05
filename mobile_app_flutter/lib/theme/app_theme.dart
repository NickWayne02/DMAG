import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import '../providers/theme_provider.dart';

class AppColors extends ThemeExtension<AppColors> {
  final Color background;
  final Color foreground;
  final Color card;
  final Color cardForeground;
  final Color primary;
  final Color primaryForeground;
  final Color muted;
  final Color border;

  // Neon specics
  final Color cyan;
  final Color magenta;
  final Color violet;

  const AppColors({
    required this.background,
    required this.foreground,
    required this.card,
    required this.cardForeground,
    required this.primary,
    required this.primaryForeground,
    required this.muted,
    required this.border,
    required this.cyan,
    required this.magenta,
    required this.violet,
  });

  @override
  AppColors copyWith({
    Color? background,
    Color? foreground,
    Color? card,
    Color? cardForeground,
    Color? primary,
    Color? primaryForeground,
    Color? muted,
    Color? border,
    Color? cyan,
    Color? magenta,
    Color? violet,
  }) {
    return AppColors(
      background: background ?? this.background,
      foreground: foreground ?? this.foreground,
      card: card ?? this.card,
      cardForeground: cardForeground ?? this.cardForeground,
      primary: primary ?? this.primary,
      primaryForeground: primaryForeground ?? this.primaryForeground,
      muted: muted ?? this.muted,
      border: border ?? this.border,
      cyan: cyan ?? this.cyan,
      magenta: magenta ?? this.magenta,
      violet: violet ?? this.violet,
    );
  }

  @override
  AppColors lerp(ThemeExtension<AppColors>? other, double t) {
    if (other is! AppColors) return this;
    return AppColors(
      background: Color.lerp(background, other.background, t)!,
      foreground: Color.lerp(foreground, other.foreground, t)!,
      card: Color.lerp(card, other.card, t)!,
      cardForeground: Color.lerp(cardForeground, other.cardForeground, t)!,
      primary: Color.lerp(primary, other.primary, t)!,
      primaryForeground: Color.lerp(primaryForeground, other.primaryForeground, t)!,
      muted: Color.lerp(muted, other.muted, t)!,
      border: Color.lerp(border, other.border, t)!,
      cyan: Color.lerp(cyan, other.cyan, t)!,
      magenta: Color.lerp(magenta, other.magenta, t)!,
      violet: Color.lerp(violet, other.violet, t)!,
    );
  }
}

class AppTheme {
  // Base colors mapping React's THEME_BASE_COLORS
  static const _lightBase = AppColors(
    background: Color(0xFFf8fafc),
    foreground: Color(0xFF0f172a),
    card: Color(0xFFffffff),
    cardForeground: Color(0xFF0f172a),
    primary: Color(0xFF0D47A1),
    primaryForeground: Color(0xFFffffff),
    muted: Color(0xFFf1f5f9),
    border: Color(0xFFe2e8f0),
    cyan: Colors.transparent,
    magenta: Colors.transparent,
    violet: Colors.transparent,
  );

  static const _darkBase = AppColors(
    background: Color(0xFF09090b),
    foreground: Color(0xFFfafafa),
    card: Color(0xFF18181b),
    cardForeground: Color(0xFFfafafa),
    primary: Color(0xFF3b82f6),
    primaryForeground: Color(0xFFffffff),
    muted: Color(0xFF27272a),
    border: Color(0xFF3f3f46),
    cyan: Colors.transparent,
    magenta: Colors.transparent,
    violet: Colors.transparent,
  );

  static const _neonBase = AppColors(
    background: Color(0xFF000000),
    foreground: Color(0xFFffffff),
    card: Color(0xFF000000), // Card is black in neon
    cardForeground: Color(0xFFffffff),
    primary: Color(0xFF10b981),
    primaryForeground: Color(0xFF000000),
    muted: Color(0xFF111111),
    border: Color(0xFF222222),
    cyan: Colors.transparent,
    magenta: Colors.transparent,
    violet: Colors.transparent,
  );

  static ThemeData getTheme(ThemeProvider provider) {
    AppColors base;
    switch (provider.mode) {
      case ThemeModeType.light:
        base = _lightBase;
        break;
      case ThemeModeType.dark:
        base = _darkBase;
        break;
      case ThemeModeType.neon:
        base = _neonBase;
        break;
      case ThemeModeType.custom:
        base = _lightBase; // Custom builds off light for now
        break;
    }

    final activePrimary = provider.activePrimaryColor;
    
    // Mix colors slightly with primary for cohesive tinting (simulating color-mix)
    Color tint(Color source, double factor) {
      if (provider.mode == ThemeModeType.custom) return source;
      return Color.alphaBlend(activePrimary.withValues(alpha: 1 - factor), source);
    }

    final mixBg = tint(base.background, 0.96);
    final mixCard = tint(base.card, 0.95);
    final mixMuted = tint(base.muted, 0.90);
    final mixBorder = tint(base.border, 0.80);

    final isCustom = provider.mode == ThemeModeType.custom;
    
    final resolvedColors = AppColors(
      background: isCustom ? (provider.customColors['background'] ?? base.background) : mixBg,
      foreground: isCustom ? (provider.customColors['foreground'] ?? base.foreground) : base.foreground,
      card: isCustom ? (provider.customColors['card'] ?? base.card) : mixCard,
      cardForeground: isCustom ? (provider.customColors['cardForeground'] ?? base.cardForeground) : base.cardForeground,
      primary: isCustom ? (provider.customColors['primary'] ?? activePrimary) : activePrimary,
      primaryForeground: isCustom ? (provider.customColors['primaryForeground'] ?? base.primaryForeground) : base.primaryForeground,
      muted: isCustom ? (provider.customColors['muted'] ?? base.muted) : mixMuted,
      border: isCustom ? (provider.customColors['border'] ?? base.border) : mixBorder,
      cyan: provider.customColors['primary'] ?? provider.activeAccent.cyan,
      magenta: provider.activeAccent.magenta,
      violet: provider.activeAccent.violet,
    );

    return ThemeData(
      brightness: (provider.mode == ThemeModeType.light) ? Brightness.light : Brightness.dark,
      scaffoldBackgroundColor: resolvedColors.background,
      primaryColor: resolvedColors.primary,
      textTheme: GoogleFonts.interTextTheme().apply(
        bodyColor: resolvedColors.foreground,
        displayColor: resolvedColors.foreground,
      ),
      cardColor: resolvedColors.card,
      appBarTheme: AppBarTheme(
        backgroundColor: resolvedColors.background,
        elevation: 0,
        iconTheme: IconThemeData(color: resolvedColors.foreground),
        titleTextStyle: GoogleFonts.inter(color: resolvedColors.foreground, fontSize: 18, fontWeight: FontWeight.bold),
      ),
      textSelectionTheme: TextSelectionThemeData(
        cursorColor: resolvedColors.primary,
        selectionColor: resolvedColors.primary.withValues(alpha: 0.3),
        selectionHandleColor: resolvedColors.primary,
      ),
      extensions: [resolvedColors],
    );
  }

  // Legacy static fallbacks for old code until fully migrated
  static const Color neonCyan = Color(0xFF06b6d4);
  
  static List<BoxShadow> glow(Color color) {
    return [
      BoxShadow(
        color: color.withValues(alpha: 0.5),
        blurRadius: 15,
        spreadRadius: 2,
        offset: const Offset(0, 0),
      ),
    ];
  }
}

extension AppThemeExtension on ThemeData {
  AppColors get appColors => extension<AppColors>()!;
}
