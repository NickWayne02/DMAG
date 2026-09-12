import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:flutter_lucide/flutter_lucide.dart';
import 'package:provider/provider.dart';
import '../providers/theme_provider.dart';
import '../providers/locale_provider.dart';
import '../theme/app_theme.dart';
import '../widgets/bounce_button.dart';
import 'language_sheet.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../providers/translation_provider.dart';
import 'package:flutter_colorpicker/flutter_colorpicker.dart';

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
  final TextEditingController _nameController = TextEditingController();
  bool _editingName = false;
  bool _isUpdatingName = false;

  @override
  void initState() {
    super.initState();
    final tp = context.read<ThemeProvider>();
    if (tp.customColors['primary'] != null) {
      _hexController.text = '#${tp.customColors['primary']!.toARGB32().toRadixString(16).padLeft(8, '0').substring(2).toUpperCase()}';
    } else {
      _hexController.text = '#${tp.activeAccent.primary.toARGB32().toRadixString(16).padLeft(8, '0').substring(2).toUpperCase()}';
    }
    
    final user = Supabase.instance.client.auth.currentUser;
    if (user != null) {
      _nameController.text = user.userMetadata?['full_name'] ?? '';
    }
  }

  Future<void> _updateName() async {
    final newName = _nameController.text.trim();
    if (newName.isEmpty) return;
    setState(() => _isUpdatingName = true);

    try {
      final user = Supabase.instance.client.auth.currentUser;
      if (user == null) return;

      await Supabase.instance.client.auth.updateUser(
        UserAttributes(data: {'full_name': newName}),
      );

      await Supabase.instance.client
          .from('profiles')
          .update({'full_name': newName})
          .eq('id', user.id);

      if (mounted) {
        setState(() => _editingName = false);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(context.read<LocaleProvider>().t('settings.nameUpdated') ?? 'Имя обновлено')),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(context.read<LocaleProvider>().t('settings.nameUpdateFailed') ?? 'Ошибка обновления имени')),
        );
      }
    } finally {
      if (mounted) setState(() => _isUpdatingName = false);
    }
  }

  @override
  void dispose() {
    _hexController.dispose();
    _nameController.dispose();
    super.dispose();
  }

  void _onHexChanged(String value, ThemeProvider provider) {
    String hex = value.replaceAll('#', '');
    if (hex.length == 6) {
      try {
        Color c = Color(int.parse('FF$hex', radix: 16));
        provider.setCustomColor('primary', c);
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
    if (themeProvider.customColors['primary'] != null && !FocusScope.of(context).hasFocus) {
      _hexController.text = '#${themeProvider.customColors['primary']!.toARGB32().toRadixString(16).padLeft(8, '0').substring(2).toUpperCase()}';
    } else if (themeProvider.customColors['primary'] == null && !FocusScope.of(context).hasFocus) {
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
                  context.read<LocaleProvider>().t('settings.title') ?? 'Настройки',
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
              context.read<LocaleProvider>().t('settings.subtitle') ?? 'Управление внешним видом',
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
                  // Name Edit Row
                  if (Supabase.instance.client.auth.currentUser != null) ...[
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text(
                          context.read<LocaleProvider>().t('auth.fullName') ?? 'ФИО',
                          style: GoogleFonts.inter(
                            color: colors.foreground,
                            fontSize: 16,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 12),
                    _editingName
                        ? Row(
                            children: [
                              Expanded(
                                child: TextField(
                                  controller: _nameController,
                                  style: GoogleFonts.inter(color: colors.foreground),
                                  decoration: InputDecoration(
                                    hintText: context.read<LocaleProvider>().t('auth.fullNamePh') ?? 'Иван Иванов',
                                    hintStyle: GoogleFonts.inter(color: colors.foreground.withValues(alpha: 0.5)),
                                    filled: true,
                                    fillColor: colors.foreground.withValues(alpha: 0.05),
                                    contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                                    border: OutlineInputBorder(
                                      borderRadius: BorderRadius.circular(12),
                                      borderSide: BorderSide.none,
                                    ),
                                  ),
                                ),
                              ),
                              const SizedBox(width: 8),
                              BounceButton(
                                onTap: _isUpdatingName ? null : () => setState(() => _editingName = false),
                                child: Container(
                                  padding: const EdgeInsets.all(12),
                                  decoration: BoxDecoration(
                                    color: colors.foreground.withValues(alpha: 0.05),
                                    borderRadius: BorderRadius.circular(12),
                                  ),
                                  child: Icon(LucideIcons.x, color: colors.foreground, size: 20),
                                ),
                              ),
                              const SizedBox(width: 8),
                              BounceButton(
                                onTap: (_isUpdatingName || _nameController.text.trim().isEmpty) ? null : _updateName,
                                child: Container(
                                  padding: const EdgeInsets.all(12),
                                  decoration: BoxDecoration(
                                    color: primary,
                                    borderRadius: BorderRadius.circular(12),
                                  ),
                                  child: _isUpdatingName 
                                    ? SizedBox(width: 20, height: 20, child: CircularProgressIndicator(color: colors.background, strokeWidth: 2))
                                    : Icon(LucideIcons.check, color: colors.background, size: 20),
                                ),
                              ),
                            ],
                          )
                        : Container(
                            padding: const EdgeInsets.all(12),
                            decoration: BoxDecoration(
                              color: colors.foreground.withValues(alpha: 0.05),
                              borderRadius: BorderRadius.circular(12),
                              border: Border.all(color: colors.border),
                            ),
                            child: Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                Text(
                                  _nameController.text.isNotEmpty ? context.read<TranslationProvider>().translate(_nameController.text, context.read<LocaleProvider>().currentLang) : '',
                                  style: GoogleFonts.inter(color: colors.foreground, fontSize: 14),
                                ),
                                BounceButton(
                                  onTap: () => setState(() => _editingName = true),
                                  child: Text(
                                    context.read<LocaleProvider>().t('admin.moderation.edit') ?? 'Изменить',
                                    style: GoogleFonts.inter(
                                      color: primary,
                                      fontWeight: FontWeight.bold,
                                      fontSize: 14,
                                    ),
                                  ),
                                ),
                              ],
                            ),
                          ),
                    Padding(
                      padding: const EdgeInsets.symmetric(vertical: 24),
                      child: Divider(color: colors.border),
                    ),
                  ],

                  // Language Row
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        context.read<LocaleProvider>().t('settings.language') ?? 'Язык',
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
                    context.read<LocaleProvider>().t('settings.languageHint') ?? 'Выберите язык приложения',
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
                      Text(context.read<LocaleProvider>().t('settings.theme') ?? 'Тема оформления', style: GoogleFonts.inter(color: colors.foreground, fontSize: 16, fontWeight: FontWeight.bold)),
                    ],
                  ),
                  const SizedBox(height: 16),
                  Row(
                    children: [
                      Expanded(child: _buildModeOption(context, themeProvider, LucideIcons.sun, context.read<LocaleProvider>().t('settings.theme.light') ?? 'Светлая', ThemeModeType.light)),
                      const SizedBox(width: 8),
                      Expanded(child: _buildModeOption(context, themeProvider, LucideIcons.moon, context.read<LocaleProvider>().t('settings.theme.dark') ?? 'Тёмная', ThemeModeType.dark)),
                      const SizedBox(width: 8),
                      Expanded(child: _buildModeOption(context, themeProvider, LucideIcons.zap, context.read<LocaleProvider>().t('settings.theme.neon') ?? 'Неон', ThemeModeType.neon)),
                      const SizedBox(width: 8),
                      Expanded(child: _buildModeOption(context, themeProvider, LucideIcons.sliders_horizontal, context.read<LocaleProvider>().t('settings.theme.custom') ?? 'Своя', ThemeModeType.custom)),
                    ],
                  ),

                  Padding(
                    padding: const EdgeInsets.symmetric(vertical: 24),
                    child: Divider(color: colors.border),
                  ),

                  // Color Theme Section
                  if (themeProvider.mode == ThemeModeType.custom) ...[
                    _buildCustomColorGrid(context, themeProvider),
                  ] else ...[
                    Row(
                      children: [
                        Icon(LucideIcons.paint_bucket, color: colors.foreground, size: 18),
                        const SizedBox(width: 8),
                        Text(context.read<LocaleProvider>().t('settings.accent') ?? 'Цветовой акцент', style: GoogleFonts.inter(color: colors.foreground, fontSize: 16, fontWeight: FontWeight.bold)),
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
                  ],

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
                    label: context.read<LocaleProvider>().t('settings.scale') ?? 'Масштаб текста',
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
                    label: context.read<LocaleProvider>().t('settings.radius') ?? 'Скругление углов',
                    left: context.read<LocaleProvider>().t('settings.radiusSharp') ?? 'Прямо',
                    middle: '${(themeProvider.borderRadius / 16).toStringAsFixed(2)}rem',
                    right: context.read<LocaleProvider>().t('settings.radiusRound') ?? 'Кругло',
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
                      child: Text(context.read<LocaleProvider>().t('settings.done') ?? 'Готово', style: GoogleFonts.inter(color: colors.primaryForeground, fontWeight: FontWeight.w600)),
                    ),
                  ),
                  const SizedBox(height: 12),
                  BounceButton(
                    onTap: () {
                      themeProvider.setMode(ThemeModeType.light);
                      themeProvider.setAccentId('dmag');
                      themeProvider.clearCustomColors();
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
                          Text(context.read<LocaleProvider>().t('settings.reset') ?? 'Сбросить настройки', style: GoogleFonts.inter(color: colors.foreground, fontWeight: FontWeight.bold)),
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

  Widget _buildCustomColorGrid(BuildContext context, ThemeProvider provider) {
    final colors = Theme.of(context).appColors;
    final Map<String, String> labels = {
      'background': context.read<LocaleProvider>().t('settings.colors.background') ?? 'Фон страницы',
      'foreground': context.read<LocaleProvider>().t('settings.colors.foreground') ?? 'Основной текст',
      'card': context.read<LocaleProvider>().t('settings.colors.card') ?? 'Карточки',
      'cardForeground': context.read<LocaleProvider>().t('settings.colors.card_text') ?? 'Текст на карточках',
      'primary': context.read<LocaleProvider>().t('settings.colors.primary') ?? 'Акцент',
      'primaryForeground': context.read<LocaleProvider>().t('settings.colors.primary_text') ?? 'Текст на акценте',
      'muted': context.read<LocaleProvider>().t('settings.colors.muted') ?? 'Второстепенные',
      'border': context.read<LocaleProvider>().t('settings.colors.border') ?? 'Границы',
    };
    
    final Map<String, Color> actualColors = {
      'background': colors.background,
      'foreground': colors.foreground,
      'card': colors.card,
      'cardForeground': colors.cardForeground,
      'primary': colors.primary,
      'primaryForeground': colors.primaryForeground,
      'muted': colors.muted,
      'border': colors.border,
    };

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            Icon(LucideIcons.palette, color: colors.foreground, size: 18),
            const SizedBox(width: 8),
            Text(context.read<LocaleProvider>().t('settings.custom_colors_title') ?? 'Конструктор темы', style: GoogleFonts.inter(color: colors.foreground, fontSize: 16, fontWeight: FontWeight.bold)),
          ],
        ),
        const SizedBox(height: 8),
        Text(context.read<LocaleProvider>().t('settings.custom_colors_hint') ?? 'Выберите цвет для каждой панели интерфейса.', style: GoogleFonts.inter(color: colors.foreground.withValues(alpha: 0.5), fontSize: 12)),
        const SizedBox(height: 16),
        GridView.count(
          shrinkWrap: true,
          physics: const NeverScrollableScrollPhysics(),
          crossAxisCount: 2,
          crossAxisSpacing: 12,
          mainAxisSpacing: 12,
          childAspectRatio: 3.5,
          children: labels.keys.map((key) {
            final currentColor = actualColors[key]!;
            return BounceButton(
              onTap: () => _showColorPicker(context, provider, key, labels[key]!, currentColor),
              child: Container(
                decoration: BoxDecoration(
                  border: Border.all(color: colors.border),
                  borderRadius: BorderRadius.circular(12),
                ),
                padding: const EdgeInsets.symmetric(horizontal: 12),
                child: Row(
                  children: [
                    Container(
                      width: 24,
                      height: 24,
                      decoration: BoxDecoration(
                        color: currentColor,
                        border: Border.all(color: colors.border, width: 1),
                        borderRadius: BorderRadius.circular(4),
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Text(
                        labels[key]!,
                        style: GoogleFonts.inter(color: colors.foreground, fontSize: 12, fontWeight: FontWeight.w500),
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                  ],
                ),
              ),
            );
          }).toList(),
        ),
      ],
    );
  }

  Future<void> _showColorPicker(BuildContext context, ThemeProvider provider, String key, String label, Color initialColor) async {
    final colors = Theme.of(context).appColors;
    final primary = Theme.of(context).primaryColor;
    
    Color previewColor = initialColor;

    await showDialog(
      context: context,
      builder: (ctx) {
        return AlertDialog(
          backgroundColor: colors.card,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16), side: BorderSide(color: colors.border)),
          title: Text(label, style: GoogleFonts.inter(color: colors.foreground, fontWeight: FontWeight.bold)),
          content: SingleChildScrollView(
            child: ColorPicker(
              pickerColor: previewColor,
              onColorChanged: (color) {
                previewColor = color;
              },
              colorPickerWidth: 300,
              pickerAreaHeightPercent: 0.7,
              enableAlpha: false,
              displayThumbColor: true,
              labelTypes: [ColorPickerLabelType.hex, ColorPickerLabelType.rgb],
              paletteType: PaletteType.hsvWithHue,
              pickerAreaBorderRadius: BorderRadius.circular(12),
              hexInputBar: true,
              colorHistory: provider.customColors.values.where((c) => c != null).cast<Color>().toList(),
              onHistoryChanged: (List<Color> colors) {},
            ),
          ),
          actions: [
            TextButton(
              onPressed: () {
                provider.setCustomColor(key, null);
                Navigator.pop(ctx);
              },
              child: Text(context.read<LocaleProvider>().t('settings.reset') ?? 'Сброс', style: GoogleFonts.inter(color: colors.foreground.withValues(alpha: 0.5))),
            ),
            TextButton(
              onPressed: () {
                provider.setCustomColor(key, previewColor);
                Navigator.pop(ctx);
              },
              child: Text(context.read<LocaleProvider>().t('settings.done') ?? 'Сохранить', style: GoogleFonts.inter(color: primary, fontWeight: FontWeight.bold)),
            ),
          ],
        );
      },
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
    final active = provider.accentId == preset.id && provider.customColors['primary'] == null;

    return BounceButton(
      onTap: () {
        provider.setCustomColor('primary', null);
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
                context.read<LocaleProvider>().t('theme.${preset.id}') ?? preset.label,
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
