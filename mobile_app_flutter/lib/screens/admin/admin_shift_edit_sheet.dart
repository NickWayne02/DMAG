import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:flutter_lucide/flutter_lucide.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../../../theme/app_theme.dart';
import '../../../widgets/bounce_button.dart';
import '../../../utils/app_toast.dart';

class AdminShiftEditSheet extends StatefulWidget {
  final String employeeId;
  final String employeeName;
  final DateTime date;
  final List<Map<String, dynamic>> existingShifts; // empty if creating new

  const AdminShiftEditSheet({
    Key? key,
    required this.employeeId,
    required this.employeeName,
    required this.date,
    this.existingShifts = const [],
  }) : super(key: key);

  static Future<void> show({
    required BuildContext context,
    required String employeeId,
    required String employeeName,
    required DateTime date,
    List<Map<String, dynamic>> existingShifts = const [],
    required VoidCallback onSaved,
  }) async {
    await showGeneralDialog(
      context: context,
      barrierDismissible: true,
      barrierLabel: 'AdminShiftEdit',
      barrierColor: Colors.black.withOpacity(0.7),
      transitionDuration: const Duration(milliseconds: 250),
      pageBuilder: (context, animation, secondaryAnimation) {
        return Align(
          alignment: Alignment.center,
          child: Material(
            color: Colors.transparent,
            child: AdminShiftEditSheet(
              employeeId: employeeId,
              employeeName: employeeName,
              date: date,
              existingShifts: existingShifts,
            ),
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
    onSaved();
  }

  @override
  State<AdminShiftEditSheet> createState() => _AdminShiftEditSheetState();
}

class _AdminShiftEditSheetState extends State<AdminShiftEditSheet> {
  int _currentIndex = 0;
  
  late DateTime _startedAt;
  DateTime? _endedAt;
  final TextEditingController _lunchController = TextEditingController();
  final TextEditingController _startCityController = TextEditingController();
  final TextEditingController _endCityController = TextEditingController();
  String? _selectedSiteId;
  String? _selectedSiteName;
  List<Map<String, dynamic>> _sites = [];
  bool _isSaving = false;

  @override
  void initState() {
    super.initState();
    _loadSites();
    _loadCurrentShift();
  }

  void _loadCurrentShift() {
    if (widget.existingShifts.isNotEmpty) {
      final s = widget.existingShifts[_currentIndex];
      _startedAt = DateTime.parse(s['started_at']).toLocal();
      _endedAt = s['ended_at'] != null ? DateTime.parse(s['ended_at']).toLocal() : null;
      _selectedSiteId = s['site_id'];
      _selectedSiteName = s['site_name'];
      _lunchController.text = ((s['lunch_total_ms'] ?? 0) ~/ 60000).toString();
      _startCityController.text = s['start_city'] ?? '';
      _endCityController.text = s['end_city'] ?? '';
    } else {
      _startedAt = DateTime(widget.date.year, widget.date.month, widget.date.day, 9, 0);
      _endedAt = DateTime(widget.date.year, widget.date.month, widget.date.day, 17, 0);
      _lunchController.text = '0';
      _selectedSiteId = null;
      _selectedSiteName = null;
      _startCityController.text = '';
      _endCityController.text = '';
    }
  }

  Future<void> _loadSites() async {
    final resp = await Supabase.instance.client.from('sites').select('id, name');
    setState(() {
      _sites = List<Map<String, dynamic>>.from(resp);
    });
  }

  @override
  void dispose() {
    _lunchController.dispose();
    _startCityController.dispose();
    _endCityController.dispose();
    super.dispose();
  }

  Future<void> _selectDateTime(bool isStart) async {
    DateTime initial = isStart ? _startedAt : (_endedAt ?? _startedAt);
    final date = await showDatePicker(
      context: context,
      initialDate: initial,
      firstDate: DateTime(2020),
      lastDate: DateTime(2100),
      builder: (context, child) {
        return Theme(
          data: ThemeData.dark().copyWith(
            colorScheme: const ColorScheme.dark(primary: Colors.cyan, surface: Color(0xFF1E293B)),
          ),
          child: child!,
        );
      },
    );
    if (date == null) return;
    
    if (!mounted) return;
    final time = await showTimePicker(
      context: context,
      initialTime: TimeOfDay.fromDateTime(initial),
      builder: (context, child) {
        return Theme(
          data: ThemeData.dark().copyWith(
            colorScheme: const ColorScheme.dark(primary: Colors.cyan, surface: Color(0xFF1E293B)),
          ),
          child: child!,
        );
      },
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
      final lunchMin = int.tryParse(_lunchController.text) ?? 0;
      final data = {
        'user_id': widget.employeeId,
        'site_id': _selectedSiteId,
        'site_name': _selectedSiteName,
        'started_at': _startedAt.toUtc().toIso8601String(),
        'ended_at': _endedAt?.toUtc().toIso8601String(),
        'lunch_total_ms': lunchMin * 60000,
        'start_city': _startCityController.text.isEmpty ? null : _startCityController.text,
        'end_city': _endCityController.text.isEmpty ? null : _endCityController.text,
        'status': _endedAt != null ? 'finished' : 'working',
      };

      if (widget.existingShifts.isNotEmpty) {
        final shiftId = widget.existingShifts[_currentIndex]['id'];
        await Supabase.instance.client
            .from('shifts')
            .update(data)
            .eq('id', shiftId);
      } else {
        await Supabase.instance.client
            .from('shifts')
            .insert(data);
      }
      
      if (mounted) {
        AppToast.showSuccess(context, 'Смена сохранена');
        Navigator.pop(context);
      }
    } catch (e) {
      if (mounted) AppToast.show(context, 'Ошибка сохранения: $e', color: Colors.red);
    } finally {
      if (mounted) setState(() => _isSaving = false);
    }
  }

  Future<void> _delete() async {
    if (widget.existingShifts.isEmpty) return;
    
    final confirm = await showDialog<bool>(
      context: context,
      builder: (c) => AlertDialog(
        backgroundColor: const Color(0xFF1E293B), // Match DMAG dark
        title: Text('Удалить смену?', style: GoogleFonts.inter(color: Colors.white)),
        content: Text('Это действие нельзя отменить.', style: GoogleFonts.inter(color: Colors.white70)),
        actions: [
          TextButton(onPressed: () => Navigator.pop(c, false), child: const Text('Отмена', style: TextStyle(color: Colors.white70))),
          TextButton(onPressed: () => Navigator.pop(c, true), child: const Text('Удалить', style: TextStyle(color: Colors.red))),
        ],
      ),
    );

    if (confirm == true) {
      setState(() => _isSaving = true);
      try {
        final shiftId = widget.existingShifts[_currentIndex]['id'];
        await Supabase.instance.client.from('shifts').delete().eq('id', shiftId);
        if (mounted) {
          AppToast.showSuccess(context, 'Смена удалена');
          Navigator.pop(context);
        }
      } catch (e) {
        if (mounted) AppToast.show(context, 'Ошибка удаления: $e', color: Colors.red);
      } finally {
        if (mounted) setState(() => _isSaving = false);
      }
    }
  }

  String _formatDateTime(DateTime? d) {
    if (d == null) return '--.--.---- --:--';
    return '${d.day.toString().padLeft(2, '0')}.${d.month.toString().padLeft(2, '0')}.${d.year} '
           '${d.hour.toString().padLeft(2, '0')}:${d.minute.toString().padLeft(2, '0')}';
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      width: 400, // Fixed width for dialog matching react layout
      margin: const EdgeInsets.symmetric(horizontal: 16),
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        color: Colors.black, // Dark dialog
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: Colors.white12),
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          // Header Row
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      widget.existingShifts.isNotEmpty ? 'Редактировать смену' : 'Новая смена',
                      style: GoogleFonts.inter(fontSize: 18, fontWeight: FontWeight.bold, color: Colors.white),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      'Сотрудник: ${widget.employeeName}',
                      style: GoogleFonts.inter(fontSize: 13, color: Colors.white54),
                    ),
                  ],
                ),
              ),
              Row(
                children: [
                  if (widget.existingShifts.length > 1) ...[
                    // Pagination
                    Row(
                      children: [
                        GestureDetector(
                          onTap: _currentIndex > 0 ? () {
                            setState(() {
                              _currentIndex--;
                              _loadCurrentShift();
                            });
                          } : null,
                          child: Container(
                            padding: const EdgeInsets.all(6),
                            decoration: BoxDecoration(
                              shape: BoxShape.circle,
                              border: Border.all(color: Colors.white12),
                              color: _currentIndex > 0 ? Colors.transparent : Colors.white.withOpacity(0.05),
                            ),
                            child: Icon(LucideIcons.chevron_left, color: _currentIndex > 0 ? Colors.white : Colors.white30, size: 16),
                          ),
                        ),
                        Padding(
                          padding: const EdgeInsets.symmetric(horizontal: 8),
                          child: Text(
                            '${_currentIndex + 1} / ${widget.existingShifts.length}',
                            style: GoogleFonts.inter(color: Colors.white, fontSize: 13),
                          ),
                        ),
                        GestureDetector(
                          onTap: _currentIndex < widget.existingShifts.length - 1 ? () {
                            setState(() {
                              _currentIndex++;
                              _loadCurrentShift();
                            });
                          } : null,
                          child: Container(
                            padding: const EdgeInsets.all(6),
                            decoration: BoxDecoration(
                              shape: BoxShape.circle,
                              border: Border.all(color: Colors.white12),
                              color: _currentIndex < widget.existingShifts.length - 1 ? Colors.transparent : Colors.white.withOpacity(0.05),
                            ),
                            child: Icon(LucideIcons.chevron_right, color: _currentIndex < widget.existingShifts.length - 1 ? Colors.white : Colors.white30, size: 16),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(width: 12),
                  ],
                  GestureDetector(
                    onTap: () => Navigator.pop(context),
                    child: const Icon(LucideIcons.x, color: Colors.white54, size: 20),
                  ),
                ],
              ),
            ],
          ),
          
          const SizedBox(height: 24),

          // Object selection
          Text('Объект', style: GoogleFonts.inter(fontSize: 13, color: Colors.white, fontWeight: FontWeight.bold)),
          const SizedBox(height: 8),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 12),
            decoration: BoxDecoration(
              color: Colors.black,
              border: Border.all(color: Colors.white12),
              borderRadius: BorderRadius.circular(8),
            ),
            child: DropdownButtonHideUnderline(
              child: DropdownButton<String>(
                value: _selectedSiteId,
                isExpanded: true,
                dropdownColor: const Color(0xFF1E293B),
                hint: Text('— Без объекта —', style: GoogleFonts.inter(color: Colors.white54)),
                icon: const Icon(LucideIcons.chevron_down, color: Colors.white54, size: 16),
                items: [
                  DropdownMenuItem(value: null, child: Text('— Без объекта —', style: GoogleFonts.inter(color: Colors.white))),
                  ..._sites.map((s) => DropdownMenuItem(
                        value: s['id'] as String,
                        child: Text(s['name'] as String, style: GoogleFonts.inter(color: Colors.white)),
                      )),
                ],
                onChanged: (val) {
                  setState(() {
                    _selectedSiteId = val;
                    if (val != null) {
                      _selectedSiteName = _sites.firstWhere((s) => s['id'] == val)['name'];
                    } else {
                      _selectedSiteName = null;
                    }
                  });
                },
              ),
            ),
          ),
          
