/// Locale-aware date formatting utilities.
/// Maps short language codes to localized month names and provides
/// consistent date formatting across the app.

const Map<String, List<String>> _shortMonths = {
  'ru': ['янв.', 'февр.', 'мар.', 'апр.', 'мая', 'июн.', 'июл.', 'авг.', 'сент.', 'окт.', 'нояб.', 'дек.'],
  'en': ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
  'de': ['Jan.', 'Feb.', 'Mär.', 'Apr.', 'Mai', 'Jun.', 'Jul.', 'Aug.', 'Sep.', 'Okt.', 'Nov.', 'Dez.'],
  'ro': ['ian.', 'feb.', 'mar.', 'apr.', 'mai', 'iun.', 'iul.', 'aug.', 'sep.', 'oct.', 'nov.', 'dec.'],
  'bg': ['яну.', 'фев.', 'мар.', 'апр.', 'май', 'юни', 'юли', 'авг.', 'сеп.', 'окт.', 'ное.', 'дек.'],
  'pl': ['sty.', 'lut.', 'mar.', 'kwi.', 'maj', 'cze.', 'lip.', 'sie.', 'wrz.', 'paź.', 'lis.', 'gru.'],
  'uk': ['січ.', 'лют.', 'бер.', 'квіт.', 'трав.', 'черв.', 'лип.', 'серп.', 'вер.', 'жовт.', 'лист.', 'груд.'],
  'uz': ['yan.', 'fev.', 'mar.', 'apr.', 'may', 'iyun', 'iyul', 'avg.', 'sen.', 'okt.', 'noy.', 'dek.'],
  'tg': ['янв.', 'фев.', 'мар.', 'апр.', 'май', 'июн.', 'июл.', 'авг.', 'сен.', 'окт.', 'ноя.', 'дек.'],
};

class DateFormatHelper {
  /// Format a DateTime as "dd MMM, HH:mm" localized by language code.
  /// Example: "22 Aug., 19:58" (en), "22 авг., 19:58" (ru), "22. Aug., 19:58" (de)
  static String formatShortDate(DateTime dt, String lang) {
    final months = _shortMonths[lang] ?? _shortMonths['en']!;
    final month = months[dt.month - 1];
    final day = dt.day.toString();
    final time = '${dt.hour.toString().padLeft(2, '0')}:${dt.minute.toString().padLeft(2, '0')}';

    if (lang == 'de') {
      return '$day. $month, $time';
    }
    return '$day $month, $time';
  }

  /// Format a DateTime as "dd.MM.yyyy HH:mm" (universal numeric format).
  /// This is locale-independent and used for technical/edit views.
  static String formatDateTime(DateTime dt) {
    return '${dt.day.toString().padLeft(2, '0')}.${dt.month.toString().padLeft(2, '0')}.${dt.year} ${dt.hour.toString().padLeft(2, '0')}:${dt.minute.toString().padLeft(2, '0')}';
  }

  /// Format a DateTime as "dd MMM yyyy" localized by language code.
  /// Example: "22 Aug 2026" (en), "22 авг. 2026" (ru)
  static String formatDate(DateTime dt, String lang) {
    final months = _shortMonths[lang] ?? _shortMonths['en']!;
    final month = months[dt.month - 1];
    final day = dt.day.toString();

    if (lang == 'de') {
      return '$day. $month ${dt.year}';
    }
    return '$day $month ${dt.year}';
  }

  /// Format an ISO 8601 string as "dd.MM.yyyy HH:mm" (parsed to local).
  static String formatIsoDateTime(String isoString) {
    final d = DateTime.parse(isoString).toLocal();
    return formatDateTime(d);
  }

  /// Format an ISO 8601 string as localized short date.
  static String formatIsoShortDate(String isoString, String lang) {
    final d = DateTime.parse(isoString).toLocal();
    return formatShortDate(d, lang);
  }
}
