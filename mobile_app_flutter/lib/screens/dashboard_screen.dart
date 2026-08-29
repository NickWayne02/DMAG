import 'dart:io';
import 'package:flutter/material.dart';
import 'package:mobile_app_flutter/utils/transliteration.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:flutter_lucide/flutter_lucide.dart';
import 'package:provider/provider.dart';
import 'package:url_launcher/url_launcher.dart';
import 'package:image_picker/image_picker.dart';
import '../theme/app_theme.dart';
import '../theme/neon_widgets.dart';
import '../providers/shift_provider.dart';
import '../providers/theme_provider.dart';
import '../services/auth_service.dart';
import '../services/storage_service.dart';
// Keep for now to avoid breaking other files if any
import 'chat_screen.dart';
import 'site_selector_sheet.dart';
import 'language_sheet.dart';
import 'settings_sheet.dart';
import '../utils/app_toast.dart';
import '../utils/fade_page_route.dart';
import '../widgets/bounce_button.dart';
import '../widgets/google_map_embed.dart';
import 'shift_history_sheet.dart';
import 'footer_sheets.dart';
import 'admin/admin_dashboard_screen.dart';
import '../providers/locale_provider.dart';
import '../providers/settings_provider.dart';
import 'admin/admin_editable_calendar_dialog.dart';
import '../main.dart';

class DashboardScreen extends StatefulWidget {
  const DashboardScreen({super.key});

  @override
  State<DashboardScreen> createState() => _DashboardScreenState();
}

class _DashboardScreenState extends State<DashboardScreen> {
  bool _isShiftLoading = false;

  void _openSiteSelector(BuildContext context, ShiftProvider shift) {
    SiteSelectorSheet.show(
      context,
      initialSiteId: shift.selectedSite?['id'],
      onSelect: (site) => shift.setSelectedSite(site),
    );
  }

  Future<void> _pickAvatar(ShiftProvider shift) async {
    final user = AuthService.currentUser;
    if (user == null) return;

    final picker = ImagePicker();
    final pickedFile = await picker.pickImage(source: ImageSource.gallery, imageQuality: 70);
    if (pickedFile == null) return;

    setState(() => _isShiftLoading = true);
    final file = File(pickedFile.path);
    final publicUrl = await StorageService.uploadAvatar(file, user.id);
    if (publicUrl != null) {
      await AuthService.updateAvatar(user.id, publicUrl);
      await shift.reloadProfile();
    }
    if (mounted) setState(() => _isShiftLoading = false);
  }

  String _formatHM(int ms) {
    final totalMin = (ms / 60000).floor();
    final h = (totalMin / 60).floor();
    final m = totalMin % 60;
    
    // Use localized suffixes if available
    String hStr = 'ч';
    String mStr = 'м';
    if (mounted) {
      final loc = context.read<LocaleProvider>();
      hStr = loc.t('time.hours_short') ?? 'ч';
      mStr = loc.t('time.minutes_short') ?? 'м';
    }
    
    return '$h$hStr ${m.toString().padLeft(2, '0')}$mStr';
  }

  String _formatHMS(int ms) {
    if (ms < 0) ms = 0;
    final total = (ms / 1000).floor();
    final h = (total / 3600).floor();
    final m = ((total % 3600) / 60).floor();
    final s = total % 60;
    return '${h.toString().padLeft(2, '0')}:${m.toString().padLeft(2, '0')}:${s.toString().padLeft(2, '0')}';
  }

  String _formatClock(DateTime ts) {
    return '${ts.hour.toString().padLeft(2, '0')}:${ts.minute.toString().padLeft(2, '0')}';
  }

