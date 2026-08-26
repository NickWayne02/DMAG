import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:mobile_app_flutter/providers/locale_provider.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:flutter_lucide/flutter_lucide.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../../../theme/neon_widgets.dart';
import '../../../utils/transliteration.dart';
import '../../../services/shift_export_service.dart';
import '../admin_calendar_dialog.dart';
import '../admin_shift_edit_sheet.dart';
import '../dialogs/add_shift_dialog.dart';

class EmployeeRow {
  final String id;
  final String name;
  final String role;
  final String status;
  final String? siteName;
  final int workedMs;
  final int lunchMs;
  final String startedAt;
  final Map<String, dynamic>? shiftData;
  final String? avatarUrl;

  EmployeeRow({
    required this.id,
    required this.name,
    required this.role,
    required this.status,
    this.siteName,
    required this.workedMs,
    required this.lunchMs,
    required this.startedAt,
    this.shiftData,
    this.avatarUrl,
  });
}

class PersonnelTab extends StatefulWidget {
  final Function(String)? onNavigateToCalendar;

  const PersonnelTab({super.key, this.onNavigateToCalendar});

  @override
  State<PersonnelTab> createState() => _PersonnelTabState();
}

class _PersonnelTabState extends State<PersonnelTab> {
  bool _isLoading = true;
  List<EmployeeRow> _allEmployees = [];
  List<EmployeeRow> _filteredEmployees = [];
  String _searchQuery = '';
  String _roleFilter = 'all';
  final String _statusFilter = 'all';
  List<Map<String, dynamic>> _sites = [];

  @override
  void initState() {
    super.initState();
    _fetchData();
  }

  Future<void> _fetchData() async {
    setState(() => _isLoading = true);
    try {
      final sinceMidnight = DateTime(DateTime.now().year, DateTime.now().month, DateTime.now().day).toUtc().toIso8601String();

      // Parallel fetch
      final results = await Future.wait([
        Supabase.instance.client.from('profiles').select('id, full_name, email, phone, avatar_url'),
        Supabase.instance.client.from('user_roles').select('user_id, role'),
        Supabase.instance.client.from('shifts')
            .select('id, user_id, site_id, site_name, status, started_at, ended_at, lunch_started_at, lunch_total_ms, start_city, end_city')
            .gte('started_at', sinceMidnight)
            .order('started_at', ascending: false),
        Supabase.instance.client.from('sites').select('id, name'),
      ]);

      final profiles = List<Map<String, dynamic>>.from(results[0]);
      final roles = List<Map<String, dynamic>>.from(results[1]);
      final shifts = List<Map<String, dynamic>>.from(results[2]);
      final sites = List<Map<String, dynamic>>.from(results[3]);

      final roleMap = <String, String>{};
      for (var r in roles) {
        roleMap[r['user_id']] = r['role']; // In reality might need priority logic if multiple roles, but simple here
      }

      final latestShiftByUser = <String, Map<String, dynamic>>{};
      for (var s in shifts) {
        if (!latestShiftByUser.containsKey(s['user_id'])) {
          latestShiftByUser[s['user_id']] = s;
        }
      }

      final nowMs = DateTime.now().millisecondsSinceEpoch;
      final emps = <EmployeeRow>[];

      for (var p in profiles) {
        final id = p['id'] as String;
        final name = TransliterationService.transliterateIfNeeded(p['full_name'] ?? p['email'] ?? p['phone'] ?? context.read<LocaleProvider>().t('personnel.no_name') ?? 'Без имени', context.read<LocaleProvider>().currentLang);
        final role = roleMap[id] ?? 'employee';
        final sh = latestShiftByUser[id];

        String status = 'offline';
        String startedAt = '—';
        int workedMs = 0;
        int lunchMs = 0;
        String? siteName;

        if (sh != null) {
          siteName = sh['site_name'];
          final startedMs = DateTime.parse(sh['started_at']).toLocal().millisecondsSinceEpoch;
          final endedMs = sh['ended_at'] != null ? DateTime.parse(sh['ended_at']).toLocal().millisecondsSinceEpoch : nowMs;
          
          int currentLunch = 0;
          if (sh['status'] == 'lunch' && sh['lunch_started_at'] != null) {
            currentLunch = nowMs - DateTime.parse(sh['lunch_started_at']).toLocal().millisecondsSinceEpoch;
          }
          lunchMs = (sh['lunch_total_ms'] ?? 0) + (currentLunch > 0 ? currentLunch : 0);
          workedMs = (endedMs - startedMs - lunchMs);
          if (workedMs < 0) workedMs = 0;

          if (sh['status'] == 'working') {
            status = 'working';
          } else if (sh['status'] == 'lunch') status = 'lunch';
          else status = 'finished';

          final startDt = DateTime.parse(sh['started_at']).toLocal();
          startedAt = '${startDt.hour.toString().padLeft(2, '0')}:${startDt.minute.toString().padLeft(2, '0')}';
        }

        emps.add(EmployeeRow(
          id: id,
          name: name,
          role: role,
          status: status,
          siteName: siteName,
          workedMs: workedMs,
          lunchMs: lunchMs,
          startedAt: startedAt,
          shiftData: sh,
          avatarUrl: p['avatar_url'],
        ));
      }

      // Sort alphabetically
      emps.sort((a, b) => a.name.compareTo(b.name));

      setState(() {
        _allEmployees = emps;
        _sites = sites;
        _isLoading = false;
        _applyFilters();
      });
    } catch (e) {
      setState(() => _isLoading = false);
    }
  }

