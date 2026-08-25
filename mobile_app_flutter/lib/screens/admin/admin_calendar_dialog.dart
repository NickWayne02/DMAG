import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:flutter_lucide/flutter_lucide.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'admin_shift_edit_sheet.dart';

class AdminCalendarDialog extends StatefulWidget {
  final String employeeId;
  final String employeeName;

  const AdminCalendarDialog({
    Key? key,
    required this.employeeId,
    required this.employeeName,
  }) : super(key: key);

  static Future<void> show(BuildContext context, String employeeId, String employeeName) {
    return showGeneralDialog(
      context: context,
      barrierDismissible: true,
      barrierLabel: 'AdminCalendar',
      barrierColor: Colors.black.withOpacity(0.7),
      transitionDuration: const Duration(milliseconds: 250),
      pageBuilder: (context, animation, secondaryAnimation) {
        return Align(
          alignment: Alignment.center,
          child: Material(
            color: Colors.transparent,
            child: AdminCalendarDialog(employeeId: employeeId, employeeName: employeeName),
          ),
        );
      },
      transitionBuilder: (context, animation, secondaryAnimation, child) {
        final scaleValue = CurvedAnimation(
          parent: animation,
          curve: Curves.easeOutCubic,
        ).value;
        return FadeTransition(
          opacity: animation,
          child: Transform.scale(
            scale: 0.90 + (0.10 * scaleValue),
            alignment: Alignment.center,
            child: child,
          ),
        );
      },
    );
  }

  @override
  State<AdminCalendarDialog> createState() => _AdminCalendarDialogState();
}

class _AdminCalendarDialogState extends State<AdminCalendarDialog> {
  DateTime _currentDate = DateTime(DateTime.now().year, DateTime.now().month, 1);
  List<Map<String, dynamic>> _shifts = [];
  bool _isLoading = true;

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
          .select('id, user_id, site_id, site_name, started_at, ended_at, lunch_total_ms, start_city, end_city')
          .eq('user_id', widget.employeeId)
          .gte('started_at', startOfMonth.toUtc().toIso8601String())
          .lte('started_at', endOfMonth.toUtc().toIso8601String());

      setState(() {
        _shifts = List<Map<String, dynamic>>.from(shiftsResp);
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

  List<Map<String, dynamic>> _getShiftsForDay(int day) {
    return _shifts.where((s) {
      final start = DateTime.parse(s['started_at']).toLocal();
      return start.day == day;
    }).toList();
  }

  void _onDayClick(int day) {
    final shiftsForDay = _getShiftsForDay(day);
    final date = DateTime(_currentDate.year, _currentDate.month, day);
    
    // Pass all shifts for the selected day so the admin can paginate through them
    AdminShiftEditSheet.show(
      context: context,
      employeeId: widget.employeeId,
      employeeName: widget.employeeName,
      date: date,
      existingShifts: shiftsForDay,
      onSaved: _fetchShifts, // Refresh after saving
    );
  }

  @override
  Widget build(BuildContext context) {
    const months = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'];
    final monthStr = '${months[_currentDate.month - 1]} ${_currentDate.year}';

    int daysInMonth = DateTime(_currentDate.year, _currentDate.month + 1, 0).day;
    int firstWeekday = DateTime(_currentDate.year, _currentDate.month, 1).weekday; // 1 = Mon
    int emptyCells = firstWeekday - 1;

    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 24),
      padding: const EdgeInsets.all(20),
      constraints: BoxConstraints(maxHeight: MediaQuery.of(context).size.height * 0.9),
      decoration: BoxDecoration(
        color: Colors.black, // Dark dialog
        borderRadius: BorderRadius.circular(24),
        border: Border.all(color: Colors.white12),
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Expanded(
                child: Text(
                  'Календарь — ${widget.employeeName}',
                  style: GoogleFonts.inter(color: Colors.white, fontSize: 18, fontWeight: FontWeight.bold),
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
          const SizedBox(height: 16),
          
          // Weekday headers
          Row(
            children: ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'].map((d) => Expanded(
              child: Text(d, textAlign: TextAlign.center, style: GoogleFonts.inter(color: Colors.white54, fontSize: 12)),
            )).toList(),
          ),
          const SizedBox(height: 8),

          // Calendar Grid
          if (_isLoading)
            const Expanded(child: Center(child: CircularProgressIndicator(color: Colors.cyan)))
          else
            Expanded(
              child: GridView.builder(
                gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                  crossAxisCount: 7,
                  childAspectRatio: 1.0,
                  mainAxisSpacing: 4,
                  crossAxisSpacing: 4,
                ),
                itemCount: emptyCells + daysInMonth,
                itemBuilder: (context, index) {
                  if (index < emptyCells) return const SizedBox();
                  final day = index - emptyCells + 1;
                  final dayShifts = _getShiftsForDay(day);
                  final hasShift = dayShifts.isNotEmpty;
                  final isToday = DateTime.now().year == _currentDate.year && DateTime.now().month == _currentDate.month && DateTime.now().day == day;

                  return GestureDetector(
                    onTap: () => _onDayClick(day),
                    child: Container(
                      decoration: BoxDecoration(
                        color: hasShift ? Colors.cyan.withOpacity(0.2) : (isToday ? Colors.white12 : Colors.transparent),
                        border: Border.all(color: isToday ? Colors.cyan.withOpacity(0.5) : Colors.white12),
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: Center(
                        child: Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Text(
                              day.toString(),
                              style: GoogleFonts.inter(
                                color: hasShift ? Colors.cyanAccent : Colors.white,
                                fontWeight: hasShift || isToday ? FontWeight.bold : FontWeight.normal,
                              ),
                            ),
                            if (hasShift)
                              Container(
                                margin: const EdgeInsets.only(top: 4),
                                width: 4,
                                height: 4,
                                decoration: const BoxDecoration(color: Colors.cyanAccent, shape: BoxShape.circle),
                              )
                          ],
                        ),
                      ),
                    ),
                  );
                },
              ),
            ),
        ],
      ),
    );
  }
}
