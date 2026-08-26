import 'package:provider/provider.dart';
import 'package:mobile_app_flutter/providers/locale_provider.dart';
import 'package:flutter/material.dart';
import '../../../utils/transliteration.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:flutter_lucide/flutter_lucide.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

class ReadOnlyCalendarDialog extends StatefulWidget {
  final String employeeId;
  final String employeeName;

  const ReadOnlyCalendarDialog({
    Key? key,
    required this.employeeId,
    required this.employeeName,
  }) : super(key: key);

  @override
  State<ReadOnlyCalendarDialog> createState() => _ReadOnlyCalendarDialogState();
}

class _ReadOnlyCalendarDialogState extends State<ReadOnlyCalendarDialog> {
  DateTime _currentDate = DateTime(DateTime.now().year, DateTime.now().month, 1);
  List<Map<String, dynamic>> _shifts = [];
  bool _isLoading = true;
  int _totalWorkedMsMonth = 0;

  @override
  void initState() {
    super.initState();
    _fetchShifts();
  }

  Future<void> _fetchShifts() async {
    setState(() => _isLoading = true);
    try {
      final startOfMonth = DateTime(_currentDate.year, _currentDate.month, 1);
      final endOfMonth = DateTime(_currentDate.year, _currentDate.month + 1, 0, 23, 59, 59);

      final shiftsResp = await Supabase.instance.client
          .from('shifts')
          .select('started_at, ended_at, lunch_total_ms')
          .eq('user_id', widget.employeeId)
          .gte('started_at', startOfMonth.toUtc().toIso8601String())
          .lte('started_at', endOfMonth.toUtc().toIso8601String());

      int totalMs = 0;
      final shiftsList = List<Map<String, dynamic>>.from(shiftsResp);
      
      for (var s in shiftsList) {
        if (s['ended_at'] != null) {
          final start = DateTime.parse(s['started_at']);
          final end = DateTime.parse(s['ended_at']);
          final diff = end.difference(start).inMilliseconds;
          final lunch = s['lunch_total_ms'] ?? 0;
          totalMs += (diff - lunch as int);
        }
      }

      setState(() {
        _shifts = shiftsList;
        _totalWorkedMsMonth = totalMs > 0 ? totalMs : 0;
        _isLoading = false;
      });
    } catch (e) {
      setState(() => _isLoading = false);
    }
  }

  void _changeMonth(int delta) {
    setState(() {
      _currentDate = DateTime(_currentDate.year, _currentDate.month + delta, 1);
    });
    _fetchShifts();
  }

  String _formatHM(int ms) {
    int h = ms ~/ 3600000;
    int m = (ms % 3600000) ~/ 60000;
    return '${h}ч ${m.toString().padLeft(2, '0')}м';
  }

