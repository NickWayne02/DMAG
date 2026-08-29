import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';
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
import '../../utils/fade_page_route.dart';
import '../settings_sheet.dart';
import '../../main.dart';
import 'package:provider/provider.dart';
import 'package:mobile_app_flutter/providers/locale_provider.dart';
import '../../providers/shift_provider.dart';
import '../../providers/settings_provider.dart';
import '../../theme/app_theme.dart';

class AdminDashboardScreen extends StatefulWidget {
  const AdminDashboardScreen({super.key});

  @override
  State<AdminDashboardScreen> createState() => _AdminDashboardScreenState();
}

class _AdminDashboardScreenState extends State<AdminDashboardScreen> {
  int _currentIndex = 0;

  late final List<Widget> _tabs = [
    const DashboardTab(),
    const CalendarTab(),
    PersonnelTab(
      onNavigateToCalendar: (employeeId) async {
        CalendarTab.initialEmployeeId = employeeId;
        setState(() => _currentIndex = 1);
        final prefs = await SharedPreferences.getInstance();
        await prefs.setInt('admin_dashboard_tab', 1);
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
      case 0: return t('admin.tab.dashboard') ?? 'Дашборд';
      case 1: return t('admin.tab.calendar') ?? 'Календарь';
      case 2: return t('admin.tab.personnel') ?? 'Персонал';
      case 3: return t('admin.tab.sites') ?? 'Объекты';
      case 4: return t('admin.tab.reports') ?? 'Отчёты';
      case 5: return t('admin.tab.security') ?? 'Безопасность';
      case 6: return t('admin.tab.users') ?? 'Управление';
      case 7: return t('admin.tab.chat') ?? 'Чат';
      default: return '';
    }
  }

  @override
  void initState() {
    super.initState();
    _loadTab();
  }

  Future<void> _loadTab() async {
    final prefs = await SharedPreferences.getInstance();
    if (mounted) {
      setState(() {
        _currentIndex = prefs.getInt('admin_dashboard_tab') ?? 0;
      });
    }
  }

  void _onMenuTap(int index) async {
    setState(() {
      _currentIndex = index;
    });
    Navigator.of(context).pop(); // Close drawer
    final prefs = await SharedPreferences.getInstance();
    await prefs.setInt('admin_dashboard_tab', index);
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
            icon: Container(
              padding: const EdgeInsets.all(6),
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                border: Border.all(color: colors.border),
              ),
              child: Icon(LucideIcons.arrow_left, color: colors.foreground.withValues(alpha: 0.7), size: 16),
            ),
            onPressed: () async {
              final prefs = await SharedPreferences.getInstance();
              await prefs.setInt('admin_dashboard_tab', 0);
              if (!context.mounted) return;
              context.read<ShiftProvider>().setAdminView(false);
              Navigator.of(context).pushReplacement(
                FadePageRoute(page: const DashboardScreen()),
              );
            },
          ),
          IconButton(
            icon: Icon(LucideIcons.settings, color: colors.foreground.withValues(alpha: 0.54), size: 20),
            onPressed: () {
              SettingsSheet.show(context);
            },
          ),
          IconButton(
            icon: Icon(LucideIcons.log_out, color: colors.foreground.withValues(alpha: 0.54), size: 20),
            onPressed: () async {
              final prefs = await SharedPreferences.getInstance();
              await prefs.setInt('admin_dashboard_tab', 0);
              if (!context.mounted) return;
              final nav = Navigator.of(context, rootNavigator: true);
              showDialog(
                context: context,
                barrierDismissible: false,
                builder: (c) => Center(child: CircularProgressIndicator(color: colors.primaryForeground)),
              );
              context.read<ShiftProvider>().resetShift();
              await AuthService.signOut();
              nav.pushAndRemoveUntil(
                MaterialPageRoute(builder: (_) => const AuthWrapper()),
                (route) => false,
              );
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
                    clipBehavior: Clip.hardEdge,
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      border: Border.all(color: colors.border),
                    ),
                    child: context.watch<SettingsProvider>().settings.appLogoUrl != null
                        ? Image.network(
                            context.watch<SettingsProvider>().settings.appLogoUrl!,
                            fit: BoxFit.cover,
                          )
                        : Image.asset(
                            'assets/dmag_logo.png',
                            fit: BoxFit.cover,
                          ),
                  ),
                  const SizedBox(width: 12),
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        context.watch<SettingsProvider>().settings.appName, 
                        style: GoogleFonts.inter(color: colors.foreground, fontSize: 16, fontWeight: FontWeight.bold)
                      ),
                      Text('Admin Console', style: GoogleFonts.inter(color: colors.foreground.withValues(alpha: 0.54), fontSize: 12)),
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
        color: isSelected ? colors.primary.withValues(alpha: 0.15) : Colors.transparent,
        borderRadius: BorderRadius.circular(8),
      ),
      child: ListTile(
        hoverColor: Colors.transparent,
        focusColor: Colors.transparent,
        splashColor: Colors.transparent,
        leading: Icon(icon, color: isSelected ? colors.primary : colors.foreground.withValues(alpha: 0.7), size: 20),
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
