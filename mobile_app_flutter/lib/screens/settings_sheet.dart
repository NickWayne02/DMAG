import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:flutter_lucide/flutter_lucide.dart';
import 'package:provider/provider.dart';
import '../providers/theme_provider.dart';
import '../providers/locale_provider.dart';
import '../theme/app_theme.dart';
import '../widgets/bounce_button.dart';
import 'language_sheet.dart';

class SettingsSheet extends StatefulWidget {
  const SettingsSheet({super.key});

  static Future<void> show(BuildContext context) {
    return showGeneralDialog(
      context: context,
      barrierDismissible: true,
      barrierLabel: 'Settings',
      barrierColor: Colors.black.withValues(alpha: 0.7), // Darker background to compensate for removed blur
      transitionDuration: const Duration(milliseconds: 250),
      pageBuilder: (context, animation, secondaryAnimation) {
        return const Align(
          alignment: Alignment.center,
          child: Material(
            color: Colors.transparent,
            child: SettingsSheet(),
          ),
        );
      },
      transitionBuilder: (context, animation, secondaryAnimation, child) {
        final scaleValue = CurvedAnimation(
          parent: animation,
          curve: Curves.easeOutCubic,
        ).value;
        
        return FadeTransition(
          opacity: animation,
          child: Transform.scale(
            scale: 0.90 + (0.10 * scaleValue), // Scales from 90% to 100%
            alignment: Alignment.center,
            child: child,
          ),
        );
      },
    );
  }

  @override
  State<SettingsSheet> createState() => _SettingsSheetState();
}

class _SettingsSheetState extends State<SettingsSheet> {
  final TextEditingController _hexController = TextEditingController();

  @override
  void initState() {
    super.initState();
    final tp = context.read<ThemeProvider>();
    if (tp.customAccent != null) {
      _hexController.text = '#${tp.customAccent!.toARGB32().toRadixString(16).padLeft(8, '0').substring(2).toUpperCase()}';
    } else {
      _hexController.text = '#${tp.activeAccent.primary.toARGB32().toRadixString(16).padLeft(8, '0').substring(2).toUpperCase()}';
    }
  }

  @override
  void dispose() {
    _hexController.dispose();
    super.dispose();
  }

