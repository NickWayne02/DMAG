const Map<String, String> _cyrillicToLatinMap = {
  'а': 'a', 'б': 'b', 'в': 'v', 'г': 'g', 'д': 'd', 'е': 'e', 'ё': 'e',
  'ж': 'zh', 'з': 'z', 'и': 'i', 'й': 'y', 'к': 'k', 'л': 'l', 'м': 'm',
  'н': 'n', 'о': 'o', 'п': 'p', 'р': 'r', 'с': 's', 'т': 't', 'у': 'u',
  'ф': 'f', 'х': 'kh', 'ц': 'ts', 'ч': 'ch', 'ш': 'sh', 'щ': 'shch',
  'ъ': '', 'ы': 'y', 'ь': '', 'э': 'e', 'ю': 'yu', 'я': 'ya',
  
  // Ukrainian specific
  'і': 'i', 'ї': 'yi', 'є': 'ye', 'ґ': 'g',
  
  // Capital letters
  'А': 'A', 'Б': 'B', 'В': 'V', 'Г': 'G', 'Д': 'D', 'Е': 'E', 'Ё': 'E',
  'Ж': 'Zh', 'З': 'Z', 'И': 'I', 'Й': 'Y', 'К': 'K', 'Л': 'L', 'М': 'M',
  'Н': 'N', 'О': 'O', 'П': 'P', 'Р': 'R', 'С': 'S', 'Т': 'T', 'У': 'U',
  'Ф': 'F', 'Х': 'Kh', 'Ц': 'Ts', 'Ч': 'Ch', 'Ш': 'Sh', 'Щ': 'Shch',
  'Ъ': '', 'Ы': 'Y', 'Ь': '', 'Э': 'E', 'Ю': 'Yu', 'Я': 'Ya',
  
  'І': 'I', 'Ї': 'Yi', 'Є': 'Ye', 'Ґ': 'G',
};


// Removed hardcoded specific mappings

const Map<String, String> _ruToUkChars = {
  'и': 'і',
  'И': 'І',
  'ы': 'и',
  'Ы': 'И',
  'э': 'е',
  'Э': 'Е',
  'ъ': "'",
  'Ъ': "'",
};

class TransliterationService {
  /// Transliterates text from Cyrillic to Latin if the provided langCode is a Latin-based language.
  /// Cyrillic languages: ru, uk, bg, tg
  /// Latin languages: en, de, ro, pl, uz
  static String transliterateIfNeeded(String text, String langCode) {
    if (langCode.toLowerCase() == 'uk') {
      String out = text;
      // 'Е'/'е' at the start of a word, or after a vowel/soft/hard sign, becomes 'Є'/'є'
      out = out.replaceAllMapped(RegExp(r'(^|[\sаеёиоуыэюяАЕЁИОУЫЭЮЯьъЬЪ])Е'), (m) => '${m.group(1)}Є');
      out = out.replaceAllMapped(RegExp(r'(^|[\sаеёиоуыэюяАЕЁИОУЫЭЮЯьъЬЪ])е'), (m) => '${m.group(1)}є');
      
      final buffer = StringBuffer();
      for (int i = 0; i < out.length; i++) {
        final char = out[i];
        if (_ruToUkChars.containsKey(char)) {
          buffer.write(_ruToUkChars[char]);
        } else {
          buffer.write(char);
        }
      }
      return buffer.toString();
    }

    // If the language is Cyrillic natively, don't transliterate.
    if (['ru', 'uk', 'bg', 'tg'].contains(langCode.toLowerCase())) {
      return text;
    }
    
    // Otherwise, perform transliteration
    return _transliterate(text);
  }

  static String _transliterate(String text) {
    if (text.isEmpty) return text;
    
    final buffer = StringBuffer();
    for (int i = 0; i < text.length; i++) {
      final char = text[i];
      if (_cyrillicToLatinMap.containsKey(char)) {
        buffer.write(_cyrillicToLatinMap[char]);
      } else {
        buffer.write(char);
      }
    }
    return buffer.toString();
  }
}
