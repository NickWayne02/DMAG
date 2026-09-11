import 'package:flutter/foundation.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:flutter_dynamic_icon_plus/flutter_dynamic_icon_plus.dart';
import 'package:flutter/services.dart';
import 'dart:io' show Platform;

class AdminStateProvider extends ChangeNotifier {
  final _supabase = Supabase.instance.client;
  
  List<Map<String, dynamic>> _presets = [];
  String _selectedFirmId = 'all';
  bool _isLoading = false;

  List<Map<String, dynamic>> get presets => _presets;
  String get selectedFirmId => _selectedFirmId;
  bool get isLoading => _isLoading;

  Future<void> fetchPresets() async {
    _isLoading = true;
    notifyListeners();

    try {
      final response = await _supabase.from('app_branding_presets').select().order('created_at');
      _presets = List<Map<String, dynamic>>.from(response);
    } catch (e) {
      debugPrint('Failed to fetch presets: $e');
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<void> setSelectedFirmId(String id) async {
    if (_selectedFirmId != id) {
      _selectedFirmId = id;
      notifyListeners();

      // Change app icon dynamically
      if (!kIsWeb && Platform.isAndroid) {
        try {
          final brands = ['Brand1', 'Brand2', 'Brand3'];
          
          if (id == 'all') {
             await FlutterDynamicIconPlus.setAlternateIconName(iconName: 'DefaultAlias', blacklistBrands: brands);
             return;
          }

          final preset = _presets.firstWhere((p) => p['id'].toString() == id, orElse: () => {});
          final appName = (preset['app_name'] ?? '').toString().toLowerCase();

          if (appName.contains('e&r')) {
            await FlutterDynamicIconPlus.setAlternateIconName(iconName: 'Brand1', blacklistBrands: brands);
          } else if (appName.contains('o&d')) {
            await FlutterDynamicIconPlus.setAlternateIconName(iconName: 'Brand2', blacklistBrands: brands);
          } else if (appName.contains('dmag')) {
            await FlutterDynamicIconPlus.setAlternateIconName(iconName: 'Brand3', blacklistBrands: brands);
          } else {
             await FlutterDynamicIconPlus.setAlternateIconName(iconName: 'DefaultAlias', blacklistBrands: brands);
          }
        } on PlatformException {
          // ignore
        }
      }
    }
  }
}
