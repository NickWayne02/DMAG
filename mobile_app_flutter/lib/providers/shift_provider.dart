import 'dart:async';
import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../services/auth_service.dart';
import '../services/location_service.dart';

enum ShiftStatus { idle, working, lunch, finished }

class ShiftProvider extends ChangeNotifier {
  ShiftStatus _status = ShiftStatus.idle;
  DateTime? _shiftStart;
  DateTime? _shiftEnd;
  DateTime? _lunchStart;
  int _lunchAccumMs = 0;
  List<Map<String, dynamic>> _lunchIntervals = [];
  bool _autoLunchApplied = false;
  String? _shiftId;
  String? _travelTime;
  bool _isAdminView = false; // Add this

  Map<String, dynamic>? _userProfile;
  bool _isProfileLoading = false;
  Map<String, dynamic>? _selectedSite;
  Timer? _timer;
  DateTime _now = DateTime.now();

  ShiftStatus get status => _status;
  DateTime? get shiftStart => _shiftStart;
  Map<String, dynamic>? get userProfile => _userProfile;
  bool get isProfileLoading => _isProfileLoading;
  Map<String, dynamic>? get selectedSite => _selectedSite;
  String? get shiftId => _shiftId;
  bool get autoLunchApplied => _autoLunchApplied;
  String? get travelTime => _travelTime;
  bool get isAdminView => _isAdminView; // Add getter

  void setAdminView(bool val) async {
    _isAdminView = val;
    notifyListeners();
    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool('is_admin_view', val);
  }

  int get workMs {
    if (_shiftStart == null) return 0;
    final end = _shiftEnd ?? _now;
    return end.difference(_shiftStart!).inMilliseconds - lunchMs;
  }

  int get lunchMs => _lunchAccumMs + (_lunchStart != null ? DateTime.now().difference(_lunchStart!).inMilliseconds : 0);

  int get totalMs => workMs + lunchMs;

  ShiftProvider() {
    _loadState();
    _startTimer();
    reloadProfile();
    
    // Listen to auth changes to reload profile when user logs in/out
    Supabase.instance.client.auth.onAuthStateChange.listen((data) {
      if (data.event == AuthChangeEvent.signedIn) {
        reloadProfile();
      } else if (data.event == AuthChangeEvent.signedOut) {
        resetShift();
        _userProfile = null;
        _selectedSite = null;
        notifyListeners();
      }
    });
  }

  void _startTimer() {
    _timer = Timer.periodic(const Duration(seconds: 1), (timer) {
      if (_status == ShiftStatus.working || _status == ShiftStatus.lunch) {
        _now = DateTime.now();
        notifyListeners();
      }
    });
  }

  Future<void> reloadProfile() async {
    final user = AuthService.currentUser;
    if (user != null) {
      _isProfileLoading = true;
      notifyListeners();
      _userProfile = await AuthService.getProfile(user.id);
      _isProfileLoading = false;
      notifyListeners();
    }
  }

  void setSelectedSite(Map<String, dynamic> site) async {
    _selectedSite = site;
    notifyListeners();
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString('selected_site_id', site['id']);
    await prefs.setString('selected_site_name', site['name']);
    await prefs.setString('selected_site_address', site['address'] ?? '');
  }

  Future<void> _loadState() async {
    final prefs = await SharedPreferences.getInstance();
    
    final siteId = prefs.getString('selected_site_id');
    if (siteId != null) {
      _selectedSite = {
        'id': siteId,
        'name': prefs.getString('selected_site_name'),
        'address': prefs.getString('selected_site_address'),
      };
    }

    final statusStr = prefs.getString('shift_status');
    _isAdminView = prefs.getBool('is_admin_view') ?? false;

    if (statusStr != null) {
      _status = ShiftStatus.values.firstWhere(
        (e) => e.name == statusStr,
        orElse: () => ShiftStatus.idle,
      );
      
      final startMs = prefs.getInt('shift_start');
      if (startMs != null) _shiftStart = DateTime.fromMillisecondsSinceEpoch(startMs);
      
      final lunchStartMs = prefs.getInt('lunch_start');
      if (lunchStartMs != null) _lunchStart = DateTime.fromMillisecondsSinceEpoch(lunchStartMs);
      
      _lunchAccumMs = prefs.getInt('lunch_accum') ?? 0;
      _shiftId = prefs.getString('shift_id');
      _autoLunchApplied = prefs.getBool('auto_lunch_applied') ?? false;
      
      final intervalsStr = prefs.getString('lunch_intervals');
      if (intervalsStr != null) {
        final List<dynamic> decoded = jsonDecode(intervalsStr);
        _lunchIntervals = decoded.map((e) => e as Map<String, dynamic>).toList();
      }
      
      _now = DateTime.now();
      notifyListeners();
    }
  }

  Future<void> _saveState() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString('shift_status', _status.name);
    
    if (_shiftStart != null) {
      await prefs.setInt('shift_start', _shiftStart!.millisecondsSinceEpoch);
    } else {
      await prefs.remove('shift_start');
    }
    
    if (_lunchStart != null) {
      await prefs.setInt('lunch_start', _lunchStart!.millisecondsSinceEpoch);
    } else {
      await prefs.remove('lunch_start');
    }
    
    await prefs.setInt('lunch_accum', _lunchAccumMs);
    await prefs.setBool('auto_lunch_applied', _autoLunchApplied);
    await prefs.setString('lunch_intervals', jsonEncode(_lunchIntervals));
    