  @override
  Widget build(BuildContext context) {
    final months = (context.watch<LocaleProvider>().t('calendar.months') ?? 'Январь,Февраль,Март,Апрель,Май,Июнь,Июль,Август,Сентябрь,Октябрь,Ноябрь,Декабрь').split(',');
    final monthStr = '${months[_currentDate.month - 1]} ${_currentDate.year}';

    int daysInMonth = DateTime(_currentDate.year, _currentDate.month + 1, 0).day;
    int firstWeekday = DateTime(_currentDate.year, _currentDate.month, 1).weekday; // 1 = Mon
    int emptyCells = firstWeekday - 1;

    return Dialog(
      backgroundColor: Colors.transparent,
      insetPadding: const EdgeInsets.all(16),
      child: Container(
        width: double.infinity,
        padding: const EdgeInsets.all(20),
        decoration: BoxDecoration(
          color: Colors.black, // Dialog background matching the screenshot
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: Colors.white12),
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.center,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.center,
                    children: [
                      Text(
                        '''${context.read<LocaleProvider>().t('admin.calendar.title') ?? 'Календарь — '}${TransliterationService.transliterateIfNeeded(TransliterationService.transliterateIfNeeded(widget.employeeName, context.read<LocaleProvider>().currentLang), context.read<LocaleProvider>().currentLang)}''',
                        textAlign: TextAlign.center,
                        style: GoogleFonts.inter(color: Colors.white, fontSize: 18, fontWeight: FontWeight.bold),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        'Отработано за месяц: ${_isLoading ? '...' : _formatHM(_totalWorkedMsMonth)}',
                        textAlign: TextAlign.center,
                        style: GoogleFonts.inter(color: Colors.white70, fontSize: 13),
                      ),
                    ],
                  ),
                ),
                GestureDetector(
                  onTap: () => Navigator.pop(context),
                  child: const Icon(LucideIcons.x, color: Colors.white54, size: 20),
                )
              ],
            ),
            const SizedBox(height: 24),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                GestureDetector(
                  onTap: () => _changeMonth(-1),
                  child: const Padding(
                    padding: EdgeInsets.all(8.0),
                    child: Icon(LucideIcons.chevron_left, color: Colors.white, size: 20),
                  ),
                ),
                Text(
                  monthStr,
                  style: GoogleFonts.inter(color: Colors.white, fontSize: 16, fontWeight: FontWeight.bold),
                ),
                GestureDetector(
                  onTap: () => _changeMonth(1),
                  child: const Padding(
                    padding: EdgeInsets.all(8.0),
                    child: Icon(LucideIcons.chevron_right, color: Colors.white, size: 20),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 24),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceAround,
              children: (context.watch<LocaleProvider>().t('calendar.days_short') ?? 'Пн,Вт,Ср,Чт,Пт,Сб,Вс').split(',').map((day) {
                return SizedBox(
                  width: 36,
                  child: Center(
                    child: Text(
                      day,
                      style: GoogleFonts.inter(color: const Color(0xFF94a3b8), fontSize: 14, fontWeight: FontWeight.w600),
                    ),
                  ),
                );
              }).toList(),
            ),
            const SizedBox(height: 16),
            if (_isLoading)
              const SizedBox(
                height: 300,
                child: Center(child: CircularProgressIndicator(color: Colors.cyan)),
              )
            else
              GridView.builder(
                shrinkWrap: true,
                physics: const NeverScrollableScrollPhysics(),
                gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                  crossAxisCount: 7,
                  mainAxisSpacing: 8,
                  crossAxisSpacing: 4,
                  childAspectRatio: 0.5, // Taller cells for text
                ),
                itemCount: emptyCells + daysInMonth,
                itemBuilder: (context, index) {
                  if (index < emptyCells) return const SizedBox();
                  int day = index - emptyCells + 1;
                  DateTime date = DateTime(_currentDate.year, _currentDate.month, day);
                  
                  // Find shifts for this day
                  List<Map<String, dynamic>> dayShifts = _shifts.where((s) {
                    final start = DateTime.parse(s['started_at']).toLocal();
                    return start.year == date.year && start.month == date.month && start.day == date.day;
                  }).toList();

                  Map<String, dynamic>? primaryShift = dayShifts.isNotEmpty ? dayShifts.first : null;

                  String timesText = '';
                  String durationText = '';
                  bool hasShift = primaryShift != null;
                  
                  if (hasShift) {
                    final start = DateTime.parse(primaryShift['started_at']).toLocal();
                    String startStr = '${start.hour.toString().padLeft(2, '0')}:${start.minute.toString().padLeft(2, '0')}';
                    String endStr = '—';
                    
                    if (primaryShift['ended_at'] == null) {
                      timesText = '''$startStr-\n${context.read<LocaleProvider>().t('admin.calendar.active') ?? 'Активна'}''';
                      durationText = '...';
                    } else {
                      final end = DateTime.parse(primaryShift['ended_at']).toLocal();
                      endStr = '${end.hour.toString().padLeft(2, '0')}:${end.minute.toString().padLeft(2, '0')}';
                      timesText = '$startStr-\n$endStr';
                      
                      final diffMs = end.difference(start).inMilliseconds;
                      final lunchMs = primaryShift['lunch_total_ms'] ?? 0;
                      final workMs = diffMs - lunchMs;
                      
                      final hours = workMs ~/ 3600000;
                      final mins = (workMs % 3600000) ~/ 60000;
                      durationText = '${hours}${context.watch<LocaleProvider>().t(\'history.h\') ?? \'ч\'} ${mins}${context.watch<LocaleProvider>().t(\'history.m\') ?? \'м\'}';
                    }
                  }
                  
                  return Container(
                    decoration: BoxDecoration(
                      color: hasShift ? Colors.white.withOpacity(0.05) : Colors.transparent,
                      borderRadius: BorderRadius.circular(8),
                      border: hasShift ? Border.all(color: Colors.white12) : null,
                    ),
                    padding: const EdgeInsets.all(4),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.center,
                      mainAxisAlignment: MainAxisAlignment.start,
                      children: [
                        Text(
                          day.toString(),
                          style: GoogleFonts.inter(
                            color: hasShift ? Colors.white : Colors.white.withOpacity(0.4), 
                            fontSize: 14, 
                            fontWeight: hasShift ? FontWeight.bold : FontWeight.normal
                          ),
                        ),
                        if (hasShift) ...[
                          const SizedBox(height: 4),
                          Text(timesText, textAlign: TextAlign.center, style: GoogleFonts.inter(color: Colors.white54, fontSize: 9, height: 1.1)),
                          const SizedBox(height: 4),
                          Text(durationText, textAlign: TextAlign.center, style: GoogleFonts.inter(color: Colors.white, fontSize: 10, fontWeight: FontWeight.bold, height: 1.1)),
                        ]
                      ],
                    ),
                  );
                },
              ),
          ],
        ),
      ),
    );
  }
}
