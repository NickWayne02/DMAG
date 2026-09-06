import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:shared_preferences/shared_preferences.dart';

class TranslationProvider extends ChangeNotifier {
  // cache: original text -> { targetLang -> translatedText }
  Map<String, Map<String, String>> _cache = {};

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
    }
  }



  static const Map<String, String> _cyrillicToLatin = {
    'А': 'A', 'Б': 'B', 'В': 'V', 'Г': 'G', 'Д': 'D', 'Е': 'E', 'Ё': 'E', 'Ж': 'Zh', 'З': 'Z',
    'И': 'I', 'Й': 'Y', 'К': 'K', 'Л': 'L', 'М': 'M', 'Н': 'N', 'О': 'O', 'П': 'P', 'Р': 'R',
    'С': 'S', 'Т': 'T', 'У': 'U', 'Ф': 'F', 'Х': 'Kh', 'Ц': 'Ts', 'Ч': 'Ch', 'Ш': 'Sh', 'Щ': 'Shch',
    'Ъ': '', 'Ы': 'Y', 'Ь': '', 'Э': 'E', 'Ю': 'Yu', 'Я': 'Ya',
    'а': 'a', 'б': 'b', 'в': 'v', 'г': 'g', 'д': 'd', 'е': 'e', 'ё': 'e', 'ж': 'zh', 'з': 'z',
    'и': 'i', 'й': 'y', 'к': 'k', 'л': 'l', 'м': 'm', 'н': 'n', 'о': 'o', 'п': 'p', 'р': 'r',
    'с': 's', 'т': 't', 'у': 'u', 'ф': 'f', 'х': 'kh', 'ц': 'ts', 'ч': 'ch', 'ш': 'sh', 'щ': 'shch',
    'ъ': '', 'ы': 'y', 'ь': '', 'э': 'e', 'ю': 'yu', 'я': 'ya',
    'Є': 'Ye', 'І': 'I', 'Ї': 'Yi', 'Ґ': 'G',
    'є': 'ye', 'і': 'i', 'ї': 'yi', 'ґ': 'g',
  };

  static const Map<String, String> _ukToRu = {
    'Є': 'Е', 'І': 'И', 'Ї': 'И', 'Ґ': 'Г',
    'є': 'е', 'і': 'и', 'ї': 'и', 'ґ': 'г',
  };

  static const Map<String, String> _ruToUk = {
    'Ы': 'И', 'Э': 'Е', 'Ъ': '', 'Ё': 'Е',
    'ы': 'и', 'э': 'е', 'ъ': '', 'ё': 'е',
  };

  String _transliterate(String text, Map<String, String> map) {
    return text.split('').map((char) => map.containsKey(char) ? map[char]! : char).join('');
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
    
    // Manual specific overrides based on targetLang
    if (targetLang == 'uk') {
      processedName = _transliterate(processedName, _ruToUk);
    } else if (['ru', 'bg', 'tg'].contains(targetLang)) {
      processedName = _transliterate(processedName, _ukToRu);
    } else {
      // Latin script languages (en, de, ro, pl, uz, etc.)
      processedName = _transliterate(processedName, _cyrillicToLatin);
    }
    
    return processedName;
  }
}
