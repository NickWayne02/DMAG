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

      // Fetch roles from user_roles
      final rolesData = await _supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', userId);

      String primaryRole = 'employee';
      if ((rolesData as List).isNotEmpty) {
        final roles = (rolesData as List).map((r) => r['role'] as String).toList();
        if (roles.contains('super_admin')) {
          primaryRole = 'super_admin';
        } else if (roles.contains('admin')) {
          primaryRole = 'admin';
        } else if (roles.contains('brigadier')) {
          primaryRole = 'brigadier';
        }
      } else if (profileData['role'] != null) {
        primaryRole = profileData['role'];
      }

      profileData['role'] = primaryRole;

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
