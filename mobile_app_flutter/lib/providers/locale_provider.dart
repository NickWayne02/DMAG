import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:http/http.dart' as http;

class LocaleProvider extends ChangeNotifier {
  static const String _storageKey = 'dmag.lang';
  String _currentLang = 'ru';
  Map<String, dynamic> _dictionary = {};
  bool _isLoaded = false;

  String get currentLang => _currentLang;
  bool get isLoaded => _isLoaded;

    static const List<Map<String, String>> languages = [
    {'code': 'ru', 'name': 'Русский', 'flag': '🇷🇺'},
    {'code': 'en', 'name': 'English', 'flag': '🇬🇧'},
    {'code': 'de', 'name': 'Deutsch', 'flag': '🇩🇪'},
    {'code': 'ro', 'name': 'Română', 'flag': '🇷🇴'},
    {'code': 'bg', 'name': 'Български', 'flag': '🇧🇬'},
    {'code': 'pl', 'name': 'Polski', 'flag': '🇵🇱'},
    {'code': 'uk', 'name': 'Українська', 'flag': '🇺🇦'},
    {'code': 'uz', 'name': 'O\'zbekcha', 'flag': '🇺🇿'},
    {'code': 'tg', 'name': 'Тоҷикӣ', 'flag': '🇹🇯'},
  ];

  Map<String, String> get currentLanguage => 
      languages.firstWhere((lang) => lang['code'] == _currentLang, orElse: () => languages.first);

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

  final Map<String, Map<String, String>> _dynamicTranslationCache = {};
  final Set<String> _pendingTranslations = {};

  String? t(String key, [Map<String, String>? params]) {
    if (!_isLoaded || !_dictionary.containsKey(key)) return null;

    final entry = _dictionary[key] as Map<String, dynamic>?;
    if (entry == null) return null;

    String? value = entry[_currentLang] ?? entry['ru'] ?? key;
    
    // If we have an exact translation for the selected language, or language is Russian, return it
    if (_currentLang == 'ru' || entry.containsKey(_currentLang)) {
      if (params != null) {
        params.forEach((k, v) {
          value = value?.replaceAll('{{$k}}', v);
        });
      }
      return value;
    }
    
    // Otherwise, we are falling back to Russian. Try to translate dynamically.
    String apiLang = _currentLang.toLowerCase();
    if (apiLang == 'gb') apiLang = 'en';
    if (apiLang == 'ua') apiLang = 'uk';
    
    if (_dynamicTranslationCache.containsKey(value) && _dynamicTranslationCache[value]!.containsKey(apiLang)) {
      String dynValue = _dynamicTranslationCache[value]![apiLang]!;
      if (params != null) {
        params.forEach((k, v) {
          dynValue = dynValue.replaceAll('{{$k}}', v);
        });
      }
      return dynValue;
    }
    
    final cacheKey = '${value}_$apiLang';
    if (!_pendingTranslations.contains(cacheKey)) {
      _pendingTranslations.add(cacheKey);
      _fetchDynamicTranslation(value!, apiLang, cacheKey);
    }
    
    // Return fallback while waiting
    if (params != null) {
      params.forEach((k, v) {
        value = value?.replaceAll('{{$k}}', v);
      });
    }
    return value;
  }
  
  Future<void> _fetchDynamicTranslation(String text, String targetLang, String cacheKey) async {
    try {
      final uri = Uri.parse('https://api.mymemory.translated.net/get?q=${Uri.encodeComponent(text)}&langpair=ru|$targetLang');
      final response = await http.get(uri).timeout(const Duration(seconds: 10));
      
      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        final translatedText = data['responseData']?['translatedText'];
        
        if (translatedText != null && translatedText.toString().trim().isNotEmpty && !translatedText.toString().contains('MYMEMORY WARNING')) {
          _dynamicTranslationCache.putIfAbsent(text, () => {});
          _dynamicTranslationCache[text]![targetLang] = translatedText.toString();
          notifyListeners();
        }
      }
    } catch (e) {
      debugPrint('Translation error for $text: $e');
    } finally {
      _pendingTranslations.remove(cacheKey);
    }
  }
}
