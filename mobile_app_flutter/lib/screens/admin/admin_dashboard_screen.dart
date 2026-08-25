import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:flutter_lucide/flutter_lucide.dart';
import 'tabs/dashboard_tab.dart';
import 'tabs/calendar_tab.dart';
import 'tabs/personnel_tab.dart';
import 'tabs/sites_tab.dart';
import 'tabs/reports_tab.dart';
import 'tabs/sessions_tab.dart';
import 'tabs/users_tab.dart';
import 'tabs/chat_tab.dart';
import '../../services/auth_service.dart';
import '../dashboard_screen.dart';
import '../settings_sheet.dart';
import 'package:provider/provider.dart';
import '../../providers/shift_provider.dart';
import '../../providers/locale_provider.dart';
import '../../theme/app_theme.dart';

class AdminDashboardScreen extends StatefulWidget {
  const AdminDashboardScreen({Key? key}) : super(key: key);

  @override
  State<AdminDashboardScreen> createState() => _AdminDashboardScreenState();
}

class _AdminDashboardScreenState extends State<AdminDashboardScreen> {
  int _currentIndex = 0;

  late final List<Widget> _tabs = [
    const DashboardTab(),
    const CalendarTab(),
    PersonnelTab(
      onNavigateToCalendar: (employeeId) {
        CalendarTab.initialEmployeeId = employeeId;
        setState(() => _currentIndex = 1);
      },
    ),
    const SitesTab(),
    const ReportsTab(),
    const SessionsTab(),
    const UsersTab(),
    const ChatTab(),
  ];

  String _getTabTitle(BuildContext context, int index) {
    final t = context.watch<LocaleProvider>().t;
    switch (index) {
      case 0: return t('admin.tab.dashboard');
      case 1: return t('admin.tab.calendar');
      case 2: return t('admin.tab.personnel');
      case 3: return t('admin.tab.sites');
      case 4: return t('admin.tab.reports');
      case 5: return t('admin.tab.security');
      case 6: return t('admin.tab.users');
      case 7: return t('admin.tab.chat') ?? 'Чат';
      default: return '';
    }
  }

  void _onMenuTap(int index) {
    setState(() {
      _currentIndex = index;
    });
    Navigator.of(context).pop(); // Close drawer
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colors = theme.appColors;
    
    return Scaffold(
      backgroundColor: theme.scaffoldBackgroundColor,
      appBar: AppBar(
        backgroundColor: colors.card,
        elevation: 0,
        title: Text(
          _getTabTitle(context, _currentIndex),
          style: GoogleFonts.inter(fontSize: 18, fontWeight: FontWeight.bold, color: colors.foreground),
        ),
        actions: [
          IconButton(
            icon: Icon(LucideIcons.arrow_left, color: colors.foreground.withOpacity(0.54), size: 20),
            tooltip: 'Вернуться в режим сотрудника',
            onPressed: () {
              Navigator.of(context).pushReplacement(
                MaterialPageRoute(builder: (_) => const DashboardScreen()),
              );
            },
          ),
          IconButton(
            icon: Icon(LucideIcons.settings, color: colors.foreground.withOpacity(0.54), size: 20),
            onPressed: () {
              SettingsSheet.show(context);
            },
          ),
          IconButton(
            icon: Icon(LucideIcons.log_out, color: colors.foreground.withOpacity(0.54), size: 20),
            onPressed: () async {
              showDialog(
                context: context,
                barrierDismissible: false,
                builder: (c) => Center(child: CircularProgressIndicator(color: colors.primaryForeground)),
              );
              context.read<ShiftProvider>().resetShift();
              await AuthService.signOut();
              if (context.mounted) Navigator.pop(context);
            },
          ),
          const SizedBox(width: 8),
        ],
        iconTheme: IconThemeData(color: colors.foreground),
      ),
      drawer: Drawer(
        backgroundColor: colors.card,
        child: Column(
          children: [
            // Drawer Header
            Container(
              padding: const EdgeInsets.only(top: 60, bottom: 20, left: 24, right: 24),
              alignment: Alignment.centerLeft,
              child: Row(
                children: [
                  Container(
                    width: 40,
                    height: 40,
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      border: Border.all(color: colors.border),
                    ),
                    child: Center(
                      child: Text('D', style: TextStyle(color: colors.foreground, fontSize: 20, fontWeight: FontWeight.bold)),
                    ), // Using placeholder for DMAG logo
                  ),
                  const SizedBox(width: 12),
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text('DMAG', style: GoogleFonts.inter(color: colors.foreground, fontSize: 16, fontWeight: FontWeight.bold)),
                      Text('Admin Console', style: GoogleFonts.inter(color: colors.foreground.withOpacity(0.54), fontSize: 12)),
                    ],
                  ),
                ],
              ),
            ),
            Divider(color: colors.border, height: 1),
            const SizedBox(height: 16),
            // Drawer Items
            Expanded(
              child: ListView(
                padding: EdgeInsets.zero,
                children: [
                  _buildDrawerItem(context, 0, LucideIcons.activity, _getTabTitle(context, 0), colors),
                  _buildDrawerItem(context, 1, LucideIcons.calendar, _getTabTitle(context, 1), colors),
                  _buildDrawerItem(context, 2, LucideIcons.users, _getTabTitle(context, 2), colors),
                  _buildDrawerItem(context, 3, LucideIcons.building_2, _getTabTitle(context, 3), colors),
                  _buildDrawerItem(context, 4, LucideIcons.camera, _getTabTitle(context, 4), colors),
                  _buildDrawerItem(context, 5, LucideIcons.shield_check, _getTabTitle(context, 5), colors),
                  _buildDrawerItem(context, 6, LucideIcons.user_cog, _getTabTitle(context, 6), colors),
                  _buildDrawerItem(context, 7, LucideIcons.message_square, _getTabTitle(context, 7), colors),
                ],
              ),
            ),
          ],
        ),
      ),
      body: AnimatedSwitcher(
        duration: const Duration(milliseconds: 300),
        switchInCurve: Curves.easeOutCubic,
        switchOutCurve: Curves.easeInCubic,
        transitionBuilder: (Widget child, Animation<double> animation) {
          return FadeTransition(
            opacity: animation,
            child: SlideTransition(
              position: Tween<Offset>(
                begin: const Offset(0.02, 0),
                end: Offset.zero,
              ).animate(animation),
              child: child,
            ),
          );
        },
        child: Container(
          key: ValueKey<int>(_currentIndex),
          child: _tabs[_currentIndex],
        ),
      ),
    );
  }

  Widget _buildDrawerItem(BuildContext context, int index, IconData icon, String title, AppColors colors) {
    final isSelected = _currentIndex == index;
    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 12, vertical: 2),
      decoration: BoxDecoration(
        color: isSelected ? colors.primary.withOpacity(0.15) : Colors.transparent,
        borderRadius: BorderRadius.circular(8),
      ),
      child: ListTile(
        hoverColor: Colors.transparent,
        focusColor: Colors.transparent,
        splashColor: Colors.transparent,
        leading: Icon(icon, color: isSelected ? colors.primary : colors.foreground.withOpacity(0.7), size: 20),
        title: Text(
          title,
          style: GoogleFonts.inter(
            color: isSelected ? colors.primary : colors.foreground,
            fontSize: 14,
            fontWeight: isSelected ? FontWeight.w600 : FontWeight.normal,
          ),
        ),
        onTap: () => _onMenuTap(index),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
      ),
    );
  }
}
