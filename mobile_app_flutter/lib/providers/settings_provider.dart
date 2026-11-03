import 'package:flutter/foundation.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../config/app_brand_config.dart';

class AppSettings {
  final String appName;
  final String? appLogoUrl;

  AppSettings({
    required this.appName,
    this.appLogoUrl,
  });

  factory AppSettings.fromJson(Map<String, dynamic> json) {
    return AppSettings(
      appName: json['app_name'] ?? AppBrandConfig.defaultAppName,
      appLogoUrl: json['app_logo_url'],
    );
  }
}

class SettingsProvider with ChangeNotifier {
  AppSettings _settings = AppSettings(appName: AppBrandConfig.defaultAppName);
  bool _isLoading = true;

  AppSettings get settings => _settings;
  bool get isLoading => _isLoading;

  SettingsProvider() {
    _loadSettings();
  }

  void updateSettings({String? appName, String? appLogoUrl}) {
    _settings = AppSettings(
      appName: appName ?? _settings.appName,
      appLogoUrl: appLogoUrl ?? _settings.appLogoUrl,
    );
    notifyListeners();
  }

  Future<void> _loadSettings() async {
    try {
      final response = await Supabase.instance.client
          .from('app_settings')
          .select()
          .eq('id', 1)
          .maybeSingle();

      if (response != null) {
        if (AppBrandConfig.isER) {
          final remoteName = response['app_name']?.toString().trim() ?? '';
          if (remoteName.toUpperCase() == 'E&R') {
            _settings = AppSettings.fromJson(response);
          } else {
            _settings = AppSettings(appName: AppBrandConfig.defaultAppName, appLogoUrl: null);
          }
        } else {
          _settings = AppSettings.fromJson(response);
        }
      }
    } catch (e) {
      debugPrint('Error loading app_settings: $e');
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<void> refreshSettings() async {
    _isLoading = true;
    notifyListeners();
    await _loadSettings();
  }
}
