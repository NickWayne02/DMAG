import 'package:provider/provider.dart';
import 'package:mobile_app_flutter/providers/locale_provider.dart';
import '../../../../utils/transliteration.dart';
import '../../../../utils/date_format_helper.dart';
import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:flutter_lucide/flutter_lucide.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../../../theme/neon_widgets.dart';

class CalendarTab extends StatefulWidget {
  static String? initialEmployeeId;

  const CalendarTab({super.key});

  @override
  State<CalendarTab> createState() => _CalendarTabState();
}

class _CalendarTabState extends State<CalendarTab> {
  List<Map<String, dynamic>> _employees = [];
  String? _selectedEmployeeId;
  DateTime _currentDate = DateTime(DateTime.now().year, DateTime.now().month, 1);
  List<Map<String, dynamic>> _shifts = [];
  List<Map<String, dynamic>> _sites = [];
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    if (CalendarTab.initialEmployeeId != null) {
      _selectedEmployeeId = CalendarTab.initialEmployeeId;
      CalendarTab.initialEmployeeId = null;
    }
    _fetchInitialData();
  }

  Future<void> _fetchInitialData() async {
    setState(() => _isLoading = true);
    try {
      final profilesResp = await Supabase.instance.client.from('profiles').select('id, full_name');
      // Sort in Dart since order might fail if full_name is null
      final profiles = List<Map<String, dynamic>>.from(profilesResp);
      profiles.sort((a, b) => (a['full_name'] ?? '').compareTo(b['full_name'] ?? ''));
      
      final sitesResp = await Supabase.instance.client.from('sites').select('id, name');
      final sites = List<Map<String, dynamic>>.from(sitesResp);
      sites.sort((a, b) => (a['name'] ?? '').compareTo(b['name'] ?? ''));
      
      setState(() {
        _employees = profiles;
        _sites = sites;
      });
      
      if (_selectedEmployeeId != null) {
        await _fetchShifts();
      } else {
        setState(() => _isLoading = false);
      }
    } catch (e) {
      setState(() => _isLoading = false);
    }
  }

  Future<void> _fetchShifts() async {
    if (_selectedEmployeeId == null) return;
    setState(() => _isLoading = true);
    try {
      final startOfMonth = DateTime(_currentDate.year, _currentDate.month, 1);
      final endOfMonth = DateTime(_currentDate.year, _currentDate.month + 1, 0, 23, 59, 59);

      final shiftsResp = await Supabase.instance.client
          .from('shifts')
          .select()
          .eq('user_id', _selectedEmployeeId!)
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

  @override
  Widget build(BuildContext context) {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(16.0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            context.watch<LocaleProvider>().t('calendar.title') ?? 'Календарь',
            style: GoogleFonts.inter(color: Colors.white, fontSize: 24, fontWeight: FontWeight.bold),
          ),
          const SizedBox(height: 4),
          Text(
            context.watch<LocaleProvider>().t('calendar.subtitle') ?? 'Просмотр и редактирование смен сотрудников',
            style: GoogleFonts.inter(color: Colors.white54, fontSize: 14),
          ),
          const SizedBox(height: 20),
          _buildEmployeeDropdown(),
          const SizedBox(height: 24),
          if (_isLoading)
            const Center(child: CircularProgressIndicator(color: Colors.cyan))
          else if (_selectedEmployeeId != null) 
            _buildCalendar(),
        ],
      ),
    );
  }

  Widget _buildEmployeeDropdown() {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
      decoration: BoxDecoration(
        color: const Color(0xFF09090b),
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: Colors.white12),
      ),
      child: DropdownButtonHideUnderline(
        child: Theme(
          data: Theme.of(context).copyWith(
            hoverColor: Colors.white.withValues(alpha: 0.1),
            focusColor: Colors.transparent,
            splashColor: Colors.transparent,
            highlightColor: Colors.transparent,
          ),
          child: DropdownButton<String>(
            value: _selectedEmployeeId,
            hint: const SizedBox.shrink(), // We now have it in items
            isExpanded: true,
            dropdownColor: Colors.black,
            borderRadius: BorderRadius.circular(12),
            icon: const Icon(LucideIcons.chevron_down, color: Colors.white54, size: 20),
            style: GoogleFonts.inter(color: Colors.white, fontSize: 14),
            items: [
              DropdownMenuItem<String>(
                value: null,
                child: Text(context.watch<LocaleProvider>().t('calendar.select_employee') ?? '-- Выберите сотрудника --', style: GoogleFonts.inter(color: Colors.white)),
              ),
              ..._employees.map((e) {
                bool isSelected = _selectedEmployeeId == e['id'];
                return DropdownMenuItem<String>(
                  value: e['id'],
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(TransliterationService.transliterateIfNeeded(e['full_name'] ?? e['id'], context.read<LocaleProvider>().currentLang)),
                      if (isSelected) const Icon(LucideIcons.check, color: Colors.white, size: 16),
                    ],
                  ),
                );
              }),
            ],
            onChanged: (val) {
              setState(() => _selectedEmployeeId = val);
              if (val != null) {
                _fetchShifts();
              }
            },
          ),
        ),
      ),
    );
  }

  Widget _buildCalendar() {
    final monthsStr = context.watch<LocaleProvider>().t('calendar.months') ?? 'Январь,Февраль,Март,Апрель,Май,Июнь,Июль,Август,Сентябрь,Октябрь,Ноябрь,Декабрь';
    final months = monthsStr.split(',');
    final monthStr = '${months[_currentDate.month - 1]} ${_currentDate.year}';

    int daysInMonth = DateTime(_currentDate.year, _currentDate.month + 1, 0).day;
    int firstWeekday = DateTime(_currentDate.year, _currentDate.month, 1).weekday; // 1 = Mon
    int emptyCells = firstWeekday - 1;

    return NeonCard(
      padding: const EdgeInsets.all(20),
      child: Column(
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              _buildMonthNavButton(context.watch<LocaleProvider>().t('calendar.prev') ?? 'Пред.', LucideIcons.chevron_left, true, () => _changeMonth(-1)),
              Text(
                monthStr,
                style: GoogleFonts.inter(color: Colors.white, fontSize: 18, fontWeight: FontWeight.bold),
              ),
              _buildMonthNavButton(context.watch<LocaleProvider>().t('calendar.next') ?? 'След.', LucideIcons.chevron_right, false, () => _changeMonth(1)),
            ],
          ),
          const SizedBox(height: 24),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceAround,
            children: (context.watch<LocaleProvider>().t('calendar.days') ?? 'Пн,Вт,Ср,Чт,Пт,Сб,Вс').split(',').map((day) {
              return SizedBox(
                width: 32,
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
          GridView.builder(
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
              crossAxisCount: 7,
              mainAxisSpacing: 12,
              crossAxisSpacing: 8,
              childAspectRatio: 0.55,
            ),
            itemCount: emptyCells + daysInMonth,
            itemBuilder: (context, index) {
              if (index < emptyCells) return const SizedBox();
              int day = index - emptyCells + 1;
              DateTime date = DateTime(_currentDate.year, _currentDate.month, day);
              bool isToday = date.year == DateTime.now().year && date.month == DateTime.now().month && date.day == DateTime.now().day;
              
              // Find shifts for this day
              List<Map<String, dynamic>> dayShifts = _shifts.where((s) {
                final start = DateTime.parse(s['started_at']).toLocal();
                return start.year == date.year && start.month == date.month && start.day == date.day;
              }).toList();

              Map<String, dynamic>? primaryShift = dayShifts.isNotEmpty ? dayShifts.first : null;

              String durationText = '';
              if (primaryShift != null) {
                if (primaryShift['ended_at'] == null) {
                  durationText = context.read<LocaleProvider>().t('calendar.active') ?? 'Активна';
                } else {
                  final start = DateTime.parse(primaryShift['started_at']);
                  final end = DateTime.parse(primaryShift['ended_at']);
                  final diffMs = end.difference(start).inMilliseconds;
                  final lunchMs = primaryShift['lunch_total_ms'] ?? 0;
                  final workMs = diffMs - lunchMs;
                  
                  final hours = workMs ~/ 3600000;
                  final mins = (workMs % 3600000) ~/ 60000;
                  durationText = '$hours${context.read<LocaleProvider>().t('calendar.h') ?? 'ч'}\n$mins${context.read<LocaleProvider>().t('calendar.m') ?? 'м'}';
                }
              }
              
              return GestureDetector(
                onTap: () {
                  if (primaryShift != null) {
                    _showEditShiftModal(context, primaryShift);
                  }
                },
                child: Column(
                  children: [
                    Container(
                      width: 40,
                      height: 40,
                      decoration: BoxDecoration(
                        shape: BoxShape.circle,
                        color: Colors.white.withValues(alpha: 0.05),
                        border: isToday ? Border.all(color: Colors.blue.withValues(alpha: 0.5), width: 1) : null,
                      ),
                      child: Center(
                        child: Text(
                          day.toString(),
                          style: GoogleFonts.inter(color: Colors.white, fontSize: 14),
                        ),
                      ),
                    ),
                    const SizedBox(height: 4),
                    if (primaryShift != null)
                      Text(durationText, textAlign: TextAlign.center, style: GoogleFonts.inter(color: Colors.white70, fontSize: 10, height: 1.1)),
                  ],
                ),
              );
            },
          ),
        ],
      ),
    );
  }

  Widget _buildMonthNavButton(String text, IconData icon, bool left, VoidCallback onTap) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
        decoration: BoxDecoration(
          border: Border.all(color: Colors.white12),
          borderRadius: BorderRadius.circular(16),
        ),
        child: Row(
          children: [
            if (left) Icon(icon, color: Colors.white, size: 16),
            if (left) const SizedBox(width: 4),
            Text(text, style: GoogleFonts.inter(color: Colors.white, fontSize: 12, fontWeight: FontWeight.bold)),
            if (!left) const SizedBox(width: 4),
            if (!left) Icon(icon, color: Colors.white, size: 16),
          ],
        ),
      ),
    );
  }

  void _showEditShiftModal(BuildContext context, Map<String, dynamic> shift) {
    final employee = _employees.firstWhere((e) => e['id'] == shift['user_id'], orElse: () => {'full_name': context.watch<LocaleProvider>().t('personnel.no_name') ?? 'Неизвестно'});
    
    showDialog(
      context: context,
      builder: (context) {
        return EditShiftDialog(
          shift: shift,
          employeeName: TransliterationService.transliterateIfNeeded(employee['full_name'] ?? (context.read<LocaleProvider>().t('calendar.unknown') ?? context.watch<LocaleProvider>().t('personnel.no_name') ?? 'Неизвестно'), context.read<LocaleProvider>().currentLang),
          sites: _sites,
          onSaved: _fetchShifts,
        );
      },
    );
  }
}

