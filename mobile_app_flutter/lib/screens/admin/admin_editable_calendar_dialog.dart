import 'package:provider/provider.dart';
import 'package:mobile_app_flutter/providers/locale_provider.dart';
import 'package:flutter/material.dart';
import '../../theme/app_theme.dart';
import '../../utils/transliteration.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:flutter_lucide/flutter_lucide.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'tabs/calendar_tab.dart'; // To reuse EditShiftDialog

class AdminEditableCalendarDialog extends StatefulWidget {
  final String employeeId;
  final String employeeName;

  const AdminEditableCalendarDialog({
    super.key,
    required this.employeeId,
    required this.employeeName,
  });

  static Future<void> show(BuildContext context, {required String employeeId, required String employeeName}) {
    return showDialog(
      context: context,
      builder: (_) => AdminEditableCalendarDialog(employeeId: employeeId, employeeName: employeeName),
    );
  }

  @override
  State<AdminEditableCalendarDialog> createState() => _AdminEditableCalendarDialogState();
}

class _AdminEditableCalendarDialogState extends State<AdminEditableCalendarDialog> {
  DateTime _currentDate = DateTime(DateTime.now().year, DateTime.now().month, 1);
  List<Map<String, dynamic>> _shifts = [];
  List<Map<String, dynamic>> _sites = [];
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _fetchInitialData();
  }

  Future<void> _fetchInitialData() async {
    setState(() => _isLoading = true);
    try {
      final sitesResp = await Supabase.instance.client.from('sites').select('id, name');
      final sites = List<Map<String, dynamic>>.from(sitesResp);
      sites.sort((a, b) => (a['name'] ?? '').compareTo(b['name'] ?? ''));
      _sites = sites;

      await _fetchShifts();
    } catch (e) {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  Future<void> _fetchShifts() async {
    setState(() => _isLoading = true);
    try {
      final startOfMonth = DateTime(_currentDate.year, _currentDate.month, 1);
      final endOfMonth = DateTime(_currentDate.year, _currentDate.month + 1, 0, 23, 59, 59);

      final shiftsResp = await Supabase.instance.client
          .from('shifts')
          .select()
          .eq('user_id', widget.employeeId)
          .gte('started_at', startOfMonth.toUtc().toIso8601String())
          .lte('started_at', endOfMonth.toUtc().toIso8601String());

      setState(() {
        _shifts = List<Map<String, dynamic>>.from(shiftsResp);
        _isLoading = false;
      });
    } catch (e) {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  void _changeMonth(int delta) {
    setState(() {
      _currentDate = DateTime(_currentDate.year, _currentDate.month + delta, 1);
    });
    _fetchShifts();
  }

  void _showEditShiftModal(BuildContext context, Map<String, dynamic> shift) {
    final nav = Navigator.of(context, rootNavigator: true);
    nav.pop(); // Hide the calendar dialog
    showDialog(
      context: nav.context,
      builder: (ctx) {
        return EditShiftDialog(
          shift: shift,
          employeeName: widget.employeeName,
          sites: _sites,
          onSaved: () {}, // No need to refresh calendar since it's closed
        );
      },
    );
  }

  Widget _buildMonthNavButton(String text, IconData icon, bool left, VoidCallback onTap) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
        decoration: BoxDecoration(
          color: Theme.of(context).cardColor,
          borderRadius: BorderRadius.circular(20),
          border: Border.all(color: Theme.of(context).appColors.foreground.withValues(alpha: 0.12)),
        ),
        child: Row(
          children: [
            if (left) Icon(icon, color: Theme.of(context).appColors.foreground, size: 16),
            if (left) const SizedBox(width: 4),
            Text(text, style: GoogleFonts.inter(color: Theme.of(context).appColors.foreground, fontSize: 12, fontWeight: FontWeight.bold)),
            if (!left) const SizedBox(width: 4),
            if (!left) Icon(icon, color: Theme.of(context).appColors.foreground, size: 16),
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final monthsStr = context.watch<LocaleProvider>().t('calendar.months') ?? 'Январь,Февраль,Март,Апрель,Май,Июнь,Июль,Август,Сентябрь,Октябрь,Ноябрь,Декабрь';
    final months = monthsStr.split(',');
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
          color: Theme.of(context).cardColor,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: Theme.of(context).appColors.foreground.withValues(alpha: 0.12)),
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text('${context.watch<LocaleProvider>().t('calendar.manage_shifts') ?? 'Управление сменами'} · ${TransliterationService.transliterateIfNeeded(widget.employeeName, context.read<LocaleProvider>().currentLang)}', style: GoogleFonts.inter(color: Theme.of(context).appColors.foreground, fontSize: 18, fontWeight: FontWeight.bold)),
                      const SizedBox(height: 4),
                      Text(context.watch<LocaleProvider>().t('calendar.click_to_edit') ?? 'Нажмите на любой день, чтобы добавить или отредактировать смену.', style: GoogleFonts.inter(color: Theme.of(context).appColors.foreground.withValues(alpha: 0.54), fontSize: 12)),
                    ],
                  ),
                ),
                GestureDetector(
                  onTap: () => Navigator.pop(context),
                  child: Icon(LucideIcons.x, color: Theme.of(context).appColors.foreground.withValues(alpha: 0.54), size: 24),
                ),
              ],
            ),
            const SizedBox(height: 24),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                _buildMonthNavButton(context.watch<LocaleProvider>().t('calendar.prev') ?? 'Пред.', LucideIcons.chevron_left, true, () => _changeMonth(-1)),
                Text(
                  monthStr,
                  style: GoogleFonts.inter(color: Theme.of(context).appColors.foreground, fontSize: 16, fontWeight: FontWeight.bold),
                ),
                _buildMonthNavButton(context.watch<LocaleProvider>().t('calendar.next') ?? 'След.', LucideIcons.chevron_right, false, () => _changeMonth(1)),
              ],
            ),
            const SizedBox(height: 24),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceAround,
              children: (context.watch<LocaleProvider>().t('calendar.days_short') ?? 'Пн,Вт,Ср,Чт,Пт,Сб,Вс').split(',').map((day) {
                return Expanded(
                  child: Center(
                    child: Text(day, style: GoogleFonts.inter(color: Theme.of(context).appColors.foreground.withValues(alpha: 0.54), fontSize: 14, fontWeight: FontWeight.bold)),
                  ),
                );
              }).toList(),
            ),
            const SizedBox(height: 12),
            if (_isLoading)
              const Expanded(child: Center(child: CircularProgressIndicator(color: Colors.cyan)))
            else
              Expanded(
                child: GridView.builder(
                  shrinkWrap: true,
                  gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                    crossAxisCount: 7,
                    mainAxisSpacing: 8,
                    crossAxisSpacing: 8,
                    childAspectRatio: 0.55,
                  ),
                  itemCount: emptyCells + daysInMonth,
                  itemBuilder: (context, index) {
                    if (index < emptyCells) return const SizedBox.shrink();
                    final day = index - emptyCells + 1;
                    final date = DateTime(_currentDate.year, _currentDate.month, day);
                    
                    final dayShifts = _shifts.where((s) {
                      final st = DateTime.parse(s['started_at']).toLocal();
                      return st.year == date.year && st.month == date.month && st.day == date.day;
                    }).toList();

                    return _buildDayCell(day, dayShifts, date);
                  },
                ),
              ),
          ],
        ),
      ),
    );
  }

  Widget _buildDayCell(int day, List<Map<String, dynamic>> dayShifts, DateTime date) {
    bool hasShifts = dayShifts.isNotEmpty;
    return GestureDetector(
      onTap: () {
        if (hasShifts) {
          _showEditShiftModal(context, dayShifts.first);
        } else {
          ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(context.read<LocaleProvider>().t('calendar.no_shifts') ?? 'В этот день нет смен')));
        }
      },
      child: Container(
        decoration: BoxDecoration(
          color: Theme.of(context).cardColor,
          borderRadius: BorderRadius.circular(12),
          border: hasShifts ? Border.all(color: Theme.of(context).appColors.foreground.withValues(alpha: 0.24), width: 1) : null,
        ),
        padding: const EdgeInsets.all(4),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              day.toString(),
              style: GoogleFonts.inter(color: Theme.of(context).appColors.foreground.withValues(alpha: 0.7), fontSize: 14, fontWeight: FontWeight.bold),
            ),
            if (hasShifts) ...[
              const SizedBox(height: 2),
              Expanded(child: _buildShiftSnippet(dayShifts.first)),
            ]
          ],
        ),
      ),
    );
  }

  Widget _buildShiftSnippet(Map<String, dynamic> shift) {
    final st = DateTime.parse(shift['started_at']).toLocal();
    final et = shift['ended_at'] != null ? DateTime.parse(shift['ended_at']).toLocal() : null;
    final stStr = '${st.hour.toString().padLeft(2, '0')}:${st.minute.toString().padLeft(2, '0')}';
    
    int durationMs = 0;
    if (et != null) {
      durationMs = et.difference(st).inMilliseconds;
    } else {
      durationMs = DateTime.now().difference(st).inMilliseconds;
    }
    int lunchMs = shift['lunch_total_ms'] ?? 0;
    int workMs = (durationMs - lunchMs).clamp(0, 999999999999);
    
    int hours = workMs ~/ 3600000;
    int mins = (workMs % 3600000) ~/ 60000;
    
    return FittedBox(
      fit: BoxFit.scaleDown,
      alignment: Alignment.topLeft,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(stStr, style: GoogleFonts.inter(color: Theme.of(context).appColors.foreground.withValues(alpha: 0.54), fontSize: 10)),
          const SizedBox(height: 2),
          Text('$hours${context.watch<LocaleProvider>().t('history.h') ?? 'ч'}\n$mins${context.watch<LocaleProvider>().t('history.m') ?? 'м'}', style: GoogleFonts.inter(color: Theme.of(context).appColors.foreground, fontSize: 11, fontWeight: FontWeight.bold, height: 1.1)),
        ],
      ),
    );
  }
}