  void _onHexChanged(String value, ThemeProvider provider) {
    String hex = value.replaceAll('#', '');
    if (hex.length == 6) {
      try {
        Color c = Color(int.parse('FF$hex', radix: 16));
        provider.setCustomAccent(c);
      } catch (e) {
        // invalid hex
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final themeProvider = context.watch<ThemeProvider>();
    final colors = Theme.of(context).appColors;
    final primary = Theme.of(context).primaryColor;
    
    // Update text field if not focused and color changed externally
    if (themeProvider.customAccent != null && !FocusScope.of(context).hasFocus) {
      _hexController.text = '#${themeProvider.customAccent!.toARGB32().toRadixString(16).padLeft(8, '0').substring(2).toUpperCase()}';
    } else if (themeProvider.customAccent == null && !FocusScope.of(context).hasFocus) {
      _hexController.text = '#${themeProvider.activeAccent.primary.toARGB32().toRadixString(16).padLeft(8, '0').substring(2).toUpperCase()}';
    }

    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 24),
      constraints: BoxConstraints(
        maxHeight: MediaQuery.of(context).size.height * 0.9,
      ),
      decoration: BoxDecoration(
        color: Theme.of(context).cardColor,
        borderRadius: BorderRadius.circular(24),
        border: Border.all(color: colors.border),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          // Header
          Padding(
            padding: const EdgeInsets.fromLTRB(24, 24, 24, 16),
            child: Row(
              children: [
                Icon(LucideIcons.settings, color: colors.foreground),
                const SizedBox(width: 12),
                Text(
                  context.read<LocaleProvider>().t('settings.title'),
                  style: GoogleFonts.inter(
                    fontSize: 20,
                    fontWeight: FontWeight.bold,
                    color: colors.foreground,
                  ),
                ),
                const Spacer(),
                IconButton(
                  icon: Icon(LucideIcons.x, color: colors.foreground.withValues(alpha: 0.5)),
                  onPressed: () => Navigator.pop(context),
                )
              ],
            ),
          ),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 24),
            child: Text(
              context.read<LocaleProvider>().t('settings.subtitle'),
              style: GoogleFonts.inter(
                color: colors.foreground.withValues(alpha: 0.5),
                fontSize: 14,
              ),
            ),
          ),
          const SizedBox(height: 24),

          Expanded(
            child: SingleChildScrollView(
              padding: const EdgeInsets.symmetric(horizontal: 24),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Language Row
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        context.read<LocaleProvider>().t('settings.language'),
                        style: GoogleFonts.inter(
                          color: colors.foreground,
                          fontSize: 16,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                      BounceButton(
                        onTap: () {
                          LanguageSheet.show(context);
                        },
                        child: Row(
                          children: [
                            Icon(LucideIcons.globe, color: colors.foreground, size: 16),
                            const SizedBox(width: 8),
                            Text(
                              context.watch<LocaleProvider>().currentLanguage['flag'] ?? '',
                              style: const TextStyle(fontSize: 14),
                            ),
                            const SizedBox(width: 8),
                            Text(
                              context.watch<LocaleProvider>().currentLang.toUpperCase(),
                              style: GoogleFonts.inter(
                                color: colors.foreground,
                                fontWeight: FontWeight.bold,
                              ),
                            )
                          ],
                        ),
                      )
                    ],
                  ),
                  const SizedBox(height: 8),
                  Text(
                    context.read<LocaleProvider>().t('settings.languageHint'),
                    style: GoogleFonts.inter(color: colors.foreground.withValues(alpha: 0.5), fontSize: 12),
                  ),
                  
                  Padding(
                    padding: const EdgeInsets.symmetric(vertical: 24),
                    child: Divider(color: colors.border),
                  ),
                  
                  // Theme Section
                  Row(
                    children: [
                      Icon(LucideIcons.palette, color: colors.foreground, size: 18),
                      const SizedBox(width: 8),
                      Text(context.read<LocaleProvider>().t('settings.theme'), style: GoogleFonts.inter(color: colors.foreground, fontSize: 16, fontWeight: FontWeight.bold)),
                    ],
                  ),
                  const SizedBox(height: 16),
                  Row(
                    children: [
                      Expanded(child: _buildModeOption(context, themeProvider, LucideIcons.sun, context.read<LocaleProvider>().t('settings.theme.light'), ThemeModeType.light)),
                      const SizedBox(width: 8),
                      Expanded(child: _buildModeOption(context, themeProvider, LucideIcons.moon, context.read<LocaleProvider>().t('settings.theme.dark'), ThemeModeType.dark)),
                      const SizedBox(width: 8),
                      Expanded(child: _buildModeOption(context, themeProvider, LucideIcons.zap, context.read<LocaleProvider>().t('settings.theme.neon'), ThemeModeType.neon)),
                      const SizedBox(width: 8),
                      Expanded(child: _buildModeOption(context, themeProvider, LucideIcons.sliders_horizontal, context.read<LocaleProvider>().t('settings.theme.custom'), ThemeModeType.custom)),
                    ],
                  ),

                  Padding(
                    padding: const EdgeInsets.symmetric(vertical: 24),
                    child: Divider(color: colors.border),
                  ),

                  // Color Theme Section
                  Row(
                    children: [
                      Icon(LucideIcons.paint_bucket, color: colors.foreground, size: 18),
                      const SizedBox(width: 8),
                      Text(context.read<LocaleProvider>().t('settings.accent'), style: GoogleFonts.inter(color: colors.foreground, fontSize: 16, fontWeight: FontWeight.bold)),
                    ],
                  ),
                  const SizedBox(height: 16),
                  GridView.count(
                    shrinkWrap: true,
                    physics: const NeverScrollableScrollPhysics(),
                    crossAxisCount: 3,
                    crossAxisSpacing: 12,
                    mainAxisSpacing: 12,
                    childAspectRatio: 2,
                    children: ThemeProvider.presets.map((preset) => _buildColorBox(context, themeProvider, preset)).toList(),
                  ),
                  const SizedBox(height: 12),

                  // Hex Input Box
                  Container(
                    height: 48,
                    decoration: BoxDecoration(
                      border: Border.all(color: colors.border),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    padding: const EdgeInsets.symmetric(horizontal: 16),
                    child: Row(
                      children: [
                        Container(
                          width: 32,
                          height: 24,
                          decoration: BoxDecoration(
                            color: primary,
                            borderRadius: BorderRadius.circular(4),
                          ),
                        ),
                        const SizedBox(width: 16),
                        Expanded(
                          child: TextField(
                            controller: _hexController,
                            style: GoogleFonts.inter(color: colors.foreground, fontSize: 16),
                            decoration: const InputDecoration(
                              border: InputBorder.none,
                              isDense: true,
                            ),
                            onChanged: (val) => _onHexChanged(val, themeProvider),
                          ),
                        ),
                      ],
                    ),
                  ),

                  Padding(
                    padding: const EdgeInsets.symmetric(vertical: 24),
                    child: Divider(color: colors.border),
                  ),

                  // Button Style
                  Row(
                    children: [
                      Icon(LucideIcons.type, color: colors.foreground, size: 18),
                      const SizedBox(width: 8),
                      Text(context.watch<LocaleProvider>().t('settings.button_style') ?? 'Стиль кнопок', style: GoogleFonts.inter(color: colors.foreground, fontSize: 16, fontWeight: FontWeight.bold)),
                    ],
                  ),
                  const SizedBox(height: 16),
                  Row(
                    children: [
                      Expanded(
                        child: _buildButtonStyleOption(context, themeProvider, ButtonStyleType.filled, context.watch<LocaleProvider>().t('settings.colored_bg') ?? 'Цветной фон'),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: _buildButtonStyleOption(context, themeProvider, ButtonStyleType.outlined, context.watch<LocaleProvider>().t('settings.colored_text') ?? 'Цветной текст'),
                      ),
                    ],
                  ),

                  const SizedBox(height: 32),
                  
                  // Sliders
                  _buildSliderRow(
                    context: context,
                    provider: themeProvider,
                    label: context.read<LocaleProvider>().t('settings.scale'),
                    left: '85%',
                    middle: '${(themeProvider.textSizeScale * 100).toInt()}%',
                    right: '125%',
                    value: themeProvider.textSizeScale,
                    min: 0.85,
                    max: 1.25,
                    onChanged: (val) => themeProvider.setTextSizeScale(val),
                  ),
                  const SizedBox(height: 24),
                  _buildSliderRow(
                    context: context,
                    provider: themeProvider,
                    label: context.read<LocaleProvider>().t('settings.radius'),
                    left: context.read<LocaleProvider>().t('settings.radiusSharp'),
                    middle: '${(themeProvider.borderRadius / 16).toStringAsFixed(2)}rem',
                    right: context.read<LocaleProvider>().t('settings.radiusRound'),
                    value: themeProvider.borderRadius,
                    min: 0.0,
                    max: 32.0,
                    onChanged: (val) => themeProvider.setBorderRadius(val),
                  ),

                  const SizedBox(height: 32),

                  // Action Buttons
                  BounceButton(
                    onTap: () {
                      Navigator.pop(context);
                    },
                    child: Container(
                      width: double.infinity,
                      height: 52,
                      decoration: BoxDecoration(
                        color: primary,
                        borderRadius: BorderRadius.circular(16),
                      ),
                      alignment: Alignment.center,
                      child: Text(context.read<LocaleProvider>().t('settings.done'), style: GoogleFonts.inter(color: colors.primaryForeground, fontWeight: FontWeight.w600)),
                    ),
                  ),
                  const SizedBox(height: 12),
                  BounceButton(
                    onTap: () {
                      themeProvider.setMode(ThemeModeType.light);
                      themeProvider.setAccentId('dmag');
                      themeProvider.setCustomAccent(null);
                      themeProvider.setButtonStyle(ButtonStyleType.filled);
                      themeProvider.setTextSizeScale(1.0);
                      themeProvider.setBorderRadius(14.0);
                    },
                    child: Container(
                      width: double.infinity,
                      height: 52,
                      decoration: BoxDecoration(
                        border: Border.all(color: colors.border),
                        borderRadius: BorderRadius.circular(16),
                      ),
                      alignment: Alignment.center,
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Icon(LucideIcons.rotate_ccw, color: colors.foreground, size: 16),
                          const SizedBox(width: 8),
                          Text(context.read<LocaleProvider>().t('settings.reset'), style: GoogleFonts.inter(color: colors.foreground, fontWeight: FontWeight.bold)),
                        ],
                      ),
                    ),
                  ),
                  const SizedBox(height: 32),
                ],
              ),
            ),
          )
        ],
      ),
    );
  }

  Widget _buildModeOption(BuildContext context, ThemeProvider provider, IconData icon, String label, ThemeModeType mode) {
    final active = provider.mode == mode;
    final primary = Theme.of(context).primaryColor;
    final colors = Theme.of(context).appColors;

    return BounceButton(
      onTap: () => provider.setMode(mode),
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 12),
        decoration: BoxDecoration(
          color: active ? primary.withValues(alpha: 0.1) : Colors.transparent,
          border: Border.all(color: active ? primary : colors.border),
          borderRadius: BorderRadius.circular(12),
        ),
        child: Column(
          children: [
            Icon(icon, color: active ? primary : colors.foreground.withValues(alpha: 0.5), size: 20),
            const SizedBox(height: 8),
            Text(
              label,
              style: GoogleFonts.inter(
                color: active ? primary : colors.foreground.withValues(alpha: 0.5),
                fontSize: 10,
                fontWeight: active ? FontWeight.bold : FontWeight.normal,
              ),
            )
          ],
        ),
      ),
    );
  }

  Widget _buildColorBox(BuildContext context, ThemeProvider provider, AccentPreset preset) {
    final active = provider.accentId == preset.id && provider.customAccent == null;

    return BounceButton(
      onTap: () {
        provider.setCustomAccent(null);
        provider.setAccentId(preset.id);
      },
      child: Container(
        decoration: BoxDecoration(
          gradient: LinearGradient(
            colors: [preset.violet, preset.primary, preset.cyan],
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
          ),
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: active ? Colors.white : Colors.transparent, width: 2),
        ),
        padding: const EdgeInsets.all(8),
        child: Stack(
          children: [
            Align(
              alignment: Alignment.bottomLeft,
              child: Text(
                preset.label,
                style: GoogleFonts.inter(
                  color: Colors.white,
                  fontSize: 10,
                  fontWeight: FontWeight.bold,
                  shadows: [const Shadow(color: Colors.black54, blurRadius: 2)],
                ),
              ),
            ),
            if (active)
              const Align(
                alignment: Alignment.topRight,
                child: Icon(LucideIcons.check, color: Colors.white, size: 14),
              )
          ],
        ),
      ),
    );
  }

  Widget _buildButtonStyleOption(BuildContext context, ThemeProvider provider, ButtonStyleType style, String label) {
    final active = provider.buttonStyle == style;
    final primary = Theme.of(context).primaryColor;
    final colors = Theme.of(context).appColors;

    return BounceButton(
      onTap: () => provider.setButtonStyle(style),
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 16),
        decoration: BoxDecoration(
          color: active ? primary : Colors.transparent,
          border: Border.all(color: active ? Colors.transparent : colors.border),
          borderRadius: BorderRadius.circular(16),
        ),
        alignment: Alignment.center,
        child: Text(
          label, 
          style: GoogleFonts.inter(
            color: active ? Colors.white : colors.foreground, 
            fontWeight: active ? FontWeight.bold : FontWeight.normal
          )
        ),
      ),
    );
  }

  Widget _buildSliderRow({
    required BuildContext context,
    required ThemeProvider provider,
    required String label,
    required String left,
    required String middle,
    required String right,
    required double value,
    required double min,
    required double max,
    required ValueChanged<double> onChanged,
  }) {
    final colors = Theme.of(context).appColors;
    final primary = Theme.of(context).primaryColor;

    return Column(
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Row(
              children: [
                Icon(label.contains(context.read<LocaleProvider>().t('settings.size_match') ?? 'Размер') ? LucideIcons.type : LucideIcons.ruler, color: colors.foreground, size: 18),
                const SizedBox(width: 8),
                Text(label, style: GoogleFonts.inter(color: colors.foreground, fontSize: 16, fontWeight: FontWeight.bold)),
              ],
            ),
            Text(middle, style: GoogleFonts.inter(color: colors.foreground.withValues(alpha: 0.5), fontSize: 14)),
          ],
        ),
        const SizedBox(height: 16),
        SliderTheme(
          data: SliderThemeData(
            trackHeight: 6,
            activeTrackColor: primary,
            inactiveTrackColor: colors.border,
            thumbColor: Colors.white,
            overlayColor: primary.withValues(alpha: 0.2),
          ),
          child: Slider(
            value: value,
            min: min,
            max: max,
            onChanged: onChanged,
          ),
        ),
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text(left, style: GoogleFonts.inter(color: colors.foreground.withValues(alpha: 0.5), fontSize: 10)),
            Text(right, style: GoogleFonts.inter(color: colors.foreground.withValues(alpha: 0.5), fontSize: 10)),
          ],
        )
      ],
    );
  }
}
