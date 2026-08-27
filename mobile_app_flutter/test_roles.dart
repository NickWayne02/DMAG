import 'package:supabase/supabase.dart';
import 'dart:io';

void main() async {
  final supabaseUrl = 'YOUR_URL';
  final supabaseKey = 'YOUR_KEY';
  
  final file = File('.env');
  final lines = await file.readAsLines();
  String url = '';
  String key = '';
  for (var line in lines) {
    if (line.startsWith('VITE_SUPABASE_URL=')) url = line.split('=')[1];
    if (line.startsWith('VITE_SUPABASE_ANON_KEY=')) key = line.split('=')[1];
  }

  final client = SupabaseClient(url, key);
  final res = await client.from('user_roles').select();
  print(res);
}
