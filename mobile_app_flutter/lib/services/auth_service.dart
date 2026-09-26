import 'package:supabase_flutter/supabase_flutter.dart';

class AuthService {
  static final SupabaseClient _supabase = Supabase.instance.client;

  static User? get currentUser => _supabase.auth.currentUser;

  static Stream<AuthState> get authStateChanges => _supabase.auth.onAuthStateChange;

  static Future<AuthResponse> signIn({required String login, required String password}) async {
    final String trimmedLogin = login.trim();
    final bool isEmail = trimmedLogin.contains('@');
    final bool isPhone = RegExp(r'^\+?[0-9\s-]+$').hasMatch(trimmedLogin) && trimmedLogin.length >= 7;

    if (isEmail) {
      return await _supabase.auth.signInWithPassword(email: trimmedLogin, password: password);
    } else if (isPhone) {
      return await _supabase.auth.signInWithPassword(phone: trimmedLogin, password: password);
    } else {
      String? emailToUse;
      try {
        final response = await _supabase.rpc('get_email_by_username', params: {'p_username': trimmedLogin});
        emailToUse = response as String?;
      } catch (e) {
        // Fallback below
      }
      emailToUse ??= '$trimmedLogin@dmag.de';
      
      return await _supabase.auth.signInWithPassword(email: emailToUse, password: password);
    }
  }

  static Future<AuthResponse> signUp({
    required String login, 
    required String password, 
    required String firstName,
    required String lastName,
    required String username,
    required String birthDate,
  }) async {
    final String trimmedLogin = login.trim();
    final bool isEmail = trimmedLogin.contains('@');
    final bool isPhone = RegExp(r'^\+?[0-9\s-]+$').hasMatch(trimmedLogin) && trimmedLogin.length >= 7;

    return await _supabase.auth.signUp(
      email: isEmail ? trimmedLogin : null,
      phone: isPhone ? trimmedLogin : null,
      password: password,
      data: {
        'first_name': firstName,
        'last_name': lastName,
        'username': username,
        'birth_date': birthDate,
        'full_name': '$firstName $lastName'.trim()
      },
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
