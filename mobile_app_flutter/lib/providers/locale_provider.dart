import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:shared_preferences/shared_preferences.dart';

class LocaleProvider extends ChangeNotifier {
  static const String _storageKey = 'dmag.lang';
  String _currentLang = 'ru';
  Map<String, dynamic> _dictionary = {};
  bool _isLoaded = false;

  String get currentLang => _currentLang;
  bool get isLoaded => _isLoaded;

  LocaleProvider() {
    _init();
  }

  Future<void> _init() async {
    final prefs = await SharedPreferences.getInstance();
    _currentLang = prefs.getString(_storageKey) ?? 'ru';
    
    try {
      final jsonStr = await rootBundle.loadString('assets/i18n.json');
      _dictionary = jsonDecode(jsonStr);
    } catch (e) {
      debugPrint('Error loading translations: $e');
      _dictionary = {};
    }
    
    _isLoaded = true;
    notifyListeners();
  }

  Future<void> setLanguage(String langCode) async {
    if (_currentLang == langCode) return;
    _currentLang = langCode;
    notifyListeners();
    
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_storageKey, langCode);
  }

  String t(String key, [Map<String, String>? params]) {
    if (!_isLoaded || !_dictionary.containsKey(key)) return key;

    final entry = _dictionary[key] as Map<String, dynamic>?;
    if (entry == null) return key;

    String translated = entry[_currentLang] ?? entry['ru'] ?? key;

    if (params != null) {
      params.forEach((k, v) {
        translated = translated.replaceAll('{{$k}}', v);
      });
    }

    return translated;
  }
}
