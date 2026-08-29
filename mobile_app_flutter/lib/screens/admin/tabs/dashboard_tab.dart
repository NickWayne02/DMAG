import '../../../../utils/transliteration.dart';
import '../../../../utils/date_format_helper.dart';
import 'package:provider/provider.dart';
import 'package:mobile_app_flutter/providers/locale_provider.dart';
import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:flutter_lucide/flutter_lucide.dart';
import '../../../theme/neon_widgets.dart';
import '../../../theme/app_theme.dart';

import 'package:supabase_flutter/supabase_flutter.dart';

class DashboardTab extends StatefulWidget {
  const DashboardTab({super.key});

  @override
  State<DashboardTab> createState() => _DashboardTabState();
}

class _DashboardTabState extends State<DashboardTab> {
  List<Map<String, dynamic>> _activities = [];
  bool _isLoading = true;
  String? _errorMessage;
  RealtimeChannel? _subscription;
  
  int _employeesOnShift = 0;
  int _employeesOnLunch = 0;
  int _activeSitesCount = 0;
  final int _urgentReportsCount = 0;

  @override
  void initState() {
    super.initState();
    _fetchActivity();
    _setupRealtime();
  }

  void _setupRealtime() {
    _subscription = Supabase.instance.client
        .channel('public:shifts')
        .onPostgresChanges(
          event: PostgresChangeEvent.all,
          schema: 'public',
          table: 'shifts',
          callback: (payload) {
            _fetchActivity();
          },
        )
        .subscribe();
  }

  @override
  void dispose() {
    _subscription?.unsubscribe();
    super.dispose();
  }

