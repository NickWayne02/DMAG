import '../../../utils/transliteration.dart';
import 'package:provider/provider.dart';
import 'package:mobile_app_flutter/providers/locale_provider.dart';
import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:flutter_lucide/flutter_lucide.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../../../widgets/bounce_button.dart';

class AddShiftDialog extends StatefulWidget {
  final List<Map<String, dynamic>> employees;
  final List<Map<String, dynamic>> sites;
  final String? initialEmployeeId;
  final VoidCallback onSaved;

  const AddShiftDialog({
    Key? key,
    required this.employees,
    required this.sites,
    this.initialEmployeeId,
    required this.onSaved,
  }) : super(key: key);

  @override
  State<AddShiftDialog> createState() => _AddShiftDialogState();
}

class _AddShiftDialogState extends State<AddShiftDialog> {
  String? _selectedEmployeeId;
  String? _selectedSiteId;
  DateTime? _startedAt;
  DateTime? _endedAt;
  late TextEditingController _pauseController;
  late TextEditingController _startCityController;
  late TextEditingController _endCityController;
  bool _isSaving = false;

  @override
  void initState() {
    super.initState();
    _selectedEmployeeId = widget.initialEmployeeId ?? (widget.employees.isNotEmpty ? widget.employees.first['id'] : null);
    
    // Default to current time for start
    _startedAt = DateTime.now();
    
    _pauseController = TextEditingController(text: '0');
    _startCityController = TextEditingController();
    _endCityController = TextEditingController();
  }

  @override
  void dispose() {
    _pauseController.dispose();
    _startCityController.dispose();
    _endCityController.dispose();
    super.dispose();
  }

