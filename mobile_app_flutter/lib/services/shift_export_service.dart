import 'dart:io';
import 'package:flutter/foundation.dart';
import 'package:universal_html/html.dart' as html;
import 'package:excel/excel.dart';
import 'package:pdf/pdf.dart';
import 'package:pdf/widgets.dart' as pw;
import 'package:printing/printing.dart';
import 'package:path_provider/path_provider.dart';
import 'package:share_plus/share_plus.dart';

class ExportRow {
  final String date;
  final String employee;
  final String site;
  final String workStart;
  final String pauseStart;
  final String pauseEnd;
  final String workEnd;
  final int pauseMin;
  final String workedHM;

  ExportRow({
    required this.date,
    required this.employee,
    required this.site,
    required this.workStart,
    required this.pauseStart,
    required this.pauseEnd,
    required this.workEnd,
    required this.pauseMin,
    required this.workedHM,
  });
}

class ShiftExportService {

  static String _pad(int n) => n.toString().padLeft(2, '0');

  static String _fmtDate(String? iso) {
    if (iso == null || iso.isEmpty) return '';
    final d = DateTime.tryParse(iso)?.toLocal();
    if (d == null) return '';
    return '${_pad(d.day)}.${_pad(d.month)}.${d.year}';
  }

  static String _fmtTime(DateTime? d) {
    if (d == null) return '';
    return '${_pad(d.hour)}:${_pad(d.minute)}';
  }

  static String _translit(String str, String lang) {
    if (str.isEmpty) return '';
    final isCyrillic = ['ru', 'bg', 'uk', 'tg'].contains(lang);
    if (isCyrillic) return str;
    
    const map = {
      'а': 'a', 'б': 'b', 'в': 'v', 'г': 'g', 'д': 'd', 'е': 'e', 'ё': 'yo', 'ж': 'zh', 'з': 'z', 'и': 'i', 'й': 'y',
      'к': 'k', 'л': 'l', 'м': 'm', 'н': 'n', 'о': 'o', 'п': 'p', 'р': 'r', 'с': 's', 'т': 't', 'у': 'u', 'ф': 'f',
      'х': 'kh', 'ц': 'ts', 'ч': 'ch', 'ш': 'sh', 'щ': 'shch', 'ъ': '', 'ы': 'y', 'ь': '', 'э': 'e', 'ю': 'yu', 'я': 'ya',
      'А': 'A', 'Б': 'B', 'В': 'V', 'Г': 'G', 'Д': 'D', 'Е': 'E', 'Ё': 'Yo', 'Ж': 'Zh', 'З': 'Z', 'И': 'I', 'Й': 'Y',
      'К': 'K', 'Л': 'L', 'М': 'M', 'Н': 'N', 'О': 'O', 'П': 'P', 'Р': 'R', 'С': 'S', 'Т': 'T', 'У': 'U', 'Ф': 'F',
      'Х': 'Kh', 'Ц': 'Ts', 'Ч': 'Ch', 'Ш': 'Sh', 'Щ': 'Shch', 'Ъ': '', 'Ы': 'Y', 'Ь': '', 'Э': 'E', 'Ю': 'Yu', 'Я': 'Ya'
    };
    
    return str.split('').map((char) => map[char] ?? char).join('');
  }

  static String _fmtHM(int ms, String lang) {
    int minutes = (ms / 60000).floor();
    if (minutes < 0) minutes = 0;
    int h = (minutes / 60).floor();
    String m = _pad(minutes % 60);
    const map = {
      'ru': {'h': 'ч', 'm': 'м'},
      'en': {'h': 'h', 'm': 'm'},
      'de': {'h': 'Std', 'm': 'Min'},
      'ro': {'h': 'ore', 'm': 'min'},
      'bg': {'h': 'ч', 'm': 'м'},
      'pl': {'h': 'godz', 'm': 'min'},
      'uk': {'h': 'год', 'm': 'хв'},
      'uz': {'h': 'soat', 'm': 'daq'},
      'tg': {'h': 'с', 'm': 'д'}
    };
    final tr = map[lang] ?? {'h': 'h', 'm': 'm'};
    return '${h}${tr['h']} ${m}${tr['m']}';
  }

