import 'dart:convert';
import 'package:http/http.dart' as http;

class TranslationService {
  static Future<String?> translate({
    required String text,
    required String sourceLang,
    required String targetLang,
  }) async {
    if (sourceLang == targetLang || text.trim().isEmpty) {
      return text;
    }

    try {
      final url = Uri.parse(
          'https://translate.googleapis.com/translate_a/single?client=gtx&sl=$sourceLang&tl=$targetLang&dt=t&q=${Uri.encodeComponent(text)}');
      
      final response = await http.get(url);
      
      if (response.statusCode == 200) {
        final List<dynamic> jsonResponse = jsonDecode(response.body);
        final List<dynamic> lines = jsonResponse[0];
        
        final buffer = StringBuffer();
        for (var line in lines) {
          buffer.write(line[0]);
        }
        
        return buffer.toString();
      }
    } catch (e) {
      // Ignore translation errors to prevent crash
    }
    
    return null;
  }
}
