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

  final List<String> _tabTitles = [
    'Дашборд',
    'Календарь',
    'Персонал',
    'Объекты',
    'Фотоотчёты',
    'Активные сеансы',
    'Управление пользователями',
    'Чат',
  ];

  void _onMenuTap(int index) {
    setState(() {
      _currentIndex = index;
    });
    Navigator.of(context).pop(); // Close drawer
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.black, // True black matching React layout
      appBar: AppBar(
        backgroundColor: Colors.black, // Dark appbar matching react layout
        elevation: 0,
        title: Text(
          _tabTitles[_currentIndex],
          style: GoogleFonts.inter(fontSize: 18, fontWeight: FontWeight.bold, color: Colors.white),
        ),
        actions: [
          IconButton(
            icon: const Icon(LucideIcons.arrow_left, color: Colors.white54, size: 20),
            tooltip: 'Вернуться в режим сотрудника',
            onPressed: () {
              Navigator.of(context).pushReplacement(
                MaterialPageRoute(builder: (_) => const DashboardScreen()),
              );
            },
          ),
          IconButton(
            icon: const Icon(LucideIcons.settings, color: Colors.white54, size: 20),
            onPressed: () {
              SettingsSheet.show(context);
            },
          ),
          IconButton(
            icon: const Icon(LucideIcons.log_out, color: Colors.white54, size: 20),
            onPressed: () async {
              showDialog(
                context: context,
                barrierDismissible: false,
                builder: (c) => const Center(child: CircularProgressIndicator(color: Colors.white)),
              );
              context.read<ShiftProvider>().resetShift();
              await AuthService.signOut();
              if (context.mounted) Navigator.pop(context);
            },
          ),
          const SizedBox(width: 8),
        ],
        iconTheme: const IconThemeData(color: Colors.white),
      ),
      drawer: Drawer(
        backgroundColor: const Color(0xFF2E3846), // DMAG Sidebar Slate background
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
                      border: Border.all(color: Colors.white12),
                    ),
                    child: const Center(
                      child: Text('D', style: TextStyle(color: Colors.white, fontSize: 20, fontWeight: FontWeight.bold)),
                    ), // Using placeholder for DMAG logo
                  ),
                  const SizedBox(width: 12),
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text('DMAG', style: GoogleFonts.inter(color: Colors.white, fontSize: 16, fontWeight: FontWeight.bold)),
                      Text('Admin Console', style: GoogleFonts.inter(color: Colors.white54, fontSize: 12)),
                    ],
                  ),
                ],
              ),
            ),
            const Divider(color: Colors.white12, height: 1),
            const SizedBox(height: 16),
            // Drawer Items
            Expanded(
              child: ListView(
                padding: EdgeInsets.zero,
                children: [
                  _buildDrawerItem(0, LucideIcons.activity, 'Дашборд'),
                  _buildDrawerItem(1, LucideIcons.calendar, 'Календарь'),
                  _buildDrawerItem(2, LucideIcons.users, 'Персонал'),
                  _buildDrawerItem(3, LucideIcons.building_2, 'Объекты'),
                  _buildDrawerItem(4, LucideIcons.camera, 'Фотоотчёты'),
                  _buildDrawerItem(5, LucideIcons.shield_check, 'Активные сеансы'),
                  _buildDrawerItem(6, LucideIcons.users, 'Управление пользователями'),
                  _buildDrawerItem(7, LucideIcons.message_circle, 'Чат'),
                ],
              ),
            ),
            const Divider(color: Colors.white12, height: 1),
            Container(
              padding: const EdgeInsets.all(24),
              alignment: Alignment.centerLeft,
              child: Text('DMAG · MVP v1.0', style: GoogleFonts.inter(color: Colors.white54, fontSize: 12)),
            )
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

  Widget _buildDrawerItem(int index, IconData icon, String title) {
    final isSelected = _currentIndex == index;
    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 12, vertical: 2),
      decoration: BoxDecoration(
        color: isSelected ? Colors.white.withOpacity(0.1) : Colors.transparent,
        borderRadius: BorderRadius.circular(8),
      ),
      child: ListTile(
        hoverColor: Colors.transparent,
        focusColor: Colors.transparent,
        splashColor: Colors.transparent,
        leading: Icon(icon, color: isSelected ? Colors.white : Colors.white54, size: 20),
        title: Text(
          title,
          style: GoogleFonts.inter(
            color: isSelected ? Colors.white : Colors.white70,
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