  Future<void> _selectDateTime(BuildContext context, bool isStart) async {
    DateTime initial = isStart ? (_startedAt ?? DateTime.now()) : (_endedAt ?? _startedAt ?? DateTime.now());
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
    if (_selectedEmployeeId == null || _startedAt == null) {
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(context.read<LocaleProvider>().t('admin.shift.error_empty') ?? 'Выберите сотрудника и время начала')));
      return;
    }
    
    setState(() => _isSaving = true);
    try {
      int pauseMin = int.tryParse(_pauseController.text) ?? 0;
      
      final data = {
        'user_id': _selectedEmployeeId,
        'site_id': _selectedSiteId,
        'started_at': _startedAt!.toUtc().toIso8601String(),
        'ended_at': _endedAt?.toUtc().toIso8601String(),
        'lunch_total_ms': pauseMin * 60000,
        'start_city': _startCityController.text.isNotEmpty ? _startCityController.text : null,
        'end_city': _endCityController.text.isNotEmpty ? _endCityController.text : null,
        'status': _endedAt == null ? 'working' : 'finished',
      };

      if (_selectedSiteId != null) {
        final site = widget.sites.firstWhere((s) => s['id'] == _selectedSiteId, orElse: () => <String, dynamic>{});
        if (site.isNotEmpty) data['site_name'] = site['name'];
      }

      await Supabase.instance.client.from('shifts').insert(data);
          
      widget.onSaved();
      if (mounted) Navigator.pop(context);
    } catch (e) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('${context.read<LocaleProvider>().t('admin.shift.error_create') ?? 'Ошибка создания:'} $e')));
    } finally {
      if (mounted) setState(() => _isSaving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    String formatDate(DateTime? d) {
      if (d == null) return context.watch<LocaleProvider>().t('dashboard.date_format_placeholder') ?? 'ДД.ММ.ГГГГ --:--';
      return '${d.day.toString().padLeft(2, '0')}.${d.month.toString().padLeft(2, '0')}.${d.year} '
             '${d.hour.toString().padLeft(2, '0')}:${d.minute.toString().padLeft(2, '0')}';
    }

    String selectedEmpName = '';
    if (_selectedEmployeeId != null) {
      final emp = widget.employees.firstWhere((e) => e['id'] == _selectedEmployeeId, orElse: () => <String, dynamic>{});
      if (emp.isNotEmpty) {
        selectedEmpName = emp['full_name'] ?? '';
      }
    }

    return Dialog(
      backgroundColor: Colors.transparent,
      insetPadding: const EdgeInsets.all(16),
      child: Container(
        width: double.infinity,
        padding: const EdgeInsets.all(20),
        decoration: BoxDecoration(
          color: Colors.black,
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
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(context.watch<LocaleProvider>().t('add_shift.title') ?? context.watch<LocaleProvider>().t('add_shift.title') ?? 'Добавить смену', style: GoogleFonts.inter(color: Colors.white, fontSize: 18, fontWeight: FontWeight.bold)),
                      if (selectedEmpName.isNotEmpty)
                        Padding(
                          padding: const EdgeInsets.only(top: 4.0),
                          child: Text('${context.watch<LocaleProvider>().t('dashboard.employee') ?? 'Сотрудник:'} ${TransliterationService.transliterateIfNeeded(selectedEmpName!, context.read<LocaleProvider>().currentLang)}', style: GoogleFonts.inter(color: Colors.white54, fontSize: 12)),
                        ),
                    ],
                  ),
                  GestureDetector(
                    onTap: () => Navigator.pop(context),
                    child: const Icon(LucideIcons.x, color: Colors.white54, size: 20),
                  )
                ],
              ),
              const SizedBox(height: 24),
              
              Text(context.watch<LocaleProvider>().t('calendar.employee') ?? context.watch<LocaleProvider>().t('calendar.employee') ?? 'Сотрудник', style: GoogleFonts.inter(color: Colors.white, fontSize: 12, fontWeight: FontWeight.bold)),
              const SizedBox(height: 8),
              Container(
                height: 44,
                padding: const EdgeInsets.symmetric(horizontal: 12),
                decoration: BoxDecoration(
                  color: Colors.black,
                  border: Border.all(color: Colors.white12),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: DropdownButtonHideUnderline(
                  child: DropdownButton<String>(
                    value: _selectedEmployeeId,
                    isExpanded: true,
                    dropdownColor: const Color(0xFF1E293B),
                    icon: const Icon(LucideIcons.chevron_down, color: Colors.white54, size: 16),
                    style: GoogleFonts.inter(color: Colors.white, fontSize: 14),
                    items: widget.employees.map((e) {
                      String role = e['role'] == 'super_admin' ? context.watch<LocaleProvider>().t('role.super_admin') ?? 'Супер-админ' : (e['role'] == 'admin' ? 'Админ' : (e['role'] == 'brigadier' ? context.watch<LocaleProvider>().t('role.brigadier') ?? 'Бригадир' : context.watch<LocaleProvider>().t('calendar.employee') ?? context.watch<LocaleProvider>().t('calendar.employee') ?? 'Сотрудник'));
                      return DropdownMenuItem<String>(
                        value: e['id'],
                        child: Text('${e['full_name']} · $role'),
                      );
                    }).toList(),
                    onChanged: (val) => setState(() => _selectedEmployeeId = val),
                  ),
                ),
              ),
              
              const SizedBox(height: 16),
              Text(context.watch<LocaleProvider>().t('calendar.site') ?? context.watch<LocaleProvider>().t('calendar.site') ?? 'Объект', style: GoogleFonts.inter(color: Colors.white, fontSize: 12, fontWeight: FontWeight.bold)),
              const SizedBox(height: 8),
              Container(
                height: 44,
                padding: const EdgeInsets.symmetric(horizontal: 12),
                decoration: BoxDecoration(
                  color: Colors.black,
                  border: Border.all(color: Colors.white12),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: DropdownButtonHideUnderline(
                  child: DropdownButton<String>(
                    value: _selectedSiteId,
                    hint: Text(context.watch<LocaleProvider>().t('calendar.no_site') ?? context.watch<LocaleProvider>().t('calendar.no_site') ?? '— Без объекта —', style: GoogleFonts.inter(color: Colors.white)),
                    isExpanded: true,
                    dropdownColor: const Color(0xFF1E293B),
                    icon: const Icon(LucideIcons.chevron_down, color: Colors.white54, size: 16),
                    style: GoogleFonts.inter(color: Colors.white, fontSize: 14),
                    items: [
                      DropdownMenuItem<String>(value: null, child: Text(context.watch<LocaleProvider>().t('calendar.no_site') ?? '— Без объекта —')),
                      ...widget.sites.map((s) => DropdownMenuItem<String>(
                        value: s['id'],
                        child: Text(s['name']),
                      )),
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
                        Text(context.watch<LocaleProvider>().t('calendar.start') ?? context.watch<LocaleProvider>().t('calendar.start') ?? 'Начало', style: GoogleFonts.inter(color: Colors.white, fontSize: 12, fontWeight: FontWeight.bold)),
                        const SizedBox(height: 8),
                        GestureDetector(
                          onTap: () => _selectDateTime(context, true),
                          child: Container(
                            height: 44,
                            padding: const EdgeInsets.symmetric(horizontal: 12),
                            decoration: BoxDecoration(
                              border: Border.all(color: Colors.white12),
                              borderRadius: BorderRadius.circular(8),
                            ),
                            alignment: Alignment.centerLeft,
                            child: Text(formatDate(_startedAt), style: GoogleFonts.inter(color: Colors.white, fontSize: 14)),
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
                        Text(context.watch<LocaleProvider>().t('calendar.end') ?? context.watch<LocaleProvider>().t('calendar.end') ?? 'Конец', style: GoogleFonts.inter(color: Colors.white, fontSize: 12, fontWeight: FontWeight.bold)),
                        const SizedBox(height: 8),
                        GestureDetector(
                          onTap: () => _selectDateTime(context, false),
                          child: Container(
                            height: 44,
                            padding: const EdgeInsets.symmetric(horizontal: 12),
                            decoration: BoxDecoration(
                              border: Border.all(color: Colors.white12),
                              borderRadius: BorderRadius.circular(8),
                            ),
                            alignment: Alignment.centerLeft,
                            child: Text(formatDate(_endedAt), style: GoogleFonts.inter(color: Colors.white, fontSize: 14)),
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
              
              const SizedBox(height: 16),
              Text(context.watch<LocaleProvider>().t('calendar.pause') ?? context.watch<LocaleProvider>().t('calendar.pause') ?? 'Пауза (минут)', style: GoogleFonts.inter(color: Colors.white, fontSize: 12, fontWeight: FontWeight.bold)),
              const SizedBox(height: 8),
              SizedBox(
                height: 44,
                child: TextField(
                  controller: _pauseController,
                  style: GoogleFonts.inter(color: Colors.white, fontSize: 14),
                  keyboardType: TextInputType.number,
                  decoration: InputDecoration(
                    contentPadding: const EdgeInsets.symmetric(horizontal: 12),
                    enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(8), borderSide: const BorderSide(color: Colors.white12)),
                    focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(8), borderSide: const BorderSide(color: Colors.white38)),
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
                        Text(context.watch<LocaleProvider>().t('calendar.gps_start') ?? context.watch<LocaleProvider>().t('calendar.gps_start') ?? 'GPS город (старт)', style: GoogleFonts.inter(color: Colors.white, fontSize: 12, fontWeight: FontWeight.bold)),
                        const SizedBox(height: 8),
                        SizedBox(
                          height: 44,
                          child: TextField(
                            controller: _startCityController,
                            style: GoogleFonts.inter(color: Colors.white, fontSize: 14),
                            decoration: InputDecoration(
                              contentPadding: const EdgeInsets.symmetric(horizontal: 12),
                              hintText: 'Köln',
                              hintStyle: GoogleFonts.inter(color: Colors.white24),
                              enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(8), borderSide: const BorderSide(color: Colors.white12)),
                              focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(8), borderSide: const BorderSide(color: Colors.white38)),
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
                        Text(context.watch<LocaleProvider>().t('calendar.gps_end') ?? context.watch<LocaleProvider>().t('calendar.gps_end') ?? 'GPS город (конец)', style: GoogleFonts.inter(color: Colors.white, fontSize: 12, fontWeight: FontWeight.bold)),
                        const SizedBox(height: 8),
                        SizedBox(
                          height: 44,
                          child: TextField(
                            controller: _endCityController,
                            style: GoogleFonts.inter(color: Colors.white, fontSize: 14),
                            decoration: InputDecoration(
                              contentPadding: const EdgeInsets.symmetric(horizontal: 12),
                              hintText: 'Köln',
                              hintStyle: GoogleFonts.inter(color: Colors.white24),
                              enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(8), borderSide: const BorderSide(color: Colors.white12)),
                              focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(8), borderSide: const BorderSide(color: Colors.white38)),
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
              
              const SizedBox(height: 24),
              Row(
                children: [
                  Expanded(
                    flex: 1,
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
                          child: Text(context.watch<LocaleProvider>().t('calendar.cancel') ?? context.watch<LocaleProvider>().t('calendar.cancel') ?? 'Отмена', style: GoogleFonts.inter(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 14)),
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    flex: 1,
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
                              : Text(context.watch<LocaleProvider>().t('calendar.save') ?? context.watch<LocaleProvider>().t('calendar.save') ?? 'Сохранить', style: GoogleFonts.inter(color: Colors.white, fontWeight: FontWeight.normal, fontSize: 14)),
                        ),
                      ),
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}