  static List<ExportRow> _toExportRows(List<Map<String, dynamic>> shifts, List<Map<String, dynamic>> employees, List<Map<String, dynamic>> sites, String lang) {
    return shifts.map((s) {
      final startedAt = DateTime.tryParse(s['started_at'] ?? '')?.toLocal();
      final endedAt = s['ended_at'] != null ? DateTime.tryParse(s['ended_at'])?.toLocal() : null;
      
      final startedMs = startedAt?.millisecondsSinceEpoch ?? 0;
      final endedMs = endedAt?.millisecondsSinceEpoch ?? DateTime.now().millisecondsSinceEpoch;
      
      int lunchMs = 0;
      if (s['lunch_total_ms'] != null) {
        lunchMs = s['lunch_total_ms'] is int ? s['lunch_total_ms'] : int.tryParse(s['lunch_total_ms'].toString()) ?? 0;
      }
      
      final workedMs = (endedMs - startedMs - lunchMs).clamp(0, double.infinity).toInt();
      
      // employee name
      String empName = s['user_id']?.toString() ?? '';
      final emp = employees.firstWhere((e) => e['id'] == s['user_id'], orElse: () => <String, dynamic>{});
      if (emp.isNotEmpty) {
        empName = emp['full_name'] ?? empName;
      }

      // site name
      String siteName = '—';
      if (s['site_id'] != null) {
        final site = sites.firstWhere((st) => st['id'] == s['site_id'], orElse: () => <String, dynamic>{});
        if (site.isNotEmpty) {
          siteName = site['name'] ?? '—';
        } else if (s['site_name'] != null) {
          siteName = s['site_name'];
        }
      }

      // We don't have full intervals in Flutter yet, we'll leave pause Start/End blank for now unless we query them
      // Assuming we just use the lunch_started_at if available
      DateTime? pauseStart;
      if (s['lunch_started_at'] != null) {
        pauseStart = DateTime.tryParse(s['lunch_started_at'])?.toLocal();
      }

      return ExportRow(
        date: _fmtDate(s['started_at']),
        employee: empName,
        site: siteName,
        workStart: _fmtTime(startedAt),
        pauseStart: _fmtTime(pauseStart),
        pauseEnd: '', // Not tracked precisely in local shift object yet
        workEnd: endedAt != null ? _fmtTime(endedAt) : '…',
        pauseMin: (lunchMs / 60000).round(),
        workedHM: _fmtHM(workedMs, lang),
      );
    }).toList();
  }

  static Future<void> exportExcel(List<Map<String, dynamic>> shifts, List<Map<String, dynamic>> employees, List<Map<String, dynamic>> sites, String filename, {required Map<String, String> t, String lang = 'ru'}) async {
    final rows = _toExportRows(shifts, employees, sites, lang);
    final excel = Excel.createExcel();
    const sheetName = 'Смены';
    final sheet = excel[sheetName];
    excel.setDefaultSheet(sheetName);
    
    final List<String> headers = [
      t['date'] ?? 'Дата',
      t['employee'] ?? 'Сотрудник',
      t['site'] ?? 'Объект',
      t['work_start'] ?? 'Начало работы',
      t['pause_start'] ?? 'Начало паузы',
      t['pause_end'] ?? 'Конец паузы',
      t['work_end'] ?? 'Конец работы',
      t['pause_mins'] ?? 'Пауза (мин)',
      t['worked'] ?? 'Отработано',
    ];

    // Headers
    sheet.appendRow(headers.map((h) => TextCellValue(h)).toList());

    // Rows
    for (var r in rows) {
      sheet.appendRow([
        TextCellValue(r.date),
        TextCellValue(r.employee),
        TextCellValue(r.site),
        TextCellValue(r.workStart),
        TextCellValue(r.pauseStart),
        TextCellValue(r.pauseEnd),
        TextCellValue(r.workEnd),
        TextCellValue(r.pauseMin.toString()),
        TextCellValue(r.workedHM),
      ]);
    }

    final bytes = excel.encode();
    if (bytes != null) {
      await _downloadFile(bytes, filename);
    }
  }

