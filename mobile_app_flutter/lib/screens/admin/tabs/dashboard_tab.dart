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

  @override
  void initState() {
    super.initState();
    _fetchActivity();
  }

  Future<void> _fetchActivity() async {
    try {
      final resp = await Supabase.instance.client
          .from('shift_history')
          .select()
          .order('ts', ascending: false)
          .limit(50);
      
      final profilesResp = await Supabase.instance.client.from('profiles').select('id, full_name');
      final sitesResp = await Supabase.instance.client.from('sites').select('id, name');
      
      final profiles = {for (var p in profilesResp) p['id'] as String: p['full_name'] as String? ?? 'Неизвестный сотрудник'};
      final sites = {for (var s in sitesResp) s['id'] as String: s['name'] as String? ?? 'Неизвестное место'};
      
      final List<Map<String, dynamic>> enriched = [];
      for (var item in resp) {
        enriched.add({
          ...item,
          'user_name': profiles[item['user_id']] ?? 'Неизвестный сотрудник',
          'site_name': sites[item['site_id']] ?? 'Неизвестный объект',
        });
      }
      
      if (mounted) {
        setState(() {
          _activities = enriched;
          _isLoading = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() => _isLoading = false);
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
              _buildStatCard(context, '0', context.watch<LocaleProvider>().t('admin_dashboard.emp_on_shift') ?? 'Сотрудников на\nсмене', LucideIcons.users, const Color(0xFF22c55e)), // Green
              _buildStatCard(context, '0', context.watch<LocaleProvider>().t('admin_dashboard.on_lunch') ?? 'На обеде', LucideIcons.clock, const Color(0xFFf59e0b)), // Amber
              _buildStatCard(context, '6', context.watch<LocaleProvider>().t('admin_dashboard.active_sites') ?? 'Активных объектов', LucideIcons.building_2, const Color(0xFF64748b)), // Slate
              _buildStatCard(context, '0', context.watch<LocaleProvider>().t('admin_dashboard.urgent_reports') ?? 'Срочных отчётов', LucideIcons.shield_alert, const Color(0xFFef4444)), // Red
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

  String _getMockDate(BuildContext context, String time) {
    final lang = context.watch<LocaleProvider>().currentLang;
    final parts = time.split(':');
    final now = DateTime.now();
    final dt = DateTime(now.year, now.month, now.day, int.parse(parts[0]), int.parse(parts[1]));
    return DateFormatHelper.formatShortDate(dt, lang);
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
