import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';

enum ThemeModeType { light, dark, neon, custom }
enum ButtonStyleType { filled, outlined }

class AccentPreset {
  final String id;
  final String label;
  final Color primary;
  final Color cyan;
  final Color magenta;
  final Color violet;

  const AccentPreset({
    required this.id,
    required this.label,
    required this.primary,
    required this.cyan,
    required this.magenta,
    required this.violet,
  });
}

class ThemeProvider extends ChangeNotifier {
  static const List<AccentPreset> presets = [
    AccentPreset(
      id: "dmag",
      label: "DMAG Blue",
      primary: Color(0xFF0D47A1),
      cyan: Color(0xFF42A5F5),
      magenta: Color(0xFF1565C0),
      violet: Color(0xFF0a2351),
    ),
    AccentPreset(
      id: "sunset",
      label: "Sunset",
      primary: Color(0xFFF97316),
      cyan: Color(0xFFfbbf24),
      magenta: Color(0xFFef4444),
      violet: Color(0xFF9a3412),
    ),
    AccentPreset(
      id: "emerald",
      label: "Emerald",
      primary: Color(0xFF10B981),
      cyan: Color(0xFF34d399),
      magenta: Color(0xFF14b8a6),
      violet: Color(0xFF064e3b),
    ),
    AccentPreset(
      id: "royal",
      label: "Royal",
      primary: Color(0xFF7C3AED),
      cyan: Color(0xFF22d3ee),
      magenta: Color(0xFFe879f9),
      violet: Color(0xFF4c1d95),
    ),
    AccentPreset(
      id: "ruby",
      label: "Ruby",
      primary: Color(0xFFE11D48),
      cyan: Color(0xFFfb7185),
      magenta: Color(0xFFf43f5e),
      violet: Color(0xFF881337),
    ),
    AccentPreset(
      id: "graphite",
      label: "Graphite",
      primary: Color(0xFF334155),
      cyan: Color(0xFF94a3b8),
      magenta: Color(0xFF64748b),
      violet: Color(0xFF1e293b),
    ),
  ];

  ThemeModeType _mode = ThemeModeType.light; // Default to Light
  String _accentId = 'dmag';
  final Map<String, Color?> _customColors = {};
  ButtonStyleType _buttonStyle = ButtonStyleType.filled;
  double _textSizeScale = 1.0;
  double _borderRadius = 14.0; // approx 0.88rem

  ThemeModeType get mode => _mode;
  String get accentId => _accentId;
  Map<String, Color?> get customColors => _customColors;
  ButtonStyleType get buttonStyle => _buttonStyle;
  double get textSizeScale => _textSizeScale;
  double get borderRadius => _borderRadius;

  AccentPreset get activeAccent {
    return presets.firstWhere((p) => p.id == _accentId, orElse: () => presets.first);
  }

  Color get activePrimaryColor => _customColors['primary'] ?? activeAccent.primary;

  ThemeProvider() {
    _loadSettings();
  }

  Future<void> _loadSettings() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final modeStr = prefs.getString('theme_mode') ?? 'light';
      _mode = ThemeModeType.values.firstWhere((e) => e.name == modeStr, orElse: () => ThemeModeType.light);
      _accentId = prefs.getString('theme_accent_id') ?? 'dmag';
      
      final keys = ['background', 'foreground', 'card', 'cardForeground', 'primary', 'primaryForeground', 'muted', 'border'];
      for (var key in keys) {
        final val = prefs.getInt('theme_custom_$key');
        if (val != null) {
          _customColors[key] = Color(val);
        } else {
          _customColors.remove(key);
        }
      }
      
      final btnStyleStr = prefs.getString('theme_button_style') ?? 'filled';
      _buttonStyle = ButtonStyleType.values.firstWhere((e) => e.name == btnStyleStr, orElse: () => ButtonStyleType.filled);
      
      _textSizeScale = prefs.getDouble('theme_text_size_scale') ?? 1.0;
      _borderRadius = prefs.getDouble('theme_border_radius') ?? 14.0;

      notifyListeners();
    } catch (e) {
      debugPrint('Error loading theme settings: $e');
    }
  }

  Future<void> setMode(ThemeModeType mode) async {
    _mode = mode;
    notifyListeners();
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString('theme_mode', mode.name);
  }

  Future<void> setAccentId(String id) async {
    _accentId = id;
    notifyListeners();
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString('theme_accent_id', id);
  }

  Future<void> setCustomColor(String key, Color? color) async {
    _customColors[key] = color;
    notifyListeners();
    final prefs = await SharedPreferences.getInstance();
    if (color == null) {
      await prefs.remove('theme_custom_$key');
    } else {
      await prefs.setInt('theme_custom_$key', color.toARGB32());
    }
  }
  
  Future<void> clearCustomColors() async {
    _customColors.clear();
    notifyListeners();
    final prefs = await SharedPreferences.getInstance();
    final keys = ['background', 'foreground', 'card', 'cardForeground', 'primary', 'primaryForeground', 'muted', 'border'];
    for (var key in keys) {
      await prefs.remove('theme_custom_$key');
    }
  }

  Future<void> setButtonStyle(ButtonStyleType style) async {
    _buttonStyle = style;
    notifyListeners();
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString('theme_button_style', style.name);
  }

  Future<void> setTextSizeScale(double scale) async {
    _textSizeScale = scale;
    notifyListeners();
    final prefs = await SharedPreferences.getInstance();
    await prefs.setDouble('theme_text_size_scale', scale);
  }

  Future<void> setBorderRadius(double radius) async {
    _borderRadius = radius;
    notifyListeners();
    final prefs = await SharedPreferences.getInstance();
    await prefs.setDouble('theme_border_radius', radius);
  }
}