  static Future<void> exportPdf(List<Map<String, dynamic>> shifts, List<Map<String, dynamic>> employees, List<Map<String, dynamic>> sites, String filename, String title, {required Map<String, String> t, String lang = 'ru'}) async {
    final rows = _toExportRows(shifts, employees, sites, lang);
    
    final pdf = pw.Document();
    
    // Load Roboto font from google fonts for Cyrillic support
    final font = await PdfGoogleFonts.robotoRegular();
    final boldFont = await PdfGoogleFonts.robotoBold();

    final List<String> headers = [
      t['date'] ?? 'Дата',
      t['employee'] ?? 'Сотрудник',
      t['site'] ?? 'Объект',
      t['work_start'] ?? 'Начало работы',
      t['pause_start'] ?? 'Начало паузы',
      t['pause_end'] ?? 'Конец паузы',
      t['work_end'] ?? 'Конец работы',
      t['pause_mins'] ?? 'Пауза (мин)',
      t['worked'] ?? 'Отработано',
    ];

    pdf.addPage(
      pw.MultiPage(
        pageFormat: PdfPageFormat.a4.landscape,
        margin: const pw.EdgeInsets.all(32),
        footer: (pw.Context context) {
          return pw.Container(
            alignment: pw.Alignment.centerRight,
            margin: const pw.EdgeInsets.only(top: 10),
            child: pw.Text(
              '${t['page'] ?? 'Страница'} ${context.pageNumber}',
              style: pw.TextStyle(color: const PdfColor.fromInt(0xFF94A3B8), fontSize: 9, font: font),
            ),
          );
        },
        build: (pw.Context context) {
          return [
            pw.Text(title, style: pw.TextStyle(font: boldFont, fontSize: 18, color: const PdfColor.fromInt(0xFF1E293B))),
            pw.SizedBox(height: 8),
            pw.Text('${t['generatedAt'] ?? 'Сформировано'}: ${DateTime.now().toString()}', style: pw.TextStyle(font: font, fontSize: 10, color: const PdfColor.fromInt(0xFF64748B))),
            pw.SizedBox(height: 20),
            pw.TableHelper.fromTextArray(
              headers: headers,
              data: rows.map((r) => [
                r.date,
                r.employee,
                r.site,
                r.workStart,
                r.pauseStart,
                r.pauseEnd,
                r.workEnd,
                r.pauseMin.toString(),
                r.workedHM,
              ]).toList(),
              headerStyle: pw.TextStyle(font: boldFont, color: const PdfColor.fromInt(0xFF0F172A), fontSize: 10),
              headerDecoration: const pw.BoxDecoration(color: PdfColor.fromInt(0xFFF8FAFC)), // slate-50
              cellStyle: pw.TextStyle(font: font, fontSize: 9, color: const PdfColor.fromInt(0xFF334155)), // slate-700
              cellAlignment: pw.Alignment.center,
              cellPadding: const pw.EdgeInsets.all(8),
              oddRowDecoration: const pw.BoxDecoration(color: PdfColor.fromInt(0xFFF8FAFC)),
              border: pw.TableBorder.all(color: const PdfColor.fromInt(0xFFE2E8F0), width: 0.5), // slate-200
            ),
          ];
        },
      ),
    );

    final bytes = await pdf.save();
    await _downloadFile(bytes, filename);
  }

  static Future<void> _downloadFile(List<int> bytes, String filename) async {
    if (kIsWeb) {
      final blob = html.Blob([Uint8List.fromList(bytes)]);
      final url = html.Url.createObjectUrlFromBlob(blob);
      final anchor = html.document.createElement('a') as html.AnchorElement
        ..href = url
        ..style.display = 'none'
        ..download = filename;
      
      html.document.body?.children.add(anchor);
      anchor.click();
      html.document.body?.children.remove(anchor);
      html.Url.revokeObjectUrl(url);
    } else {
      final tempDir = await getTemporaryDirectory();
      final file = File('${tempDir.path}/$filename');
      await file.writeAsBytes(bytes);
      // ignore: deprecated_member_use
      await Share.shareXFiles([XFile(file.path)], text: 'Export: $filename');
    }
  }
}