  @override
  Widget build(BuildContext context) {
    final shift = context.watch<ShiftProvider>();
    final colors = Theme.of(context).appColors;
    final t = context.watch<LocaleProvider>().t;
    
    if (shift.isProfileLoading) {
      return Scaffold(
        backgroundColor: Theme.of(context).scaffoldBackgroundColor,
        body: const Center(
          child: CircularProgressIndicator(),
        ),
      );
    }
    
    final profile = shift.userProfile;
    final email = AuthService.currentUser?.email ?? 'user@dmag.com';
    final name = profile != null ? (profile['full_name'] ?? email) : email;
    final role = profile != null ? (profile['role'] ?? 'employee') : 'employee';
    
    // Check if user is admin
    final bool canSwitchToAdmin = (role == 'admin' || role == 'super_admin');

    // Status mappings
    Color statusColor;
    String statusLabel;
    
    switch (shift.status) {
      case ShiftStatus.idle:
        statusColor = Colors.white54;
        statusLabel = t('dashboard.shiftNotStarted') ?? 'Смена не начата';
        break;
      case ShiftStatus.finished:
        statusColor = Colors.white;
        statusLabel = t('dashboard.status_finished') ?? '✓ Смена завершена';
        break;
      case ShiftStatus.working:
        statusColor = const Color(0xFF22c55e); // Success green
        statusLabel = t('dashboard.status_working') ?? '🟢 Работа идет';
        break;
      case ShiftStatus.lunch:
        statusColor = const Color(0xFFf59e0b); // Warning amber
        statusLabel = t('dashboard.status_lunch') ?? '🟡 Обед';
        break;
    }

    return Scaffold(
      backgroundColor: Theme.of(context).scaffoldBackgroundColor,
      body: Stack(
        children: [
          // Background glows matching React
          Positioned(
            top: -100,
            left: -100,
            child: Container(
              width: MediaQuery.of(context).size.width,
              height: 400,
              decoration: BoxDecoration(
                shape: BoxShape.rectangle,
                gradient: RadialGradient(
                  center: const Alignment(-0.8, -0.8),
                  radius: 1.5,
                  colors: [
                    context.watch<ThemeProvider>().activeAccent.cyan.withValues(alpha: 0.18),
                    Colors.transparent,
                  ],
                  stops: const [0.0, 0.6],
                ),
              ),
            ),
          ),
          Positioned(
            top: 50,
            right: -100,
            child: Container(
              width: MediaQuery.of(context).size.width,
              height: 400,
              decoration: BoxDecoration(
                shape: BoxShape.rectangle,
                gradient: RadialGradient(
                  center: const Alignment(0.8, -0.8),
                  radius: 1.5,
                  colors: [
                    context.watch<ThemeProvider>().activeAccent.primary.withValues(alpha: 0.15),
                    Colors.transparent,
                  ],
                  stops: const [0.0, 0.55],
                ),
              ),
            ),
          ),
          SafeArea(
            bottom: false,
            child: SingleChildScrollView(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  _buildHeader(context, name, role, canSwitchToAdmin),
                  
                  Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 16.0, vertical: 12.0),
                    child: Column(
                      children: [
                        // Status Panel
                        NeonCard(
                          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                          glowColor: null, // No outer glow for subtle web look
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Row(
                                children: [
                                  Container(
                                    width: 8,
                                    height: 8,
                                    decoration: BoxDecoration(
                                      shape: BoxShape.circle,
                                      color: statusColor,
                                      boxShadow: [
                                        BoxShadow(color: statusColor.withValues(alpha: 0.5), blurRadius: 4)
                                      ]
                                    ),
                                  ),
                                  const SizedBox(width: 8),
                                  Text(
                                    t('dashboard.status') ?? 'ТЕКУЩИЙ СТАТУС',
                                    style: GoogleFonts.inter(
                                      fontSize: 10,
                                      letterSpacing: 1.5,
                                      color: colors.foreground.withValues(alpha: 0.54),
                                      fontWeight: FontWeight.bold,
                                    ),
                                  )
                                ],
                              ),
                              const SizedBox(height: 6),
                              Text(
                                statusLabel,
                                style: GoogleFonts.inter(
                                  fontSize: 16,
                                  fontWeight: FontWeight.bold,
                                  color: colors.foreground,
                                  shadows: [Shadow(color: statusColor.withValues(alpha: 0.5), blurRadius: 8)],
                                ),
                              ),
                              
                              if (shift.shiftStart != null) ...[
                                const SizedBox(height: 16),
                                Row(
                                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                  crossAxisAlignment: CrossAxisAlignment.end,
                                  children: [
                                    Column(
                                      crossAxisAlignment: CrossAxisAlignment.start,
                                      children: [
                                        Text(t('dashboard.shiftStart') ?? 'НАЧАЛО СМЕНЫ', style: GoogleFonts.inter(fontSize: 10, color: colors.foreground.withValues(alpha: 0.54), letterSpacing: 1.5)),
                                        Text(_formatClock(shift.shiftStart!), style: GoogleFonts.inter(fontSize: 20, fontWeight: FontWeight.bold, color: colors.foreground)),
                                      ],
                                    ),
                                    Column(
                                      crossAxisAlignment: CrossAxisAlignment.end,
                                      children: [
                                        Text(t('dashboard.worked') ?? 'ОТРАБОТАНО', style: GoogleFonts.inter(fontSize: 10, color: colors.foreground.withValues(alpha: 0.54), letterSpacing: 1.5)),
                                        Text(
                                          _formatHMS(shift.workMs),
                                          style: GoogleFonts.inter(fontSize: 24, fontWeight: FontWeight.w900, color: colors.foreground, shadows: [Shadow(color: statusColor.withValues(alpha: 0.5), blurRadius: 8)]),
                                        ),
                                      ],
                                    ),
                                  ],
                                ),
                                const SizedBox(height: 16),
                                Row(
                                  children: [
                                    Expanded(child: MetricWidget(label: t('dashboard.work') ?? 'Работа', value: _formatHM(shift.workMs), color: const Color(0xFF84cc16))), // Lime
                                    const SizedBox(width: 8),
                                    Expanded(child: MetricWidget(label: t('dashboard.lunch') ?? 'Обед', value: _formatHM(shift.lunchMs), color: const Color(0xFFf59e0b))), // Amber
                                    const SizedBox(width: 8),
                                    Expanded(child: MetricWidget(label: t('dashboard.total') ?? 'Итого', value: _formatHM(shift.totalMs), color: const Color(0xFF06b6d4))), // Cyan
                                  ],
                                )
                              ]
                            ],
                          ),
                        ),

                        const SizedBox(height: 16),

                        // Action Buttons Grid
                        Row(
                          children: [
                            Expanded(
                              child: _buildStatusButton(
                                context: context,
                                tone: 'lime',
                                title: t('dashboard.startWork') ?? 'НАЧАТЬ РАБОТУ',
                                icon: LucideIcons.rocket,
                                isActive: shift.status == ShiftStatus.idle || shift.status == ShiftStatus.finished,
                                isSolid: shift.status == ShiftStatus.idle || shift.status == ShiftStatus.finished,
                                onTap: () async {
                                  final allowed = await _showGpsDialog(context);
                                  try {
                                    await shift.startShift(forceExact: allowed);
                                    if (mounted) AppToast.showSuccess(context, 'Смена начата');
                                  } catch (e) {
                                    if (mounted) {
                                      AppToast.showError(context, e.toString().replaceAll('Exception: ', ''));
                                    }
                                  }
                                },
                              ),
                            ),
                            const SizedBox(width: 12),
                            Expanded(
                              child: _buildStatusButton(
                                context: context,
                                tone: 'amber',
                                title: t('dashboard.startPause') ?? 'НАЧАТЬ ПАУЗУ',
                                icon: LucideIcons.pause,
                                isActive: shift.status == ShiftStatus.working,
                                isSolid: shift.status == ShiftStatus.working,
                                onTap: () async {
                                  await shift.startLunch();
                                  if (mounted) AppToast.showWarning(context, 'Перерыв начат');
                                },
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 12),
                        Row(
                          children: [
                            Expanded(
                              child: _buildStatusButton(
                                context: context,
                                tone: 'cyan',
                                title: t('dashboard.endPause') ?? 'ЗАКОНЧИТЬ ПАУЗУ',
                                icon: LucideIcons.play,
                                isActive: shift.status == ShiftStatus.lunch,
                                isSolid: shift.status == ShiftStatus.lunch,
                                onTap: () async {
                                  await shift.endLunch();
                                  if (mounted) AppToast.showSuccess(context, 'Перерыв завершен');
                                },
                              ),
                            ),
                            const SizedBox(width: 12),
                            Expanded(
                              child: _buildStatusButton(
                                context: context,
                                tone: 'red',
                                title: t('dashboard.endShift') ?? 'ЗАКОНЧИТЬ СМЕНУ',
                                icon: LucideIcons.power,
                                isActive: shift.status == ShiftStatus.working || shift.status == ShiftStatus.lunch,
                                isSolid: shift.status == ShiftStatus.working || shift.status == ShiftStatus.lunch,
                                onTap: () async {
                                  await _handleEndShift(context, shift);
                                  if (mounted && shift.status == ShiftStatus.finished) {
                                    AppToast.showInfo(context, t('dashboard.shiftFinished') ?? 'Смена завершена');
                                  }
                                },
                              ),
                            ),
                          ],
                        ),

                        const SizedBox(height: 16),

                        // Site Selector
                        BounceButton(
                          onTap: () => _openSiteSelector(context, shift),
                          child: NeonCard(
                            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
                            child: Row(
                              children: [
                                Icon(LucideIcons.navigation, color: colors.foreground.withValues(alpha: 0.7), size: 20),
                                const SizedBox(width: 16),
                                Expanded(
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      Text(t('dashboard.site') ?? 'Объект', style: GoogleFonts.inter(color: colors.foreground, fontSize: 14, fontWeight: FontWeight.bold)),
                                      Text(
                                        shift.selectedSite != null 
                                            ? (shift.selectedSite!['address'] ?? shift.selectedSite!['name'])
                                            : context.watch<LocaleProvider>().t('dashboard.site_not_selected') ?? 'Не выбран — нажмите, чтобы выбрать',
                                        style: GoogleFonts.inter(color: colors.foreground.withValues(alpha: 0.54), fontSize: 11),
                                        maxLines: 1,
                                        overflow: TextOverflow.ellipsis,
                                      ),
                                    ],
                                  ),
                                ),
                                const Icon(LucideIcons.chevron_right, color: Colors.white30, size: 20),
                              ],
                            ),
                          ),
                        ),

                        if (shift.selectedSite != null) ...[
                          const SizedBox(height: 12),
                          _buildMapCard(context, shift),
                        ],

                        if (shift.status == ShiftStatus.finished) ...[
                          const SizedBox(height: 12),
                          _buildFinishedShiftCard(context, shift),
                        ],

                        const SizedBox(height: 12),

                        // Chat Tile
                        BounceButton(
                          onTap: () {
                            Navigator.of(context).push(FadePageRoute(page: const ChatScreen()));
                          },
                          child: NeonCard(
                            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
                            child: Row(
                              children: [
                                Icon(LucideIcons.message_square, color: colors.foreground.withValues(alpha: 0.7), size: 20),
                                const SizedBox(width: 16),
                                Expanded(
                                  child: Text(t('dashboard.chat') ?? 'Чат', style: GoogleFonts.inter(color: colors.foreground, fontSize: 14, fontWeight: FontWeight.bold)),
                                ),
                                Icon(LucideIcons.chevron_right, color: colors.foreground.withValues(alpha: 0.3), size: 20),
                              ],
                            ),
                          ),
                        ),



                        const SizedBox(height: 48),
                        
                        // Footer
                        RichText(
                          textAlign: TextAlign.center,
                          text: TextSpan(
                            style: GoogleFonts.inter(color: colors.foreground.withValues(alpha: 0.3), fontSize: 12),
                            children: [
                              TextSpan(text: context.watch<SettingsProvider>().settings.appName, style: TextStyle(fontWeight: FontWeight.bold, color: colors.foreground)),
                              TextSpan(text: ' © 2026 ${context.watch<LocaleProvider>().t('footer.copyright') ?? 'Все права защищены'}'),
                            ],
                          ),
                        ),
                        const SizedBox(height: 12),
                        BounceButton(
                          onTap: () => FooterSheets.showPrivacyPolicy(context),
                          child: Padding(padding: const EdgeInsets.all(4), child: Text(context.watch<LocaleProvider>().t('footer.privacy') ?? 'Политика конфиденциальности', style: GoogleFonts.inter(color: colors.foreground.withValues(alpha: 0.7), fontSize: 12))),
                        ),
                        BounceButton(
                          onTap: () => FooterSheets.showTermsOfService(context),
                          child: Padding(padding: const EdgeInsets.all(4), child: Text(context.watch<LocaleProvider>().t('footer.terms') ?? 'Условия использования', style: GoogleFonts.inter(color: colors.foreground.withValues(alpha: 0.7), fontSize: 12))),
                        ),
                        BounceButton(
                          onTap: () => FooterSheets.showSupport(context),
                          child: Padding(padding: const EdgeInsets.all(4), child: Text(context.watch<LocaleProvider>().t('footer.support') ?? 'Служба поддержки', style: GoogleFonts.inter(color: colors.foreground.withValues(alpha: 0.7), fontSize: 12))),
                        ),
                        const SizedBox(height: 16),
                        Text('${context.watch<LocaleProvider>().t('footer.version') ?? 'Версия '}2.0.1', style: GoogleFonts.inter(color: colors.foreground.withValues(alpha: 0.24), fontSize: 10)),
                        const SizedBox(height: 32),
                      ],
                    ),
                  )
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildHeader(BuildContext context, String name, String role, bool canSwitchToAdmin) {
    String getRoleLabel() {
      switch(role) {
        case 'super_admin': return context.watch<LocaleProvider>().t('role.super_admin') ?? 'Супер-админ';
        case 'admin': return context.watch<LocaleProvider>().t('role.admin') ?? 'Администратор';
        case 'brigadier': return context.watch<LocaleProvider>().t('role.brigadier') ?? 'Бригадир';
        default: return context.watch<LocaleProvider>().t('role.employee') ?? 'Сотрудник';
      }
    }

    final provider = context.watch<ThemeProvider>();
    final radius = provider.borderRadius;
    final colors = Theme.of(context).appColors;
    
    return Container(
      padding: const EdgeInsets.only(bottom: 24, left: 20, right: 20, top: 16),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [
            provider.activeAccent.violet,
            provider.activeAccent.primary,
            provider.activeAccent.cyan,
          ],
          stops: const [0.0, 0.55, 1.0],
        ),
        boxShadow: [
          BoxShadow(
            color: provider.activeAccent.violet.withValues(alpha: 0.55),
            blurRadius: 30,
            spreadRadius: -10,
            offset: const Offset(0, 20),
          )
        ],
        borderRadius: BorderRadius.only(bottomLeft: Radius.circular(radius * 2), bottomRight: Radius.circular(radius * 2)),
      ),
      child: Column(
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.end,
            children: [
              BounceButton(
                onTap: () => LanguageSheet.show(context),
                child: Row(
                  children: [
                    Icon(LucideIcons.globe, color: colors.foreground.withValues(alpha: 0.54), size: 14),
                    const SizedBox(width: 4),
                    Text(context.watch<LocaleProvider>().currentLang.toUpperCase(), style: GoogleFonts.inter(color: colors.foreground.withValues(alpha: 0.54), fontSize: 12, fontWeight: FontWeight.bold)),
                  ],
                ),
              ),
              const SizedBox(width: 16),
              BounceButton(
                onTap: () => SettingsSheet.show(context),
                child: Icon(LucideIcons.settings, color: colors.foreground.withValues(alpha: 0.54), size: 16),
              ),
              const SizedBox(width: 16),
              BounceButton(
                onTap: () async {
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
                child: Icon(LucideIcons.log_out, color: colors.foreground.withValues(alpha: 0.54), size: 18),
              ),
            ],
          ),
          const SizedBox(height: 16),
          Row(
            children: [
              BounceButton(
                onTap: () => _pickAvatar(context.read<ShiftProvider>()),
                child: Container(
                  width: 56,
                  height: 56,
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    color: colors.foreground.withValues(alpha: 0.12),
                    border: Border.all(color: colors.foreground.withValues(alpha: 0.3)),
                    image: context.read<ShiftProvider>().userProfile?['avatar_url'] != null
                        ? DecorationImage(
                            image: NetworkImage(context.read<ShiftProvider>().userProfile!['avatar_url']),
                            fit: BoxFit.cover,
                          )
                        : null,
                  ),
                  child: context.read<ShiftProvider>().userProfile?['avatar_url'] == null
                      ? Center(
                          child: Text(
                            name.substring(0, 1).toUpperCase(),
                            style: GoogleFonts.inter(color: colors.foreground, fontSize: 20, fontWeight: FontWeight.bold),
                          ),
                        )
                      : null,
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      getRoleLabel().toUpperCase(),
                      style: GoogleFonts.inter(
                        fontSize: 10,
                        fontWeight: FontWeight.bold,
                        color: colors.foreground.withValues(alpha: 0.54),
                        letterSpacing: 2.0,
                      ),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      TransliterationService.transliterateIfNeeded(name, context.watch<LocaleProvider>().currentLang),
                      style: GoogleFonts.inter(
                        fontSize: 20,
                        fontWeight: FontWeight.bold,
                        color: colors.foreground,
                      ),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                  ],
                ),
              ),
              if (canSwitchToAdmin) ...[
                GestureDetector(
                  onTap: () {
                    context.read<ShiftProvider>().setAdminView(true);
                    Navigator.of(context).pushReplacement(
                      FadePageRoute(page: const AdminDashboardScreen()),
                    );
                  },
                  child: Icon(LucideIcons.shield_check, color: colors.foreground.withValues(alpha: 0.7), size: 20),
                ),
                const SizedBox(width: 16),
              ],
              GestureDetector(
                onTap: () {
                  if (canSwitchToAdmin && AuthService.currentUser != null) {
                    AdminEditableCalendarDialog.show(
                      context,
                      employeeId: AuthService.currentUser!.id,
                      employeeName: name,
                    );
                  } else {
                    ShiftHistorySheet.show(context);
                  }
                },
                child: Icon(LucideIcons.calendar, color: colors.foreground.withValues(alpha: 0.7), size: 20),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Color _getToneColor(String tone, ThemeProvider provider) {
    switch (tone) {
      case 'lime':
        return const Color(0xFF22c55e);
      case 'amber':
        return const Color(0xFFf59e0b);
      case 'cyan':
        return provider.customAccent ?? provider.activeAccent.cyan;
      case 'red':
        return const Color(0xFFef4444);
      default:
        return Colors.white;
    }
  }

  Widget _buildStatusButton({
    required BuildContext context,
    required String tone,
    required IconData icon,
    required String title,
    required bool isActive,
    required bool isSolid,
    required Future<void> Function() onTap,
  }) {
    final provider = context.watch<ThemeProvider>();
    final color = _getToneColor(tone, provider);
    final style = provider.buttonStyle;
    final actualIsSolid = isSolid && style == ButtonStyleType.filled;
    final radius = provider.borderRadius;

    return BounceButton(
      onTap: () async {
        if (!isActive || _isShiftLoading) return;
        setState(() => _isShiftLoading = true);
        await onTap();
        if (mounted) setState(() => _isShiftLoading = false);
      },
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 200),
        height: 100,
        decoration: BoxDecoration(
          color: actualIsSolid ? color : Theme.of(context).appColors.card,
          borderRadius: BorderRadius.circular(radius),
          border: actualIsSolid ? null : Border.all(color: isActive ? color : Theme.of(context).appColors.border),
          boxShadow: actualIsSolid ? [BoxShadow(color: color.withValues(alpha: 0.3), blurRadius: 10, spreadRadius: 1)] : [],
        ),
        padding: const EdgeInsets.all(12),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Icon(icon, color: actualIsSolid ? Theme.of(context).appColors.background : (isActive ? color : Theme.of(context).appColors.foreground.withValues(alpha: 0.24)), size: 20),
            Text(
              title,
              style: GoogleFonts.inter(
                color: actualIsSolid ? Theme.of(context).appColors.background : (isActive ? color : Theme.of(context).appColors.foreground.withValues(alpha: 0.24)),
                fontSize: 12,
                fontWeight: FontWeight.bold,
                letterSpacing: 0.5,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildFinishedShiftCard(BuildContext context, ShiftProvider shift) {
    final t = context.watch<LocaleProvider>().t;
    final provider = context.watch<ThemeProvider>();
    final cyan = provider.activeAccent.cyan;
    
    return NeonCard(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      glowColor: cyan,
      child: Row(
        children: [
          Icon(LucideIcons.check, color: cyan, size: 20),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  t('dashboard.shiftFinished') ?? 'Смена завершена',
                  style: GoogleFonts.inter(
                    color: Theme.of(context).appColors.foreground,
                    fontSize: 14,
                    fontWeight: FontWeight.bold,
                  ),
                ),
                Text(
                  '${context.watch<LocaleProvider>().t('dashboard.commercial_hours') ?? 'Коммерческие часы: '}${_formatHM(shift.workMs)}',
                  style: GoogleFonts.inter(
                    color: Theme.of(context).appColors.muted,
                    fontSize: 12,
                  ),
                ),
              ],
            ),
          ),
          TextButton(
            style: TextButton.styleFrom(
              backgroundColor: cyan.withValues(alpha: 0.15),
              side: BorderSide(color: cyan),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
              minimumSize: Size.zero,
            ),
            onPressed: () => shift.resetShift(),
            child: Text(t('dashboard.new_shift') ?? 'Новая', style: GoogleFonts.inter(color: Theme.of(context).appColors.foreground, fontSize: 12, fontWeight: FontWeight.bold)),
          ),
        ],
      ),
    );
  }

  Widget _buildMapCard(BuildContext context, ShiftProvider shift) {
    final colors = Theme.of(context).appColors;
    final site = shift.selectedSite!;
    final address = site['address'] as String? ?? site['name'] as String;
    
    String displayName = address;
    if (displayName.startsWith('GPS: ')) {
      displayName = shift.userProfile?['start_city'] ?? site['name'] as String;
    }

    if (address.startsWith('GPS: ')) {
      // coordinates can be parsed here if needed
    }

    return NeonCard(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            children: [
              Icon(LucideIcons.map_pin, color: colors.foreground.withValues(alpha: 0.7), size: 24),
              const SizedBox(width: 16),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(context.watch<LocaleProvider>().t('dashboard.location') ?? 'Местоположение', style: GoogleFonts.inter(color: colors.foreground.withValues(alpha: 0.54), fontSize: 12, fontWeight: FontWeight.bold)),
                    const SizedBox(height: 4),
                    Text(
                      displayName,
                      style: GoogleFonts.inter(color: colors.foreground, fontSize: 16, fontWeight: FontWeight.w600),
                    ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),
          Container(
            height: 200,
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: colors.border),
            ),
            child: ClipRRect(
              borderRadius: BorderRadius.circular(12),
              child: GoogleMapEmbed(
                query: address.startsWith('GPS: ') 
                  ? address.replaceFirst('GPS: ', '').trim() 
                  : address.isNotEmpty ? address : site['name'] as String
              ),
            ),
          ),

        ],
      ),
    );
  }

  Future<bool> _showGpsDialog(BuildContext context) async {
    final provider = context.read<ThemeProvider>();
    final primary = Theme.of(context).primaryColor;
    final colors = Theme.of(context).appColors;
    
    return await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        backgroundColor: Theme.of(context).cardColor,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(provider.borderRadius),
          side: BorderSide(color: colors.border),
        ),
        titlePadding: const EdgeInsets.only(top: 24, left: 24, right: 24),
        contentPadding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
        actionsPadding: const EdgeInsets.all(24),
        title: Column(
          children: [
            Container(
              width: 48,
              height: 48,
              decoration: BoxDecoration(
                color: primary.withValues(alpha: 0.1),
                borderRadius: BorderRadius.circular(16),
              ),
              child: Icon(LucideIcons.navigation, color: primary),
            ),
            const SizedBox(height: 16),
            Text(
              'Зафиксировать GPS-координаты?',
              textAlign: TextAlign.center,
              style: GoogleFonts.inter(
                color: colors.foreground,
                fontSize: 18,
                fontWeight: FontWeight.bold,
              ),
            ),
          ],
        ),
        content: Text(
          'Геопозиция запрашивается только в момент действия. Передача добровольна — постоянный трекинг не ведётся.',
          textAlign: TextAlign.center,
          style: GoogleFonts.inter(
            color: colors.foreground.withValues(alpha: 0.7),
            fontSize: 14,
          ),
        ),
        actions: [
          Row(
            children: [
              Expanded(
                child: TextButton(
                  style: TextButton.styleFrom(
                    padding: const EdgeInsets.symmetric(vertical: 16),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(provider.borderRadius),
                      side: BorderSide(color: colors.border),
                    ),
                  ),
                  onPressed: () => Navigator.of(context).pop(false),
                  child: Text('Пропустить', style: GoogleFonts.inter(color: colors.foreground, fontWeight: FontWeight.bold)),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: TextButton(
                  style: TextButton.styleFrom(
                    backgroundColor: primary,
                    padding: const EdgeInsets.symmetric(vertical: 16),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(provider.borderRadius),
                    ),
                  ),
                  onPressed: () => Navigator.of(context).pop(true),
                  child: Text('Разрешить', style: GoogleFonts.inter(color: colors.foreground, fontWeight: FontWeight.bold)),
                ),
              ),
            ],
          )
        ],
      ),
    ) ?? false;
  }

  Future<void> _handleEndShift(BuildContext context, ShiftProvider shift) async {
    final allowed = await _showGpsDialog(context);
    if (allowed) {
      // TODO: Actually fetch GPS coords
    }

    const eightHoursMs = 8 * 60 * 60 * 1000;
    
    if (shift.status == ShiftStatus.working && 
        shift.lunchMs == 0 && 
        shift.totalMs > eightHoursMs && 
        !shift.autoLunchApplied) {
      
      final provider = context.read<ThemeProvider>();
      final colors = Theme.of(context).appColors;
      const warningColor = Color(0xFFf59e0b);

      final shouldApply = await showDialog<bool>(
        context: context,
        builder: (context) => AlertDialog(
          backgroundColor: Theme.of(context).cardColor,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(provider.borderRadius),
            side: BorderSide(color: colors.border),
          ),
          titlePadding: const EdgeInsets.only(top: 24, left: 24, right: 24),
          contentPadding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
          actionsPadding: const EdgeInsets.all(24),
          title: Column(
            children: [
              Container(
                width: 48,
                height: 48,
                decoration: BoxDecoration(
                  color: warningColor.withValues(alpha: 0.15),
                  borderRadius: BorderRadius.circular(16),
                ),
                child: const Icon(LucideIcons.pause, color: warningColor),
              ),
              const SizedBox(height: 16),
              Text(
                'Смена больше 8 часов',
                textAlign: TextAlign.center,
                style: GoogleFonts.inter(
                  color: colors.foreground,
                  fontSize: 18,
                  fontWeight: FontWeight.bold,
                ),
              ),
            ],
          ),
          content: Text(
            'Удержать 30 минут за обед?',
            textAlign: TextAlign.center,
            style: GoogleFonts.inter(
              color: colors.foreground.withValues(alpha: 0.7),
              fontSize: 14,
            ),
          ),
          actions: [
            Row(
              children: [
                Expanded(
                  child: TextButton(
                    style: TextButton.styleFrom(
                      padding: const EdgeInsets.symmetric(vertical: 16),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(provider.borderRadius),
                        side: BorderSide(color: colors.border),
                      ),
                    ),
                    onPressed: () => Navigator.of(context).pop(false),
                    child: Text('Нет', style: GoogleFonts.inter(color: colors.foreground, fontWeight: FontWeight.bold)),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: TextButton(
                    style: TextButton.styleFrom(
                      backgroundColor: warningColor,
                      padding: const EdgeInsets.symmetric(vertical: 16),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(provider.borderRadius),
                      ),
                    ),
                    onPressed: () => Navigator.of(context).pop(true),
                    child: Text('Удержать', style: GoogleFonts.inter(color: colors.foreground, fontWeight: FontWeight.bold)),
                  ),
                ),
              ],
            )
          ],
        ),
      );
      
      if (shouldApply == null) return;
      
      if (shouldApply) {
        shift.applyAutoLunch();
      } else {
        shift.keepNoLunch();
      }
    }
    
    await shift.endShift();
  }
}

