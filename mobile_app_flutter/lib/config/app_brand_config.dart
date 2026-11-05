class AppBrandConfig {
  static const String brand = String.fromEnvironment('APP_BRAND', defaultValue: 'dmag');

  static const String supabaseUrl = String.fromEnvironment(
    'SUPABASE_URL',
    defaultValue: 'https://mqhdajaefuyifuqeudyh.supabase.co',
  );

  static const String supabaseAnonKey = String.fromEnvironment(
    'SUPABASE_ANON_KEY',
    defaultValue:
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1xaGRhamFlZnV5aWZ1cWV1ZHloIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ4MDIwNjIsImV4cCI6MjEwMDM3ODA2Mn0.-tpkwT18V53IvgqCVa8VghonHjBfTReDsBuPWBnHLEY',
  );

  static const String supportPhone = String.fromEnvironment(
    'SUPPORT_PHONE',
    defaultValue: '+4927344346048',
  );

  static const String authEmailDomain = String.fromEnvironment(
    'AUTH_EMAIL_DOMAIN',
    defaultValue: 'dmag.de',
  );

  static bool get isER => brand.toLowerCase() == 'er';

  static String get defaultAppName => isER ? 'E&R' : 'DMAG';

  static String get defaultLogoAsset => isER ? 'assets/er_logo.png' : 'assets/dmag_logo.png';

  static String get packageId => isER ? 'com.factory.app.er' : 'com.factory.app';
}