    if (_shiftId != null) {
      await prefs.setString('shift_id', _shiftId!);
    } else {
      await prefs.remove('shift_id');
    }
  }

  Future<void> startShift() async {
    if (_status != ShiftStatus.idle && _status != ShiftStatus.finished) return;
    
    final pos = await LocationService.getCurrentPosition();
    
    _status = ShiftStatus.working;
    _shiftStart = DateTime.now();
    _lunchAccumMs = 0;
    _lunchStart = null;
    _shiftEnd = null;
    _lunchIntervals = [];
    _autoLunchApplied = false;
    _shiftId = null;
    notifyListeners();
    
    String? siteId = _selectedSite?['id'];
    String? siteName = _selectedSite?['name'];
    String? city = siteName;
    
    if (pos != null) {
      if (siteId == null) {
        final nearest = await LocationService.findNearestSite(pos.latitude, pos.longitude);
        if (nearest != null) {
          siteId = nearest['id'];
          siteName = nearest['name'];
          city = siteName;
          setSelectedSite(nearest);
        }
      }
      
      if (siteId == null) {
        city = await LocationService.reverseGeocodeCity(pos.latitude, pos.longitude);
        if (city != null) {
          final autoSite = await LocationService.ensureSiteForCity(city, pos.latitude, pos.longitude);
          if (autoSite != null) {
            siteId = autoSite['id'];
            siteName = autoSite['name'];
            setSelectedSite(autoSite);
          }
        }
      }
    }
    
    final user = AuthService.currentUser;
    if (user != null) {
      try {
        final data = await Supabase.instance.client.from('shifts').insert({
          'user_id': user.id,
          'site_id': siteId,
          'site_name': siteName,
          'status': 'working',
          'started_at': _shiftStart!.toUtc().toIso8601String(),
          'lunch_total_ms': 0,
          'lunch_intervals': [],
          'start_lat': pos?.latitude,
          'start_lng': pos?.longitude,
          'start_city': city,
        }).select('id').single();
        _shiftId = data['id'];
      } catch (e) {
        // Ignored, network error handled implicitly
      }
    }
    
    _saveState();
    notifyListeners();
  }

  Future<void> startLunch() async {
    if (_status != ShiftStatus.working) return;
    _status = ShiftStatus.lunch;
    _lunchStart = DateTime.now();
    _saveState();
    notifyListeners();
    
    if (_shiftId != null) {
      try {
        await Supabase.instance.client.from('shifts').update({
          'status': 'lunch',
          'lunch_started_at': _lunchStart!.toUtc().toIso8601String(),
        }).eq('id', _shiftId!);
      } catch (_) {}
    }
  }

  Future<void> endLunch() async {
    if (_status != ShiftStatus.lunch || _lunchStart == null) return;
    _status = ShiftStatus.working;
    final end = DateTime.now();
    _lunchAccumMs += end.difference(_lunchStart!).inMilliseconds;
    _lunchIntervals.add({
      'start': _lunchStart!.millisecondsSinceEpoch,
      'end': end.millisecondsSinceEpoch,
    });
    _lunchStart = null;
    _saveState();
    notifyListeners();
    
    if (_shiftId != null) {
      try {
        await Supabase.instance.client.from('shifts').update({
          'status': 'working',
          'lunch_started_at': null,
          'lunch_total_ms': _lunchAccumMs,
          'lunch_intervals': _lunchIntervals,
        }).eq('id', _shiftId!);
      } catch (_) {}
    }
  }

  void applyAutoLunch() {
    _lunchAccumMs += 30 * 60 * 1000; // 30 minutes
    _autoLunchApplied = true;
    _saveState();
  }

  void keepNoLunch() {
    _autoLunchApplied = true;
    _saveState();
  }

  Future<void> endShift() async {
    if (_status == ShiftStatus.idle) return;
    
    if (_status == ShiftStatus.lunch) {
      await endLunch();
    }
    
    final pos = await LocationService.getCurrentPosition();
    
    _status = ShiftStatus.finished;
    _shiftEnd = DateTime.now();
    _saveState();
    notifyListeners();
    
    String? city;
    if (pos != null) {
      city = await LocationService.reverseGeocodeCity(pos.latitude, pos.longitude);
      if (city != null) {
        await LocationService.ensureSiteForCity(city, pos.latitude, pos.longitude);
      }
    }
    
    if (_shiftId != null) {
      try {
        await Supabase.instance.client.from('shifts').update({
          'status': 'finished',
          'ended_at': _shiftEnd!.toUtc().toIso8601String(),
          'lunch_started_at': null,
          'lunch_total_ms': _lunchAccumMs,
          'lunch_intervals': _lunchIntervals,
          'end_lat': pos?.latitude,
          'end_lng': pos?.longitude,
          'end_city': city,
        }).eq('id', _shiftId!);
        _shiftId = null;
        _saveState();
      } catch (_) {}
    }
  }

  Future<void> resetShift() async {
    _status = ShiftStatus.idle;
    _shiftStart = null;
    _shiftEnd = null;
    _lunchStart = null;
    _lunchAccumMs = 0;
    _lunchIntervals = [];
    _shiftId = null;
    _autoLunchApplied = false;
    _isAdminView = false;
    
    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool('is_admin_view', false);

    _saveState();
    notifyListeners();
  }

  @override
  void dispose() {
    _timer?.cancel();
    super.dispose();
  }
}

