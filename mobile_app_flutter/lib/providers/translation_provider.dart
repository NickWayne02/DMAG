import '../providers/translation_provider.dart';
import 'package:provider/provider.dart';
import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';
import '../utils/transliteration.dart';

class TranslationProvider extends ChangeNotifier {
  // cache: original text -> { targetLang -> translatedText }
  Map<String, Map<String, String>> _cache = {};
  final Set<String> _pendingRequests = {};
  bool _initialized = false;

  TranslationProvider() {
    _loadCache();
  }

  Future<void> _loadCache() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final cacheStr = prefs.getString('translation_cache');
      if (cacheStr != null) {
        final Map<String, dynamic> decoded = json.decode(cacheStr);
        _cache = decoded.map((key, value) => 
          MapEntry(key, Map<String, String>.from(value as Map))
        );
        notifyListeners();
      }
    } catch (e) {
      debugPrint('Error loading translation cache: $e');
    } finally {
      _initialized = true;
    }
  }

  Future<void> _saveCache() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString('translation_cache', json.encode(_cache));
    } catch (e) {
      debugPrint('Error saving translation cache: $e');
    }
  }

  String translate(String text, String targetLang) {
    if (text.trim().isEmpty) return text;

    String processedName = text;
    
    // Auto TitleCase if the name is ALL CAPS
    if (processedName == processedName.toUpperCase() && RegExp(r'[A-ZА-ЯЁІЇЄ]').hasMatch(processedName)) {
      processedName = processedName.split(' ').map((w) => 
        w.isNotEmpty ? w[0].toUpperCase() + w.substring(1).toLowerCase() : w
      ).join(' ');
    }
    
    // Manual specific overrides
    if (targetLang.toLowerCase() == "uk" || targetLang.toLowerCase() == "ua") {
      processedName = processedName
          .replaceAll('Евгений', 'Євген')
          .replaceAll('Костин', 'Костін')
          .replaceAll('Светловодск', 'Світловодськ');
    }
    
    return processedName;
  }
}