          const SizedBox(height: 16),

          // Start and End Times
          Row(
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text('Начало', style: GoogleFonts.inter(fontSize: 13, color: Colors.white, fontWeight: FontWeight.bold)),
                    const SizedBox(height: 8),
                    BounceButton(
                      onTap: () => _selectDateTime(true),
                      child: Container(
                        padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 12),
                        decoration: BoxDecoration(
                          color: Colors.black,
                          border: Border.all(color: Colors.white12),
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: Text(_formatDateTime(_startedAt), style: GoogleFonts.inter(color: Colors.white, fontSize: 14)),
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text('Конец', style: GoogleFonts.inter(fontSize: 13, color: Colors.white, fontWeight: FontWeight.bold)),
                    const SizedBox(height: 8),
                    BounceButton(
                      onTap: () => _selectDateTime(false),
                      child: Container(
                        padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 12),
                        decoration: BoxDecoration(
                          color: Colors.black,
                          border: Border.all(color: Colors.white12),
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: Text(_formatDateTime(_endedAt), style: GoogleFonts.inter(color: Colors.white, fontSize: 14)),
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
          
          const SizedBox(height: 16),

          // Pause
          Text('Пауза (минут)', style: GoogleFonts.inter(fontSize: 13, color: Colors.white, fontWeight: FontWeight.bold)),
          const SizedBox(height: 8),
          Container(
            height: 44,
            decoration: BoxDecoration(
              color: Colors.black,
              border: Border.all(color: Colors.white12),
              borderRadius: BorderRadius.circular(8),
            ),
            child: TextField(
              controller: _lunchController,
              keyboardType: TextInputType.number,
              style: GoogleFonts.inter(color: Colors.white, fontSize: 14),
              decoration: const InputDecoration(
                contentPadding: EdgeInsets.symmetric(horizontal: 12, vertical: 12),
                border: InputBorder.none,
              ),
            ),
          ),
          
          const SizedBox(height: 16),

          // Cities
          Row(
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text('GPS город (старт)', style: GoogleFonts.inter(fontSize: 13, color: Colors.white, fontWeight: FontWeight.bold)),
                    const SizedBox(height: 8),
                    Container(
                      height: 44,
                      decoration: BoxDecoration(
                        color: Colors.black,
                        border: Border.all(color: Colors.white12),
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: TextField(
                        controller: _startCityController,
                        style: GoogleFonts.inter(color: Colors.white, fontSize: 14),
                        decoration: const InputDecoration(
                          contentPadding: EdgeInsets.symmetric(horizontal: 12, vertical: 12),
                          border: InputBorder.none,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text('GPS город (конец)', style: GoogleFonts.inter(fontSize: 13, color: Colors.white, fontWeight: FontWeight.bold)),
                    const SizedBox(height: 8),
                    Container(
                      height: 44,
                      decoration: BoxDecoration(
                        color: Colors.black,
                        border: Border.all(color: Colors.white12),
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: TextField(
                        controller: _endCityController,
                        style: GoogleFonts.inter(color: Colors.white, fontSize: 14),
                        decoration: const InputDecoration(
                          contentPadding: EdgeInsets.symmetric(horizontal: 12, vertical: 12),
                          border: InputBorder.none,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),

          const SizedBox(height: 24),
          
          // Bottom Buttons Row
          Row(
            children: [
              if (widget.existingShifts.isNotEmpty)
                Expanded(
                  flex: 2,
                  child: BounceButton(
                    onTap: _isSaving ? () {} : _delete,
                    child: Container(
                      height: 44,
                      decoration: BoxDecoration(
                        color: const Color(0xFFF05252), // Red like screenshot
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          const Icon(LucideIcons.trash_2, color: Colors.white, size: 16),
                          const SizedBox(width: 8),
                          Text('Удалить', style: GoogleFonts.inter(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 14)),
                        ],
                      ),
                    ),
                  ),
                ),
              if (widget.existingShifts.isNotEmpty) const SizedBox(width: 12),
              Expanded(
                flex: 2,
                child: BounceButton(
                  onTap: () => Navigator.pop(context),
                  child: Container(
                    height: 44,
                    decoration: BoxDecoration(
                      color: Colors.black,
                      border: Border.all(color: Colors.white24),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Center(
                      child: Text('Отмена', style: GoogleFonts.inter(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 14)),
                    ),
                  ),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                flex: 3,
                child: BounceButton(
                  onTap: _isSaving ? () {} : _save,
                  child: Container(
                    height: 44,
                    decoration: BoxDecoration(
                      color: const Color(0xFF3B4A5D), // Dark blue/slate from screenshot
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Center(
                      child: _isSaving
                          ? const SizedBox(height: 20, width: 20, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                          : Text('Сохранить', style: GoogleFonts.inter(color: Colors.white, fontWeight: FontWeight.normal, fontSize: 14)),
                    ),
                  ),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}
