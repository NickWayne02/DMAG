import 'package:supabase_flutter/supabase_flutter.dart';

class AuthService {
  static final SupabaseClient _supabase = Supabase.instance.client;

  static User? get currentUser => _supabase.auth.currentUser;

  static Stream<AuthState> get authStateChanges => _supabase.auth.onAuthStateChange;

  static Future<AuthResponse> signIn({required String email, required String password}) async {
    return await _supabase.auth.signInWithPassword(
      email: email,
      password: password,
    );
  }

  static Future<AuthResponse> signUp({required String email, required String password, required String fullName}) async {
    return await _supabase.auth.signUp(
      email: email,
      password: password,
      data: {'full_name': fullName},
    );
  }

  static Future<void> signOut() async {
    await _supabase.auth.signOut();
  }

  static Future<Map<String, dynamic>?> getProfile(String userId) async {
    try {
      final profileData = await _supabase
          .from('profiles')
          .select()
          .eq('id', userId)
          .single();

      if (profileData['role'] == null) {
        profileData['role'] = 'employee';
      }

      return profileData;
    } catch (e) {
      return null;
    }
  }

  static Future<String?> updateAvatar(String userId, String publicUrl) async {
    try {
      await _supabase.from('profiles').update({'avatar_url': publicUrl}).eq('id', userId);
      return publicUrl;
    } catch (e) {
      return null;
    }
  }
}