class EditShiftDialog extends StatefulWidget {
  final Map<String, dynamic> shift;
  final String employeeName;
  final List<Map<String, dynamic>> sites;
  final VoidCallback onSaved;

  const EditShiftDialog({
    super.key,
    required this.shift,
    required this.employeeName,
    required this.sites,
    required this.onSaved,
  });

  @override
  State<EditShiftDialog> createState() => _EditShiftDialogState();
}

class _EditShiftDialogState extends State<EditShiftDialog> {
  late String? _selectedSiteId;
  late DateTime _startedAt;
  late DateTime? _endedAt;
  late TextEditingController _pauseController;
  late TextEditingController _startCityController;
  late TextEditingController _endCityController;
  bool _isSaving = false;

  @override
  void initState() {
    super.initState();
    _selectedSiteId = widget.shift['site_id'];
    _startedAt = DateTime.parse(widget.shift['started_at']).toLocal();
    _endedAt = widget.shift['ended_at'] != null ? DateTime.parse(widget.shift['ended_at']).toLocal() : null;
    
    int lunchMs = widget.shift['lunch_total_ms'] ?? 0;
    _pauseController = TextEditingController(text: (lunchMs ~/ 60000).toString());
    _startCityController = TextEditingController(text: widget.shift['start_city'] ?? '');
    _endCityController = TextEditingController(text: widget.shift['end_city'] ?? '');
  }