  Future<void> _fetchActivity() async {
    try {
      final now = DateTime.now();
      final sinceMidnight = DateTime(now.year, now.month, now.day).toUtc().toIso8601String();

      final resp = await Supabase.instance.client
          .from('shifts')
          .select('id, user_id, site_name, status, started_at, ended_at, lunch_started_at, lunch_intervals, start_city, end_city, site_id')
          .gte('started_at', sinceMidnight)
          .order('started_at', ascending: false)
          .limit(50);
          
      final activeSitesSet = <String>{};
      int onShift = 0;
      int onLunch = 0;
      
      final profilesResp = await Supabase.instance.client.from('profiles').select('id, full_name');
      final profiles = {for (var p in profilesResp) p['id'] as String: p['full_name'] as String? ?? 'Неизвестный сотрудник'};
      
      final List<Map<String, dynamic>> enriched = [];
      for (var s in resp) {
        final userName = profiles[s['user_id']] ?? 'Неизвестный сотрудник';
        final siteName = s['site_name'] ?? s['start_city'] ?? 'Неизвестный объект';
        
        if (s['status'] == 'working') {
          onShift++;
          if (s['site_id'] != null) activeSitesSet.add(s['site_id'].toString());
        } else if (s['status'] == 'lunch') {
          onLunch++;
          if (s['site_id'] != null) activeSitesSet.add(s['site_id'].toString());
        }
        
        // Shift Start
        if (s['started_at'] != null) {
          enriched.add({
            'ts': s['started_at'],
            'type': 'shift_start',
            'user_name': userName,
            'site_name': siteName,
          });
        }
        
        // Shift End
        if (s['ended_at'] != null) {
          enriched.add({
            'ts': s['ended_at'],
            'type': 'shift_end',
            'user_name': userName,
            'site_name': s['site_name'] ?? s['end_city'] ?? siteName,
          });
        }
        
        // Lunch Intervals
        final lunchIntervals = (s['lunch_intervals'] as List<dynamic>?) ?? [];
        for (var i = 0; i < lunchIntervals.length; i++) {
          final interval = lunchIntervals[i] as Map<String, dynamic>?;
          if (interval == null) continue;
          
          if (interval['start'] != null) {
            final startDate = DateTime.fromMillisecondsSinceEpoch(interval['start'] as int).toUtc().toIso8601String();
            enriched.add({
              'ts': startDate,
              'type': 'lunch_start',
              'user_name': userName,
              'site_name': siteName,
            });
          }
          if (interval['end'] != null) {
            final endDate = DateTime.fromMillisecondsSinceEpoch(interval['end'] as int).toUtc().toIso8601String();
            
            // Check for auto-closed lunch (within 2 seconds of shift end)
            bool isAutoClosed = false;
            if (s['ended_at'] != null) {
              final endShiftDt = DateTime.parse(s['ended_at']);
              final endLunchDt = DateTime.fromMillisecondsSinceEpoch(interval['end'] as int);
              if (endShiftDt.difference(endLunchDt).inMilliseconds.abs() < 2000) {
                isAutoClosed = true;
              }
            }
            
            if (!isAutoClosed) {
              enriched.add({
                'ts': endDate,
                'type': 'lunch_end',
                'user_name': userName,
                'site_name': siteName,
              });
            }
          }
        }
        
        // Active Lunch Start
        if (s['lunch_started_at'] != null) {
          enriched.add({
            'ts': s['lunch_started_at'],
            'type': 'lunch_start',
            'user_name': userName,
            'site_name': siteName,
          });
        }
      }
      
      // Sort all synthesized events by timestamp descending
      enriched.sort((a, b) => DateTime.parse(b['ts']).compareTo(DateTime.parse(a['ts'])));
      
      if (mounted) {
        setState(() {
          _activities = enriched.take(50).toList();
          _employeesOnShift = onShift;
          _employeesOnLunch = onLunch;
          _activeSitesCount = activeSitesSet.length;
          _isLoading = false;
          _errorMessage = null;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _isLoading = false;
          _errorMessage = e.toString();
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(16.0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Stat Cards Grid
          GridView.count(
            crossAxisCount: 2,
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            crossAxisSpacing: 16,
            mainAxisSpacing: 16,
            childAspectRatio: 1.1,
            children: [
              _buildStatCard(context, _employeesOnShift.toString(), context.watch<LocaleProvider>().t('admin_dashboard.emp_on_shift') ?? 'Сотрудников на\nсмене', LucideIcons.users, const Color(0xFF22c55e)), // Green
              _buildStatCard(context, _employeesOnLunch.toString(), context.watch<LocaleProvider>().t('admin_dashboard.on_lunch') ?? 'На обеде', LucideIcons.clock, const Color(0xFFf59e0b)), // Amber
              _buildStatCard(context, _activeSitesCount.toString(), context.watch<LocaleProvider>().t('admin_dashboard.active_sites') ?? 'Активных объектов', LucideIcons.building_2, const Color(0xFF64748b)), // Slate
              _buildStatCard(context, _urgentReportsCount.toString(), context.watch<LocaleProvider>().t('admin_dashboard.urgent_reports') ?? 'Срочных отчётов', LucideIcons.shield_alert, const Color(0xFFef4444)), // Red
            ],
          ),
          const SizedBox(height: 24),
          // Recent Activity Section
          NeonCard(
            padding: const EdgeInsets.all(20),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  context.watch<LocaleProvider>().t('admin_dashboard.recent_activity') ?? 'Последняя активность',
                  style: GoogleFonts.inter(
                    color: Theme.of(context).appColors.foreground,
                    fontSize: 18,
                    fontWeight: FontWeight.bold,
                  ),
                ),
                const SizedBox(height: 20),
                if (_isLoading)
                  const Center(child: Padding(padding: EdgeInsets.all(20), child: CircularProgressIndicator()))
                else if (_errorMessage != null)
                  Center(
                    child: Padding(
                      padding: const EdgeInsets.all(20),
                      child: Text(
                        _errorMessage!,
                        style: GoogleFonts.inter(color: Colors.red.withValues(alpha: 0.8)),
                        textAlign: TextAlign.center,
                      ),
                    ),
                  )
                else if (_activities.isEmpty)
                  Center(
                    child: Padding(
                      padding: const EdgeInsets.all(20),
                      child: Text(
                        context.watch<LocaleProvider>().t('admin.activity.emptyTitle') ?? 'Активности пока нет',
                        style: GoogleFonts.inter(color: Theme.of(context).appColors.foreground.withValues(alpha: 0.54)),
                      ),
                    ),
                  )
                else
                  ..._activities.map((act) {
                    String title = '';
                    String subtitle = '';
                    IconData icon = LucideIcons.activity;
                    Color color = const Color(0xFF3b82f6);
                    
                    final lang = context.watch<LocaleProvider>().currentLang;
                    final name = TransliterationService.transliterateIfNeeded(act['user_name'], lang);
                    final site = TransliterationService.transliterateIfNeeded(act['site_name'], lang);
                    final dt = DateTime.parse(act['ts']).toLocal();
                    final timeStr = DateFormatHelper.formatShortDate(dt, lang);
                    
                    switch (act['type']) {
                      case 'shift_start':
                        title = context.watch<LocaleProvider>().t('export.work_start') ?? 'Начало смены';
                        subtitle = "$name ${context.watch<LocaleProvider>().t('admin_dashboard.started_shift') ?? 'начал смену на объекте'} $site";
                        icon = LucideIcons.users;
                        color = const Color(0xFF22c55e);
                        break;
                      case 'shift_end':
                        title = context.watch<LocaleProvider>().t('export.work_end') ?? 'Окончание смены';
                        subtitle = "$name ${context.watch<LocaleProvider>().t('admin_dashboard.finished_shift') ?? 'завершил смену на объекте'} $site";
                        icon = LucideIcons.activity;
                        color = const Color(0xFF3b82f6);
                        break;
                      case 'lunch_start':
                        title = context.watch<LocaleProvider>().t('export.pause_start') ?? 'Начало обеда';
                        subtitle = "$name ${context.watch<LocaleProvider>().t('admin_dashboard.started_lunch') ?? 'ушел на обед'}";
                        icon = LucideIcons.coffee;
                        color = const Color(0xFFf59e0b);
                        break;
                      case 'lunch_end':
                        title = context.watch<LocaleProvider>().t('export.pause_end') ?? 'Окончание обеда';
                        subtitle = "$name ${context.watch<LocaleProvider>().t('admin_dashboard.finished_lunch') ?? 'вернулся с обеда'}";
                        icon = LucideIcons.coffee;
                        color = const Color(0xFFf59e0b);
                        break;
                    }
                    
                    return Padding(
                      padding: const EdgeInsets.only(bottom: 16),
                      child: _buildActivityItem(context, title, subtitle, timeStr, icon, color),
                    );
                  }),
              ],
            ),
          ),
        ],
      ),
    );
  }



  Widget _buildStatCard(BuildContext context, String value, String title, IconData icon, Color color) {
    return NeonCard(
      glowColor: color.withValues(alpha: 0.3),
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Container(
            padding: const EdgeInsets.all(8),
            decoration: BoxDecoration(
              color: color.withValues(alpha: 0.1),
              shape: BoxShape.circle,
            ),
            child: Icon(icon, color: color, size: 20),
          ),
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                value,
                style: GoogleFonts.inter(
                  color: Theme.of(context).appColors.foreground,
                  fontSize: 28,
                  fontWeight: FontWeight.bold,
                ),
              ),
              const SizedBox(height: 4),
              Text(
                title,
                style: GoogleFonts.inter(
                  color: Theme.of(context).appColors.foreground.withValues(alpha: 0.54),
                  fontSize: 13,
                  height: 1.2,
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildActivityItem(BuildContext context, String title, String subtitle, String time, IconData icon, Color color) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Container(
          margin: const EdgeInsets.only(top: 2),
          padding: const EdgeInsets.all(8),
          decoration: BoxDecoration(
            color: color.withValues(alpha: 0.1),
            shape: BoxShape.circle,
          ),
          child: Icon(icon, color: color, size: 16),
        ),
        const SizedBox(width: 12),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    title,
                    style: GoogleFonts.inter(
                      color: Theme.of(context).appColors.foreground,
                      fontSize: 14,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  Text(
                    time,
                    style: GoogleFonts.inter(
                      color: Theme.of(context).appColors.foreground.withValues(alpha: 0.54),
                      fontSize: 12,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 4),
              Text(
                subtitle,
                style: GoogleFonts.inter(
                  color: Theme.of(context).appColors.foreground.withValues(alpha: 0.54),
                  fontSize: 13,
                  height: 1.4,
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }
}
