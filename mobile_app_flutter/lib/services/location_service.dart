import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:geolocator/geolocator.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

class LocationService {
  /// Request permissions and get current position
  static Future<Position?> getCurrentPosition() async {
    try {
      bool serviceEnabled = await Geolocator.isLocationServiceEnabled();
      if (!serviceEnabled) return await _getIpBasedPosition();
      
      LocationPermission permission = await Geolocator.checkPermission();
      if (permission == LocationPermission.denied) {
        permission = await Geolocator.requestPermission();
        if (permission == LocationPermission.denied) return await _getIpBasedPosition();
      }
      if (permission == LocationPermission.deniedForever) return await _getIpBasedPosition();
      
      try {
        return await Geolocator.getCurrentPosition(
          desiredAccuracy: LocationAccuracy.high,
          timeLimit: const Duration(seconds: 15),
        );
      } catch (_) {
        return await _getIpBasedPosition();
      }
    } catch (_) {
      return await _getIpBasedPosition();
    }
  }

  static Future<Position?> _getIpBasedPosition() async {
    try {
      final response = await http.get(Uri.parse('http://ip-api.com/json/?fields=lat,lon'));
      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        if (data['lat'] != null && data['lon'] != null) {
          return Position(
            longitude: data['lon'].toDouble(),
            latitude: data['lat'].toDouble(),
            timestamp: DateTime.now(),
            accuracy: 1000,
            altitude: 0,
            altitudeAccuracy: 0,
            heading: 0,
            headingAccuracy: 0,
            speed: 0,
            speedAccuracy: 0,
          );
        }
      }
    } catch (_) {}
    return null;
  }

  /// Reverse geocode coords to city name via OpenStreetMap Nominatim
  static Future<String?> reverseGeocodeCity(double lat, double lon) async {
    if (lat == 0 && lon == 0) return null;
    
    try {
      final url = Uri.parse('https://nominatim.openstreetmap.org/reverse?format=json&lat=$lat&lon=$lon&accept-language=ru');
      final response = await http.get(url, headers: {'User-Agent': 'DMAG-App/2.0'});
      
      if (response.statusCode == 200) {
        final stringData = utf8.decode(response.bodyBytes);
        final json = jsonDecode(stringData);
        final address = json['address'];
        if (address != null) {
          return address['city'] ?? 
                 address['town'] ?? 
                 address['village'] ?? 
                 address['hamlet'] ?? 
                 json['name'];
        }
      }
    } catch (_) {}
    return null;
  }

  /// Calculates distance between two coords in meters
  static double getDistance(double lat1, double lon1, double lat2, double lon2) {
    return Geolocator.distanceBetween(lat1, lon1, lat2, lon2);
  }

  /// Find nearest site within 1000m from Supabase DB
  static Future<Map<String, dynamic>?> findNearestSite(double lat, double lon) async {
    try {
      final response = await Supabase.instance.client.from('sites').select('id, name, address');
      
      Map<String, dynamic>? nearestSite;
      double minDistance = 1000.0; // Max radius 1km
      
      for (final site in response) {
        final address = site['address'] as String?;
        if (address != null && address.startsWith('GPS: ')) {
          final parts = address.replaceFirst('GPS: ', '').split(',');
          if (parts.length >= 2) {
            final siteLat = double.tryParse(parts[0].trim());
            final siteLon = double.tryParse(parts[1].trim());
            
            if (siteLat != null && siteLon != null) {
              final dist = getDistance(lat, lon, siteLat, siteLon);
              if (dist < minDistance) {
                minDistance = dist;
                nearestSite = site;
              }
            }
          }
        }
      }
      return nearestSite;
    } catch (_) {
      return null;
    }
  }

  /// Ensure a site exists for the city (auto-creates if missing)
  static Future<Map<String, dynamic>?> ensureSiteForCity(String city, double lat, double lon) async {
    try {
      final supabase = Supabase.instance.client;
      final existing = await supabase.from('sites').select('id, name, address').ilike('name', city).limit(1).maybeSingle();
      if (existing != null) return existing;
      
      final created = await supabase.from('sites').insert({
        'name': city,
        'address': 'GPS: ${lat.toStringAsFixed(5)}, ${lon.toStringAsFixed(5)}',
        'customer': 'GPS Auto',
        'created_by': supabase.auth.currentUser?.id,
      }).select('id, name, address').single();
      
      return created;
    } catch (e) {
      print('ensureSiteForCity error: $e');
      throw Exception('Не удалось создать объект: $e');
    }
  }
}
