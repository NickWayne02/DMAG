import 'dart:io';
import 'package:supabase_flutter/supabase_flutter.dart';

class StorageService {
  static final SupabaseClient _supabase = Supabase.instance.client;

  /// Uploads an avatar image and returns the public URL
  static Future<String?> uploadAvatar(File file, String userId) async {
    try {
      final ext = file.path.split('.').last;
      final fileName = '$userId-${DateTime.now().millisecondsSinceEpoch}.$ext';
      final path = 'avatars/$fileName';
      
      // We upload to the photo-reports bucket like the web app
      await _supabase.storage.from('photo-reports').upload(
        path,
        file,
        fileOptions: const FileOptions(cacheControl: '3600', upsert: true),
      );
      
      final publicUrl = _supabase.storage.from('photo-reports').getPublicUrl(path);
      return publicUrl;
    } catch (e) {
      return null;
    }
  }
}
