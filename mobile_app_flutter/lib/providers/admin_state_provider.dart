import 'package:flutter/foundation.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:flutter_dynamic_icon_plus/flutter_dynamic_icon_plus.dart';
import 'package:flutter/services.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'dart:io' show Platform;

class AdminStateProvider extends ChangeNotifier {
  final _supabase = Supabase.instance.client;
  
  List<Map<String, dynamic>> _presets = [];
  String _selectedFirmId = 'all';
  bool _isLoading = false;

  List<Map<String, dynamic>> get presets => _presets;
  String get selectedFirmId => _selectedFirmId;
  bool get isLoading => _isLoading;

  AdminStateProvider() {
    _loadSelectedFirmId();
  }

  Future<void> _loadSelectedFirmId() async {
    final prefs = await SharedPreferences.getInstance();
    final savedId = prefs.getString('admin_selected_firm_id');
    if (savedId != null) {
      _selectedFirmId = savedId;
      notifyListeners();
    }
  }

  Future<void> fetchPresets() async {
    _isLoading = true;
    notifyListeners();

    try {
      final response = await _supabase.from('app_branding_presets').select().order('created_at');
      final list = List<Map<String, dynamic>>.from(response);
      list.sort((a, b) {
        final order = {'DMAG': 1, 'E&R': 2, 'O&D': 3};
        final aName = (a['app_name'] ?? '').toString().toUpperCase().trim();
        final bName = (b['app_name'] ?? '').toString().toUpperCase().trim();
        final aVal = order[aName] ?? 99;
        final bVal = order[bName] ?? 99;
        return aVal.compareTo(bVal);
      });
      _presets = list;
      _presets = list;
      // Do not overwrite 'all'. Only default to the first firm if no firm is selected and 'all' is somehow not the default.
      if (_selectedFirmId != 'all' && !_presets.any((p) => p['id'].toString() == _selectedFirmId) && _presets.isNotEmpty) {
        _selectedFirmId = _presets[0]['id'].toString();
      }
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
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString('admin_selected_firm_id', id);
      notifyListeners();

      // Change app icon dynamically
      if (!kIsWeb && Platform.isAndroid) {
        try {
          const brands = ['samsung', 'xiaomi', 'poco', 'redmi', 'oneplus', 'oppo', 'vivo', 'realme', 'motorola', 'google', 'nokia', 'sony', 'asus', 'huawei', 'honor', 'meizu', 'zte', 'lenovo'];
          
          if (id == 'all') {
             await FlutterDynamicIconPlus.setAlternateIconName(iconName: 'com.factory.app.DefaultAlias', blacklistBrands: brands);
             return;
          }

          final preset = _presets.firstWhere((p) => p['id'].toString() == id, orElse: () => <String, dynamic>{});
          final appName = (preset['app_name'] ?? '').toString().toLowerCase();

          if (appName.contains('e&r')) {
            await FlutterDynamicIconPlus.setAlternateIconName(iconName: 'com.factory.app.Brand1', blacklistBrands: brands);
          } else if (appName.contains('o&d')) {
            await FlutterDynamicIconPlus.setAlternateIconName(iconName: 'com.factory.app.Brand2', blacklistBrands: brands);
          } else if (appName.contains('dmag')) {
            await FlutterDynamicIconPlus.setAlternateIconName(iconName: 'com.factory.app.Brand3', blacklistBrands: brands);
          } else {
             await FlutterDynamicIconPlus.setAlternateIconName(iconName: 'com.factory.app.DefaultAlias', blacklistBrands: brands);
          }
        } on PlatformException catch (e) {
          debugPrint('Icon change failed: $e');
        }
      }
    }
  }
}
