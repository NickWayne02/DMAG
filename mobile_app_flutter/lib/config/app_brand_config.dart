class AppBrandConfig {
  static const String brand = String.fromEnvironment('APP_BRAND', defaultValue: 'dmag');

  static bool get isER => brand.toLowerCase() == 'er';

  static String get defaultAppName => isER ? 'E&R' : 'DMAG';

  static String get defaultLogoAsset => isER ? 'assets/er_logo.png' : 'assets/dmag_logo.png';

  static String get packageId => isER ? 'com.factory.app.er' : 'com.factory.app';
}

