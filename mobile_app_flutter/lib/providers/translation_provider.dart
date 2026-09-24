import 'package:flutter/foundation.dart';
class TranslationProvider extends ChangeNotifier {
  TranslationProvider();


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

  static const Map<String, Map<String, String>> _siteTranslations = {
    'Зиген': {'ru': 'Зиген', 'uk': 'Зіген', 'default': 'Siegen'},
    'Siegen': {'ru': 'Зиген', 'uk': 'Зіген', 'default': 'Siegen'},
    'Giengen': {'ru': 'Зиген', 'uk': 'Зіген', 'default': 'Siegen'},
    'Быдгощ': {'ru': 'Быдгощ', 'uk': 'Бидгощ', 'default': 'Bydgoszcz'},
    'Bydgoszcz': {'ru': 'Быдгощ', 'uk': 'Бидгощ', 'default': 'Bydgoszcz'},
    'Светловодск': {'ru': 'Светловодск', 'uk': 'Світловодськ', 'default': 'Svitlovodsk'},
    'Svitlovodsk': {'ru': 'Светловодск', 'uk': 'Світловодськ', 'default': 'Svitlovodsk'},
    'Bellershausen': {'ru': 'Беллерсхаузен', 'uk': 'Беллерсгаузен', 'default': 'Bellershausen'},
    'Hinhausen': {'ru': 'Хинхаузен', 'uk': 'Хінхаузен', 'default': 'Hinhausen'},
    'Харбах': {'ru': 'Харбах', 'uk': 'Харбах', 'default': 'Harbach'},
    'Harbach': {'ru': 'Харбах', 'uk': 'Харбах', 'default': 'Harbach'},
    'Freudenberg': {'ru': 'Фройденберг', 'uk': 'Фройденберг', 'default': 'Freudenberg'},
  };

  String translate(String text, String targetLang, [Map<String, dynamic>? translations]) {
    if (text.trim().isEmpty) return text;

    String processedName = text.trim();
    
    // 1. Use DB translations if provided
    if (translations != null) {
      if (targetLang == 'ru' && translations['ru'] != null && translations['ru'].toString().isNotEmpty) return translations['ru'];
      if (targetLang == 'uk' && translations['uk'] != null && translations['uk'].toString().isNotEmpty) return translations['uk'];
      if (targetLang == 'en' && translations['en'] != null && translations['en'].toString().isNotEmpty) return translations['en'];
      if (translations['en'] != null && translations['en'].toString().isNotEmpty && targetLang != 'ru' && targetLang != 'uk') return translations['en'];
      if (translations['default'] != null && translations['default'].toString().isNotEmpty) return translations['default'];
    }
    
    // 2. Specific hardcoded site translations match (case-insensitive for key)
    final lowerName = processedName.toLowerCase();
    final matchKey = _siteTranslations.keys.where((k) => k.toLowerCase() == lowerName).firstOrNull;
    
    if (matchKey != null) {
      final trans = _siteTranslations[matchKey]!;
      if (targetLang == 'ru') return trans['ru'] ?? trans['default']!;
      if (targetLang == 'uk') return trans['uk'] ?? trans['default']!;
      return trans['default']!;
    }
    
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
