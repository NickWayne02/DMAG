import '../../../../utils/transliteration.dart';
import '../../../../utils/date_format_helper.dart';
import 'package:provider/provider.dart';
import 'package:mobile_app_flutter/providers/locale_provider.dart';
import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:flutter_lucide/flutter_lucide.dart';
import '../../../theme/neon_widgets.dart';

class DashboardTab extends StatelessWidget {
  const DashboardTab({super.key});

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
              _buildStatCard('0', context.watch<LocaleProvider>().t('admin_dashboard.emp_on_shift') ?? 'Сотрудников на\nсмене', LucideIcons.users, const Color(0xFF22c55e)), // Green
              _buildStatCard('0', context.watch<LocaleProvider>().t('admin_dashboard.on_lunch') ?? 'На обеде', LucideIcons.clock, const Color(0xFFf59e0b)), // Amber
              _buildStatCard('6', context.watch<LocaleProvider>().t('admin_dashboard.active_sites') ?? 'Активных объектов', LucideIcons.building_2, const Color(0xFF64748b)), // Slate
              _buildStatCard('0', context.watch<LocaleProvider>().t('admin_dashboard.urgent_reports') ?? 'Срочных отчётов', LucideIcons.shield_alert, const Color(0xFFef4444)), // Red
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
                    color: Colors.white,
                    fontSize: 18,
                    fontWeight: FontWeight.bold,
                  ),
                ),
                const SizedBox(height: 20),
                _buildActivityItem(
                  context.watch<LocaleProvider>().t('export.work_end') ?? 'Окончание смены',
                  " ${TransliterationService.transliterateIfNeeded('Евгений Костин', context.read<LocaleProvider>().currentLang)} ${context.watch<LocaleProvider>().t('admin_dashboard.finished_shift') ?? 'завершил смену на объекте Неизвестно'} ",
                  _getMockDate(context, '19:58'),
                  LucideIcons.activity,
                  const Color(0xFF3b82f6), // Blue
                ),
                const SizedBox(height: 16),
                _buildActivityItem(
                  context.watch<LocaleProvider>().t('export.work_start') ?? 'Начало смены',
                  "${TransliterationService.transliterateIfNeeded('Евгений Костин', context.read<LocaleProvider>().currentLang)} ${context.watch<LocaleProvider>().t('admin_dashboard.started_shift') ?? 'начал смену на объекте Неизвестно'}",
                  _getMockDate(context, '19:58'),
                  LucideIcons.users,
                  const Color(0xFF22c55e), // Green
                ),
                const SizedBox(height: 16),
                _buildActivityItem(
                  context.watch<LocaleProvider>().t('export.work_end') ?? 'Окончание смены',
                  " ${TransliterationService.transliterateIfNeeded('Евгений Костин', context.read<LocaleProvider>().currentLang)} ${context.watch<LocaleProvider>().t('admin_dashboard.finished_shift') ?? 'завершил смену на объекте Неизвестно'} ",
                  _getMockDate(context, '19:53'),
                  LucideIcons.activity,
                  const Color(0xFF3b82f6), // Blue
                ),
                const SizedBox(height: 16),
                _buildActivityItem(
                  context.watch<LocaleProvider>().t('export.work_start') ?? 'Начало смены',
                  "${TransliterationService.transliterateIfNeeded('Евгений Костин', context.read<LocaleProvider>().currentLang)} ${context.watch<LocaleProvider>().t('admin_dashboard.started_shift') ?? 'начал смену на объекте Неизвестно'}",
                  _getMockDate(context, '19:52'),
                  LucideIcons.users,
                  const Color(0xFF22c55e), // Green
                ),
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
    final dt = DateTime(2026, 8, 22, int.parse(parts[0]), int.parse(parts[1]));
    return DateFormatHelper.formatShortDate(dt, lang);
  }

  Widget _buildStatCard(String value, String title, IconData icon, Color color) {
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
                  color: Colors.white,
                  fontSize: 28,
                  fontWeight: FontWeight.bold,
                ),
              ),
              const SizedBox(height: 4),
              Text(
                title,
                style: GoogleFonts.inter(
                  color: Colors.white54,
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

  Widget _buildActivityItem(String title, String subtitle, String time, IconData icon, Color color) {
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
                      color: Colors.white,
                      fontSize: 14,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  Text(
                    time,
                    style: GoogleFonts.inter(
                      color: Colors.white54,
                      fontSize: 12,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 4),
              Text(
                subtitle,
                style: GoogleFonts.inter(
                  color: Colors.white54,
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