  void _applyFilters() {
    setState(() {
      _filteredEmployees = _allEmployees.where((e) {
        if (_searchQuery.isNotEmpty && !e.name.toLowerCase().contains(_searchQuery.toLowerCase())) {
          return false;
        }
        if (_roleFilter != 'all' && e.role != _roleFilter) {
          return false;
        }
        if (_statusFilter != 'all' && e.status != _statusFilter) {
          return false;
        }
        return true;
      }).toList();
    });
  }

  String _formatHM(int ms) {
    int h = ms ~/ 3600000;
    int m = (ms % 3600000) ~/ 60000;
    return '$h${context.watch<LocaleProvider>().t('history.h') ?? 'ч'} ${m.toString().padLeft(2, '0')}${context.watch<LocaleProvider>().t('history.m') ?? 'м'}';
  }

  String _getRoleLabel(String role) {
    switch (role) {
      case 'super_admin': return context.read<LocaleProvider>().t('role.super_admin') ?? 'Супер-админ';
      case 'admin': return context.read<LocaleProvider>().t('role.admin') ?? 'Админ';
      case 'brigadier': return context.read<LocaleProvider>().t('role.brigadier') ?? 'Бригадир';
      default: return context.read<LocaleProvider>().t('dashboard.employee') ?? 'Сотрудник';
    }
  }

  Color _getStatusColor(String status) {
    switch (status) {
      case 'working': return const Color(0xFF22c55e); // Green
      case 'lunch': return const Color(0xFFf59e0b); // Amber
      case 'finished': return const Color(0xFF64748b); // Slate
      default: return const Color(0xFF475569); // Offline Dark Slate
    }
  }

