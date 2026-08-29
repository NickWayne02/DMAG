import 'package:mobile_app_flutter/utils/transliteration.dart';
import 'package:provider/provider.dart';
import 'package:mobile_app_flutter/providers/locale_provider.dart';
import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:flutter_lucide/flutter_lucide.dart';
import '../dialogs/create_user_dialog.dart';
import '../dialogs/change_credentials_dialog.dart';
import '../../../theme/app_theme.dart';

import 'package:supabase_flutter/supabase_flutter.dart';

class UsersTab extends StatefulWidget {
  const UsersTab({super.key});

  @override
  State<UsersTab> createState() => _UsersTabState();
}

class _UsersTabState extends State<UsersTab> {
  String _searchQuery = '';
  List<Map<String, dynamic>> _users = [];
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _fetchUsers();
  }

  Future<void> _fetchUsers() async {
    try {
      final res = await Supabase.instance.client.from('profiles').select();
      final rolesRes = await Supabase.instance.client.from('user_roles').select();
      
      final shiftsRes = await Supabase.instance.client
          .from('shifts')
          .select('user_id, started_at, status')
          .order('started_at', ascending: false);

      final latestShifts = <String, Map<String, dynamic>>{};
      for (var s in shiftsRes) {
        final uid = s['user_id'] as String;
        if (!latestShifts.containsKey(uid) && s['started_at'] != null) {
          latestShifts[uid] = {
            'started_at': DateTime.parse(s['started_at'] as String),
            'status': s['status'] as String?,
          };
        }
      }

      final roleMap = <String, String>{};
      final prio = {'super_admin': 4, 'admin': 3, 'brigadier': 2, 'employee': 1};
      for (var r in rolesRes) {
        final uid = r['user_id'] as String;
        final cur = roleMap[uid] ?? 'employee';
        final newRole = r['role'] as String;
        if ((prio[newRole] ?? 1) > (prio[cur] ?? 1)) {
          roleMap[uid] = newRole;
        }
      }

      if (mounted) {
        setState(() {
          _users = List<Map<String, dynamic>>.from(res).map((u) {
            u['role'] = roleMap[u['id']] ?? 'employee';
            final shiftData = latestShifts[u['id']];
            if (shiftData != null) {
              u['last_shift_start'] = shiftData['started_at'];
              u['is_online'] = shiftData['status'] == 'working' || shiftData['status'] == 'lunch';
            } else {
              u['is_online'] = false;
            }
            return u;
          }).toList();
          _isLoading = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() => _isLoading = false);
      }
    }
  }

  Widget _buildUserCard({
    required String name,
    required String role,
    required String initials,
    required String userId,
    required String userEmail,
    String? avatarUrl,
    required String lastLogin,
    bool isOnline = false,
    bool isSelf = false,
  }) {
    return Container(
      margin: const EdgeInsets.only(bottom: 16),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Theme.of(context).cardColor,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: Theme.of(context).appColors.foreground.withValues(alpha: 0.12)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Container(
                width: 48,
                height: 48,
                decoration: BoxDecoration(
                  color: Theme.of(context).appColors.foreground.withValues(alpha: 0.12),
                  shape: BoxShape.circle,
                  image: avatarUrl != null
                      ? DecorationImage(image: NetworkImage(avatarUrl), fit: BoxFit.cover)
                      : null,
                ),
                child: avatarUrl == null
                    ? Center(
                        child: Text(
                          initials,
                          style: GoogleFonts.inter(color: Theme.of(context).appColors.foreground, fontSize: 16, fontWeight: FontWeight.bold),
                        ),
                      )
                    : null,
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Expanded(
                          child: Text(
                            name,
                            style: GoogleFonts.inter(color: Theme.of(context).appColors.foreground, fontSize: 16, fontWeight: FontWeight.bold),
                            overflow: TextOverflow.ellipsis,
                          ),
                        ),
                        const SizedBox(width: 8),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                          decoration: BoxDecoration(
                            color: const Color(0xFF064e3b).withValues(alpha: 0.5),
                            borderRadius: BorderRadius.circular(12),
                          ),
                          child: Text(
                            context.watch<LocaleProvider>().t('users.active') ?? 'Активен',
                            style: GoogleFonts.inter(
                              color: const Color(0xFF10b981),
                              fontSize: 11,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 4),
                    Text(
                      role,
                      style: GoogleFonts.inter(color: const Color(0xFF64748b), fontSize: 14),
                    ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),
          Row(
            children: [
              Text(
                context.watch<LocaleProvider>().t('users.last_login') ?? 'Последний вход: ',
                style: GoogleFonts.inter(color: Theme.of(context).appColors.foreground.withValues(alpha: 0.7), fontSize: 13),
              ),
              Text(
                lastLogin,
                style: GoogleFonts.inter(
                  color: isOnline ? const Color(0xFF06b6d4) : Theme.of(context).appColors.foreground.withValues(alpha: 0.54), 
                  fontSize: 13,
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),
          Divider(color: Theme.of(context).appColors.foreground.withValues(alpha: 0.12), height: 1),
          const SizedBox(height: 16),
          
          // Action Buttons
          if (role != (context.watch<LocaleProvider>().t('role.super_admin') ?? 'Супер-админ') || isSelf) // If it's super-admin but not self, maybe show it? In the screenshot it's shown for Evgeny Kostin (dimmed) and Ruslan (normal). Wait, for Ruslan (Супер-админ) the buttons are normal! For Evgeny Kostin (Супер-админ) they are dimmed. So they are shown for all, but dimmed if isSelf.
            SizedBox(
              width: double.infinity,
              child: OutlinedButton(
                style: OutlinedButton.styleFrom(
                  side: BorderSide(color: isSelf ? Theme.of(context).appColors.foreground.withValues(alpha: 0.05) : Theme.of(context).appColors.foreground.withValues(alpha: 0.12)),
                  padding: const EdgeInsets.symmetric(vertical: 12),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                  foregroundColor: isSelf ? Theme.of(context).appColors.foreground.withValues(alpha: 0.30) : Theme.of(context).appColors.foreground,
                ),
                onPressed: isSelf ? null : () {},
                child: Text(context.watch<LocaleProvider>().t('users.make_admin') ?? 'Сделать Админ', style: GoogleFonts.inter(fontSize: 13, fontWeight: FontWeight.bold)),
              ),
            ),
          const SizedBox(height: 8),
          Row(
            children: [
              Expanded(
                child: OutlinedButton.icon(
                  style: OutlinedButton.styleFrom(
                    side: BorderSide(color: isSelf ? Theme.of(context).appColors.foreground.withValues(alpha: 0.05) : Theme.of(context).appColors.foreground.withValues(alpha: 0.12)),
                    padding: const EdgeInsets.symmetric(vertical: 12),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                    foregroundColor: isSelf ? Theme.of(context).appColors.foreground.withValues(alpha: 0.30) : Theme.of(context).appColors.foreground,
                  ),
                  icon: const Icon(LucideIcons.key, size: 14),
                  label: Text(context.watch<LocaleProvider>().t('users.login_pass') ?? 'Логин/пароль', style: GoogleFonts.inter(fontSize: 13, fontWeight: FontWeight.bold)),
                  onPressed: isSelf ? null : () {
                    ChangeCredentialsDialog.show(
                      context,
                      userId: userId,
                      userName: name,
                      userEmail: userEmail,
                    );
                  },
                ),
              ),
              const SizedBox(width: 8),
              OutlinedButton(
                style: OutlinedButton.styleFrom(
                  backgroundColor: isSelf ? const Color(0xFFef4444).withValues(alpha: 0.2) : const Color(0xFFef4444),
                  side: BorderSide.none,
                  padding: const EdgeInsets.all(12),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                  minimumSize: const Size(44, 44),
                  foregroundColor: isSelf ? Theme.of(context).appColors.foreground.withValues(alpha: 0.30) : Theme.of(context).appColors.foreground,
                ),
                onPressed: isSelf ? null : () {},
                child: const Icon(LucideIcons.trash_2, size: 16),
              ),
            ],
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.all(16.0),
      child: Container(
        decoration: BoxDecoration(
          color: Theme.of(context).cardColor,
          borderRadius: BorderRadius.circular(20),
          border: Border.all(color: Theme.of(context).appColors.foreground.withValues(alpha: 0.12)),
        ),
        child: Column(
          children: [
            Padding(
              padding: const EdgeInsets.all(24.0),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    context.watch<LocaleProvider>().t('users.title') ?? 'Список пользователей',
                    style: GoogleFonts.inter(
                      color: Theme.of(context).appColors.foreground,
                      fontSize: 16,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    context.watch<LocaleProvider>().t('users.subtitle') ?? 'Создание, удаление, смена ролей и логина/пароля · только для супер-админа',
                    style: GoogleFonts.inter(
                      color: const Color(0xFF64748b),
                      fontSize: 13,
                    ),
                  ),
                  const SizedBox(height: 24),
                  SizedBox(
                    width: double.infinity,
                    child: ElevatedButton.icon(
                      style: ElevatedButton.styleFrom(
                        backgroundColor: const Color(0xFF334155), // Slate 700
                        foregroundColor: Colors.black, // Black text like other buttons, wait the screenshot shows white/dark text? Actually in screenshot text is dark (almost black) on Slate. No, wait. "Создать" has dark text in the screenshot. Let me check the screenshot carefully. The text is dark gray/black.
                        padding: const EdgeInsets.symmetric(vertical: 16),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(24)), // highly rounded
                        elevation: 0,
                      ),
                      icon: const Icon(LucideIcons.plus, size: 16, color: Colors.black),
                      label: Text(context.watch<LocaleProvider>().t('users.create') ?? 'Создать', style: GoogleFonts.inter(color: Colors.black, fontSize: 14, fontWeight: FontWeight.bold)),
                      onPressed: () {
                        CreateUserDialog.show(context);
                      },
                    ),
                  ),
                  const SizedBox(height: 16),
                  TextField(
                    onChanged: (val) => setState(() => _searchQuery = val),
                    style: GoogleFonts.inter(color: Theme.of(context).appColors.foreground, fontSize: 14),
                    decoration: InputDecoration(
                      hintText: context.watch<LocaleProvider>().t('users.search') ?? 'Поиск пользователя...',
                      hintStyle: GoogleFonts.inter(color: Theme.of(context).appColors.foreground.withValues(alpha: 0.38), fontSize: 14),
                      filled: true,
                      fillColor: Theme.of(context).cardColor,
                      contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
                      enabledBorder: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(16),
                        borderSide: BorderSide(color: Theme.of(context).appColors.foreground.withValues(alpha: 0.12)),
                      ),
                      focusedBorder: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(16),
                        borderSide: BorderSide(color: Theme.of(context).appColors.foreground.withValues(alpha: 0.38)),
                      ),
                    ),
                  ),
                ],
              ),
            ),
            Expanded(
              child: _isLoading 
                ? const Center(child: CircularProgressIndicator())
                : Builder(
                    builder: (context) {
                      final filteredUsers = _users.where((u) {
                        final name = (u['full_name'] ?? u['email'] ?? u['phone'] ?? '').toString().toLowerCase();
                        return name.contains(_searchQuery.toLowerCase());
                      }).toList();
                      
                      return ListView.builder(
                        padding: const EdgeInsets.symmetric(horizontal: 24),
                        itemCount: filteredUsers.length,
                        itemBuilder: (context, index) {
                          final u = filteredUsers[index];
                          final rawName = u['full_name'] ?? u['email'] ?? u['phone'] ?? context.read<LocaleProvider>().t('personnel.no_name') ?? 'Без имени';
                          final name = TransliterationService.transliterateIfNeeded(rawName, context.read<LocaleProvider>().currentLang);
                          
                          // Simple initials generator
                          final nameParts = rawName.toString().split(' ').where((e) => e.isNotEmpty).toList();
                          String initials = '?';
                          if (nameParts.length >= 2) {
                            initials = '${nameParts[0][0]}${nameParts[1][0]}'.toUpperCase();
                          } else if (nameParts.isNotEmpty) {
                            initials = nameParts[0].substring(0, 1).toUpperCase();
                          }
                          
                          final role = (u['role'] == 'super_admin' || u['role'] == 'admin') 
                              ? (context.watch<LocaleProvider>().t('role.super_admin') ?? 'Супер-админ')
                              : (context.watch<LocaleProvider>().t('calendar.employee') ?? 'Сотрудник');
                              
                          String lastLoginStr = '—';
                          if (u['updated_at'] != null) {
                             final dt = DateTime.parse(u['updated_at']).toLocal();
                             lastLoginStr = '${dt.day.toString().padLeft(2, '0')}.${dt.month.toString().padLeft(2, '0')}, ${dt.hour.toString().padLeft(2, '0')}:${dt.minute.toString().padLeft(2, '0')}';
                          }

                          return _buildUserCard(
                            name: name,
                            role: role,
                            initials: initials,
                            userId: u['id'],
                            userEmail: u['email'] ?? '',
                            avatarUrl: u['avatar_url'],
                            lastLogin: (u['is_online'] == true) 
                                ? (context.watch<LocaleProvider>().t('sessions.online') ?? 'В сети') 
                                : lastLoginStr,
                            isOnline: u['is_online'] == true,
                            isSelf: u['id'] == Supabase.instance.client.auth.currentUser?.id,
                          );
                        },
                      );
                    }
                  ),
            ),
          ],
        ),
      ),
    );
  }
}