  @override
  void dispose() {
    _pauseController.dispose();
    _startCityController.dispose();
    _endCityController.dispose();
    super.dispose();
  }

  Future<void> _selectDateTime(BuildContext context, bool isStart) async {
    DateTime initial = isStart ? _startedAt : (_endedAt ?? _startedAt);
    final date = await showDatePicker(
      context: context,
      initialDate: initial,
      firstDate: DateTime(2020),
      lastDate: DateTime(2100),
    );
    if (date == null) return;
    
    if (!context.mounted) return;
    final time = await showTimePicker(
      context: context,
      initialTime: TimeOfDay.fromDateTime(initial),
    );
    if (time == null) return;

    setState(() {
      final newDateTime = DateTime(date.year, date.month, date.day, time.hour, time.minute);
      if (isStart) {
        _startedAt = newDateTime;
      } else {
        _endedAt = newDateTime;
      }
    });
  }

  Future<void> _save() async {
    setState(() => _isSaving = true);
    try {
      int pauseMin = int.tryParse(_pauseController.text) ?? 0;
      
      final updates = {
        'site_id': _selectedSiteId,
        'started_at': _startedAt.toUtc().toIso8601String(),
        'ended_at': _endedAt?.toUtc().toIso8601String(),
        'lunch_total_ms': pauseMin * 60000,
        'start_city': _startCityController.text.isNotEmpty ? _startCityController.text : null,
        'end_city': _endCityController.text.isNotEmpty ? _endCityController.text : null,
      };

      // Also update site_name if selectedSiteId changed
      if (_selectedSiteId != null) {
        final site = widget.sites.firstWhere((s) => s['id'] == _selectedSiteId, orElse: () => <String, dynamic>{});
        if (site.isNotEmpty) updates['site_name'] = site['name'];
      } else {
        updates['site_name'] = null;
      }

      await Supabase.instance.client
          .from('shifts')
          .update(updates)
          .eq('id', widget.shift['id']);
          
      widget.onSaved();
      if (mounted) Navigator.pop(context);
    } catch (e) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('${context.read<LocaleProvider>().t('admin.shift.error_save') ?? 'Ошибка сохранения:'} $e')));
    } finally {
      if (mounted) setState(() => _isSaving = false);
    }
  }

  Future<void> _delete() async {
    final confirm = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: const Color(0xFF1E293B),
        title: Text(context.read<LocaleProvider>().t('sites.delete_title') ?? 'Удаление', style: const TextStyle(color: Colors.white)),
        content: Text(context.read<LocaleProvider>().t('admin.shift.delete_msg') ?? 'Вы уверены, что хотите удалить эту смену?', style: const TextStyle(color: Colors.white70)),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: Text(context.read<LocaleProvider>().t('calendar.cancel') ?? 'Отмена', style: const TextStyle(color: Colors.white70))),
          TextButton(onPressed: () => Navigator.pop(ctx, true), child: Text(context.read<LocaleProvider>().t('calendar.delete') ?? 'Удалить', style: const TextStyle(color: Colors.red))),
        ],
      ),
    );
    
    if (confirm != true) return;
    
    setState(() => _isSaving = true);
    try {
      await Supabase.instance.client.from('shifts').delete().eq('id', widget.shift['id']);
      widget.onSaved();
      if (mounted) Navigator.pop(context);
    } catch (e) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('${context.read<LocaleProvider>().t('chat.media_delete_error') ?? 'Ошибка удаления:'} $e')));
      setState(() => _isSaving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    String formatDate(DateTime d) {
      return DateFormatHelper.formatDateTime(d);
    }
    
    return Dialog(
      backgroundColor: Colors.transparent,
      insetPadding: const EdgeInsets.all(16),
      child: Container(
        width: double.infinity,
        padding: const EdgeInsets.all(20),
        decoration: BoxDecoration(
          color: Colors.black, // Modal background
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: Colors.white12),
        ),
        child: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(context.watch<LocaleProvider>().t('admin.shift.edit_title') ?? 'Редактировать смену', style: GoogleFonts.inter(color: Colors.white, fontSize: 18, fontWeight: FontWeight.bold)),
                  GestureDetector(
                    onTap: () => Navigator.pop(context),
                    child: const Icon(LucideIcons.x, color: Colors.white54, size: 20),
                  ),
                ],
              ),
              const SizedBox(height: 4),
              Text('${context.watch<LocaleProvider>().t('dashboard.employee') ?? 'Сотрудник:'} ${TransliterationService.transliterateIfNeeded(widget.employeeName, context.read<LocaleProvider>().currentLang)}', style: GoogleFonts.inter(color: Colors.white54, fontSize: 14)),
              const SizedBox(height: 24),
              
              _buildInputLabel(context.watch<LocaleProvider>().t('export.site') ?? 'Объект'),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
                decoration: BoxDecoration(
                  color: Colors.black,
                  border: Border.all(color: Colors.white12),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: DropdownButtonHideUnderline(
                  child: DropdownButton<String>(
                    value: _selectedSiteId,
                    hint: Text(context.watch<LocaleProvider>().t('admin.shift.no_site') ?? '— Без объекта —', style: GoogleFonts.inter(color: Colors.white)),
                    isExpanded: true,
                    dropdownColor: const Color(0xFF1E293B),
                    icon: const Icon(LucideIcons.chevron_down, color: Colors.white54, size: 16),
                    style: GoogleFonts.inter(color: Colors.white, fontSize: 14),
                    items: [
                      DropdownMenuItem<String>(value: null, child: Text(context.watch<LocaleProvider>().t('admin.shift.no_site') ?? '— Без объекта —')),
                      ...widget.sites.map((s) => DropdownMenuItem<String>(value: s['id'], child: Text(s['name']))),
                    ],
                    onChanged: (val) => setState(() => _selectedSiteId = val),
                  ),
                ),
              ),
              
              const SizedBox(height: 16),
              Row(
                children: [
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        _buildInputLabel(context.watch<LocaleProvider>().t('personnel.start') ?? 'Начало'),
                        GestureDetector(
                          onTap: () => _selectDateTime(context, true),
                          child: _buildTextInput(formatDate(_startedAt)),
                        )
                      ],
                    ),
                  ),
                  const SizedBox(width: 16),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        _buildInputLabel(context.watch<LocaleProvider>().t('export.work_end') ?? 'Конец'),
                        GestureDetector(
                          onTap: () => _selectDateTime(context, false),
                          child: _buildTextInput(_endedAt != null ? formatDate(_endedAt!) : 'Активна'),
                        )
                      ],
                    ),
                  ),
                ],
              ),
              
              const SizedBox(height: 16),
              _buildInputLabel(context.watch<LocaleProvider>().t('shift.pause_mins') ?? 'Пауза (минут)'),
              Container(
                decoration: BoxDecoration(
                  color: Colors.black,
                  border: Border.all(color: Colors.white12),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: TextField(
                  controller: _pauseController,
                  style: GoogleFonts.inter(color: Colors.white, fontSize: 14),
                  keyboardType: TextInputType.number,
                  decoration: const InputDecoration(
                    border: InputBorder.none,
                    contentPadding: EdgeInsets.symmetric(horizontal: 12, vertical: 12),
                  ),
                ),
              ),
              
              const SizedBox(height: 16),
              Row(
                children: [
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        _buildInputLabel(context.watch<LocaleProvider>().t('shift.gps_start') ?? 'GPS город (старт)'),
                        Container(
                          decoration: BoxDecoration(
                            color: Colors.black,
                            border: Border.all(color: Colors.white12),
                            borderRadius: BorderRadius.circular(8),
                          ),
                          child: TextField(
                            controller: _startCityController,
                            style: GoogleFonts.inter(color: Colors.white, fontSize: 14),
                            decoration: const InputDecoration(
                              border: InputBorder.none,
                              contentPadding: EdgeInsets.symmetric(horizontal: 12, vertical: 12),
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(width: 16),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        _buildInputLabel(context.watch<LocaleProvider>().t('shift.gps_end') ?? 'GPS город (конец)'),
                        Container(
                          decoration: BoxDecoration(
                            color: Colors.black,
                            border: Border.all(color: Colors.white12),
                            borderRadius: BorderRadius.circular(8),
                          ),
                          child: TextField(
                            controller: _endCityController,
                            style: GoogleFonts.inter(color: Colors.white, fontSize: 14),
                            decoration: const InputDecoration(
                              border: InputBorder.none,
                              contentPadding: EdgeInsets.symmetric(horizontal: 12, vertical: 12),
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
              
              const SizedBox(height: 24),
              
              // Buttons
              if (_isSaving)
                const Center(child: CircularProgressIndicator(color: Colors.cyan))
              else ...[
                SizedBox(
                  width: double.infinity,
                  height: 44,
                  child: ElevatedButton(
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFF334155), // Slate button
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                    ),
                    onPressed: _save,
                    child: Text(context.watch<LocaleProvider>().t('settings.save') ?? 'Сохранить', style: GoogleFonts.inter(color: Colors.white, fontWeight: FontWeight.w600)),
                  ),
                ),
                const SizedBox(height: 12),
                SizedBox(
                  width: double.infinity,
                  height: 44,
                  child: OutlinedButton(
                    style: OutlinedButton.styleFrom(
                      side: const BorderSide(color: Colors.white12),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                    ),
                    onPressed: () => Navigator.pop(context),
                    child: Text(context.watch<LocaleProvider>().t('calendar.cancel') ?? 'Отмена', style: GoogleFonts.inter(color: Colors.white, fontWeight: FontWeight.w600)),
                  ),
                ),
                const SizedBox(height: 12),
                SizedBox(
                  width: double.infinity,
                  height: 44,
                  child: ElevatedButton.icon(
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFFef4444), // Red
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                    ),
                    icon: const Icon(LucideIcons.trash_2, color: Colors.white, size: 16),
                    label: Text(context.watch<LocaleProvider>().t('calendar.delete') ?? 'Удалить', style: GoogleFonts.inter(color: Colors.white, fontWeight: FontWeight.w600)),
                    onPressed: _delete,
                  ),
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildInputLabel(String text) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Text(text, style: GoogleFonts.inter(color: Colors.white, fontSize: 13, fontWeight: FontWeight.bold)),
    );
  }

  Widget _buildTextInput(String value) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
      decoration: BoxDecoration(
        color: Colors.black,
        border: Border.all(color: Colors.white12),
        borderRadius: BorderRadius.circular(8),
      ),
      child: Text(value, style: GoogleFonts.inter(color: Colors.white, fontSize: 14)),
    );
  }
}