  String _getStatusLabel(String status) {
    switch (status) {
      case 'working': return context.read<LocaleProvider>().t('personnel.status_working') ?? 'На смене';
      case 'lunch': return context.read<LocaleProvider>().t('personnel.status_lunch') ?? 'На паузе';
      case 'finished': return context.read<LocaleProvider>().t('personnel.status_finished') ?? 'Завершена';
      default: return context.watch<LocaleProvider>().t('personnel.offline') ?? 'Офлайн';
    }
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Padding(
          padding: const EdgeInsets.all(16.0),
          child: Column(
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
                        Text(
                          context.watch<LocaleProvider>().t('personnel.monitoring') ?? 'Мониторинг сотрудников',
                          style: GoogleFonts.inter(color: Colors.white, fontSize: 18, fontWeight: FontWeight.bold),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          context.watch<LocaleProvider>().t('personnel.status_and_time') ?? 'Статус смены и время фиксации',
                          style: GoogleFonts.inter(color: Colors.white54, fontSize: 12),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(width: 8),
                  Row(
                    children: [
                      OutlinedButton.icon(
                        style: OutlinedButton.styleFrom(
                          side: const BorderSide(color: Colors.white12),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
                          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 0),
                        ),
                        icon: const Icon(LucideIcons.plus, color: Colors.white, size: 14),
                        label: Text(context.watch<LocaleProvider>().t('personnel.add') ?? 'Добавить', style: GoogleFonts.inter(color: Colors.white, fontSize: 12)),
                        onPressed: () => _showAddShiftModal(null),
                      ),
                      const SizedBox(width: 8),
                      Theme(
                        data: Theme.of(context).copyWith(
                          splashColor: Colors.transparent,
                          highlightColor: Colors.transparent,
                        ),
                        child: PopupMenuButton<String>(
                          color: Colors.black,
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(12),
                            side: const BorderSide(color: Colors.white12),
                          ),
                          offset: const Offset(0, 40),
                          onSelected: (val) {
                            _exportShifts(val);
                          },
                          itemBuilder: (context) => [
                            PopupMenuItem(
                              value: 'Excel',
                              child: Row(
                                children: [
                                  const Icon(LucideIcons.file_spreadsheet, color: Colors.white70, size: 16),
                                  const SizedBox(width: 12),
                                  Text('Excel', style: GoogleFonts.inter(color: Colors.white)),
                                ],
                              ),
                            ),
                            PopupMenuItem(
                              value: 'PDF',
                              child: Row(
                                children: [
                                  const Icon(LucideIcons.file_text, color: Colors.white70, size: 16),
                                  const SizedBox(width: 12),
                                  Text('PDF', style: GoogleFonts.inter(color: Colors.white)),
                                ],
                              ),
                            ),
                          ],
                          child: Container(
                            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                            decoration: BoxDecoration(
                              border: Border.all(color: Colors.white12),
                              borderRadius: BorderRadius.circular(20),
                            ),
                            child: Row(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                const Icon(LucideIcons.download, color: Colors.white, size: 14),
                                const SizedBox(width: 8),
                                Text(context.watch<LocaleProvider>().t('personnel.export') ?? 'Экспорт', style: GoogleFonts.inter(color: Colors.white, fontSize: 12, fontWeight: FontWeight.w500)),
                              ],
                            ),
                          ),
                        ),
                      ),
                    ],
                  )
                ],
              ),
              const SizedBox(height: 16),
              // Search & Filter
              Row(
                children: [
                  Expanded(
                    flex: 2,
                    child: Container(
                      height: 44,
                      padding: const EdgeInsets.symmetric(horizontal: 12),
                      decoration: BoxDecoration(
                        color: Colors.black,
                        border: Border.all(color: Colors.white12),
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: Row(
                        children: [
                          const Icon(LucideIcons.search, color: Colors.white54, size: 16),
                          const SizedBox(width: 8),
                          Expanded(
                            child: TextField(
                              style: GoogleFonts.inter(color: Colors.white, fontSize: 14),
                              decoration: InputDecoration(
                                hintText: context.watch<LocaleProvider>().t('personnel.search') ?? 'Поиск...',
                                hintStyle: GoogleFonts.inter(color: Colors.white54, fontSize: 14),
                                border: InputBorder.none,
                              ),
                              onChanged: (val) {
                                _searchQuery = val;
                                _applyFilters();
                              },
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    flex: 1,
                    child: Container(
                      height: 44,
                      padding: const EdgeInsets.symmetric(horizontal: 12),
                      decoration: BoxDecoration(
                        color: Colors.black,
                        border: Border.all(color: Colors.white12),
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: DropdownButtonHideUnderline(
                        child: DropdownButton<String>(
                          value: _roleFilter,
                          isExpanded: true,
                          dropdownColor: const Color(0xFF1E293B),
                          icon: const Icon(LucideIcons.chevron_down, color: Colors.white54, size: 16),
                          style: GoogleFonts.inter(color: Colors.white, fontSize: 14),
                          items: [
                            DropdownMenuItem(value: 'all', child: Text(context.watch<LocaleProvider>().t('personnel.all_roles') ?? 'Все роли')),
                            DropdownMenuItem(value: 'employee', child: Text(context.watch<LocaleProvider>().t('admin.personnel.employees') ?? 'Сотрудники')),
                            DropdownMenuItem(value: 'brigadier', child: Text(context.watch<LocaleProvider>().t('admin.personnel.brigadiers') ?? 'Бригадиры')),
                          ],
                          onChanged: (val) {
                            if (val != null) {
                              _roleFilter = val;
                              _applyFilters();
                            }
                          },
                        ),
                      ),
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
        Expanded(
          child: _isLoading
              ? const Center(child: CircularProgressIndicator(color: Colors.cyan))
              : _filteredEmployees.isEmpty
                  ? Center(child: Text(context.watch<LocaleProvider>().t('shift_history.empty') ?? 'Нет данных', style: GoogleFonts.inter(color: Colors.white54)))
                  : ListView.builder(
                      padding: const EdgeInsets.only(left: 16, right: 16, bottom: 20),
                      itemCount: _filteredEmployees.length,
                      itemBuilder: (context, index) {
                        return _buildEmployeeCard(_filteredEmployees[index]);
                      },
                    ),
        ),
      ],
    );
  }

  Widget _buildEmployeeCard(EmployeeRow emp) {
    final statusColor = _getStatusColor(emp.status);
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: NeonCard(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Expanded(
                  child: Row(
                    children: [
                      Container(
                        width: 40,
                        height: 40,
                        decoration: BoxDecoration(
                          color: Colors.white.withValues(alpha: 0.1),
                          shape: BoxShape.circle,
                        ),
                        child: emp.avatarUrl != null && emp.avatarUrl!.isNotEmpty 
                            ? CircleAvatar(
                                radius: 22,
                                backgroundImage: NetworkImage(emp.avatarUrl!),
                              )
                            : Center(
                                child: Text(
                                  emp.name.isNotEmpty ? emp.name.substring(0, 1).toUpperCase() : '?',
                                  style: GoogleFonts.inter(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 16),
                                ),
                              ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              TransliterationService.transliterateIfNeeded(emp.name, context.read<LocaleProvider>().currentLang),
                              style: GoogleFonts.inter(color: Colors.white, fontSize: 16, fontWeight: FontWeight.bold),
                              overflow: TextOverflow.ellipsis,
                            ),
                            const SizedBox(height: 4),
                            Text(
                              _getRoleLabel(emp.role),
                              style: GoogleFonts.inter(color: Colors.white54, fontSize: 13),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
                Row(
                  children: [
                    GestureDetector(
                      onTap: () {
                        AdminCalendarDialog.show(context, emp.id, emp.name);
                      },
                      child: const Icon(LucideIcons.calendar, color: Colors.white54, size: 20),
                    ),
                    const SizedBox(width: 16),
                    GestureDetector(
                      onTap: () {
                        _openEditShiftsForMonth(emp);
                      },
                      child: const Icon(LucideIcons.pencil, color: Colors.white54, size: 20),
                    ),
                  ],
                ),
              ],
            ),
            const SizedBox(height: 16),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                  decoration: BoxDecoration(
                    color: statusColor.withValues(alpha: 0.1),
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: statusColor.withValues(alpha: 0.2)),
                  ),
                  child: Row(
                    children: [
                      Container(width: 6, height: 6, decoration: BoxDecoration(shape: BoxShape.circle, color: statusColor)),
                      const SizedBox(width: 6),
                      Text(
                        _getStatusLabel(emp.status),
                        style: GoogleFonts.inter(color: statusColor, fontSize: 12, fontWeight: FontWeight.bold),
                      ),
                    ],
                  ),
                ),
                Text(
                  emp.siteName ?? '—',
                  style: GoogleFonts.inter(color: Colors.white70, fontSize: 13),
                  overflow: TextOverflow.ellipsis,
                ),
              ],
            ),
            if (emp.status != 'offline') ...[
              const SizedBox(height: 12),
              const Divider(color: Colors.white12, height: 1),
              const SizedBox(height: 12),
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  _buildStatItem(context.watch<LocaleProvider>().t('personnel.start') ?? 'Начало', emp.startedAt),
                  _buildStatItem(context.watch<LocaleProvider>().t('personnel.work') ?? 'Работа', _formatHM(emp.workedMs)),
                  _buildStatItem(context.watch<LocaleProvider>().t('personnel.pause') ?? 'Пауза', _formatHM(emp.lunchMs)),
                ],
              )
            ]
          ],
        ),
      ),
    );
  }

  Widget _buildStatItem(String label, String value) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(label, style: GoogleFonts.inter(color: Colors.white54, fontSize: 11)),
        const SizedBox(height: 2),
        Text(value, style: GoogleFonts.inter(color: Colors.white, fontSize: 13, fontWeight: FontWeight.bold)),
      ],
    );
  }

  void _showEditRoleModal(EmployeeRow emp) {
    String selectedRole = emp.role;
    showDialog(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (context, setStateModal) {
          return Dialog(
            backgroundColor: Colors.transparent,
            insetPadding: const EdgeInsets.all(16),
            child: Container(
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                color: Colors.black,
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: Colors.white12),
              ),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(context.watch<LocaleProvider>().t('personnel.edit_role') ?? 'Редактировать роль', style: GoogleFonts.inter(color: Colors.white, fontSize: 18, fontWeight: FontWeight.bold)),
                      GestureDetector(onTap: () => Navigator.pop(ctx), child: const Icon(LucideIcons.x, color: Colors.white54, size: 20)),
                    ],
                  ),
                  const SizedBox(height: 4),
                  Text('${context.watch<LocaleProvider>().t('dashboard.employee') ?? 'Сотрудник:'} ${TransliterationService.transliterateIfNeeded(emp.name, context.read<LocaleProvider>().currentLang)}', style: GoogleFonts.inter(color: Colors.white54, fontSize: 14)),
                  const SizedBox(height: 24),
                  Text(context.watch<LocaleProvider>().t('personnel.access_role') ?? 'Роль доступа', style: GoogleFonts.inter(color: Colors.white, fontSize: 13, fontWeight: FontWeight.bold)),
                  const SizedBox(height: 8),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
                    decoration: BoxDecoration(
                      color: Colors.black,
                      border: Border.all(color: Colors.white12),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: DropdownButtonHideUnderline(
                      child: DropdownButton<String>(
                        value: selectedRole,
                        isExpanded: true,
                        dropdownColor: const Color(0xFF1E293B),
                        icon: const Icon(LucideIcons.chevron_down, color: Colors.white54, size: 16),
                        style: GoogleFonts.inter(color: Colors.white, fontSize: 14),
                        items: [
                          DropdownMenuItem(value: 'employee', child: Text(context.watch<LocaleProvider>().t('role.employee') ?? 'Сотрудник')),
                          DropdownMenuItem(value: 'brigadier', child: Text(context.watch<LocaleProvider>().t('role.brigadier') ?? context.read<LocaleProvider>().t('role.brigadier') ?? 'Бригадир')),
                          DropdownMenuItem(value: 'admin', child: Text(context.watch<LocaleProvider>().t('role.admin') ?? 'Администратор')),
                        ],
                        onChanged: (val) {
                          if (val != null) setStateModal(() => selectedRole = val);
                        },
                      ),
                    ),
                  ),
                  const SizedBox(height: 24),
                  SizedBox(
                    width: double.infinity,
                    height: 44,
                    child: ElevatedButton(
                      style: ElevatedButton.styleFrom(
                        backgroundColor: const Color(0xFF334155),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                      ),
                      onPressed: () async {
                        try {
                          await Supabase.instance.client.from('user_roles').upsert({'user_id': emp.id, 'role': selectedRole});
                          if (mounted) {
                            Navigator.pop(ctx);
                            _fetchData(); // Reload list
                          }
                        } catch (e) {
                          if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('${context.read<LocaleProvider>().t('auth.errors.default') ?? 'Ошибка:'} $e')));
                        }
                      },
                      child: Text(context.watch<LocaleProvider>().t('settings.save') ?? 'Сохранить', style: GoogleFonts.inter(color: Colors.white, fontWeight: FontWeight.w600)),
                    ),
                  ),
                ],
              ),
            ),
          );
        },
      ),
    );
  }

  Future<void> _openEditShiftsForMonth(EmployeeRow emp) async {
    final now = DateTime.now();
    final startOfMonth = DateTime(now.year, now.month, 1);
    final endOfMonth = DateTime(now.year, now.month + 1, 0, 23, 59, 59);

    final resp = await Supabase.instance.client
        .from('shifts')
        .select('id, user_id, site_id, site_name, started_at, ended_at, lunch_total_ms, start_city, end_city')
        .eq('user_id', emp.id)
        .gte('started_at', startOfMonth.toUtc().toIso8601String())
        .lte('started_at', endOfMonth.toUtc().toIso8601String())
        .order('started_at', ascending: false);

    if (!mounted) return;

    final shifts = List<Map<String, dynamic>>.from(resp);

    AdminShiftEditSheet.show(
      context: context,
      employeeId: emp.id,
      employeeName: emp.name,
      date: DateTime.now(),
      existingShifts: shifts,
      onSaved: _fetchData,
    );
  }

  void _showAddShiftModal(String? initialEmployeeId) {
    if (_allEmployees.isEmpty) return;
    
    final empsList = _allEmployees.map((e) => <String, dynamic>{
      'id': e.id,
      'full_name': e.name,
      'role': e.role,
    }).toList();

    showDialog(
      context: context,
      builder: (context) {
        return AddShiftDialog(
          employees: empsList,
          sites: _sites,
          initialEmployeeId: initialEmployeeId,
          onSaved: _fetchData,
        );
      },
    );
  }

  Future<void> _exportShifts(String format) async {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text('${context.read<LocaleProvider>().t('admin.export.generating') ?? 'Генерация'} $format...')),
    );

    try {
      final now = DateTime.now();
      final thirtyDaysAgo = now.subtract(const Duration(days: 30));

      final response = await Supabase.instance.client
          .from('shifts')
          .select()
          .gte('started_at', thirtyDaysAgo.toUtc().toIso8601String())
          .order('started_at', ascending: false);

      final shifts = List<Map<String, dynamic>>.from(response);

      final empsList = _allEmployees.map((e) => <String, dynamic>{
        'id': e.id,
        'full_name': e.name,
        'role': e.role,
      }).toList();

      final baseName = '''${context.read<LocaleProvider>().t('export.report') ?? 'Отчёт'}_${now.day}_${now.month}_${now.year}''';
      final tMap = {
        'sheet_name': context.read<LocaleProvider>().t('export.sheet_name') ?? 'Смены',
        'date': context.read<LocaleProvider>().t('export.date') ?? 'Дата',
        'employee': context.read<LocaleProvider>().t('export.employee') ?? 'Сотрудник',
        'site': context.read<LocaleProvider>().t('export.site') ?? 'Объект',
        'work_start': context.read<LocaleProvider>().t('export.work_start') ?? 'Начало работы',
        'pause_start': context.read<LocaleProvider>().t('export.pause_start') ?? 'Начало паузы',
        'pause_end': context.read<LocaleProvider>().t('export.pause_end') ?? 'Конец паузы',
        'work_end': context.read<LocaleProvider>().t('export.work_end') ?? 'Конец работы',
        'pause_mins': context.read<LocaleProvider>().t('export.pause_mins') ?? 'Пауза (мин)',
        'worked': context.read<LocaleProvider>().t('export.worked') ?? 'Отработано',
        'generated': context.read<LocaleProvider>().t('export.generated') ?? 'Сформировано',
      };


            if (format == 'Excel') {
        await ShiftExportService.exportExcel(shifts, empsList, _sites, '$baseName.xlsx', t: tMap);
      } else {
        await ShiftExportService.exportPdf(shifts, empsList, _sites, '$baseName.pdf', context.read<LocaleProvider>().t('personnel.report_title') ?? 'Отчёт по сменам (30 дней)', t: tMap);
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('${context.read<LocaleProvider>().t('admin.export.error') ?? 'Ошибка экспорта:'} $e')),
        );
      }
    }
  }
}
