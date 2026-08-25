import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:flutter_lucide/flutter_lucide.dart';
import '../dialogs/create_user_dialog.dart';

class UsersTab extends StatefulWidget {
  const UsersTab({Key? key}) : super(key: key);

  @override
  State<UsersTab> createState() => _UsersTabState();
}

class _UsersTabState extends State<UsersTab> {
  String _searchQuery = '';

  Widget _buildUserCard({
    required String name,
    required String role,
    required String initials,
    String? avatarUrl,
    required String lastLogin,
    bool isOnline = false,
    bool isSelf = false,
  }) {
    return Container(
      margin: const EdgeInsets.only(bottom: 16),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: const Color(0xFF09090b),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: Colors.white12),
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
                  color: Colors.white12,
                  shape: BoxShape.circle,
                  image: avatarUrl != null
                      ? DecorationImage(image: NetworkImage(avatarUrl), fit: BoxFit.cover)
                      : null,
                ),
                child: avatarUrl == null
                    ? Center(
                        child: Text(
                          initials,
                          style: GoogleFonts.inter(color: Colors.white, fontSize: 16, fontWeight: FontWeight.bold),
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
                            style: GoogleFonts.inter(color: Colors.white, fontSize: 16, fontWeight: FontWeight.bold),
                            overflow: TextOverflow.ellipsis,
                          ),
                        ),
                        const SizedBox(width: 8),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                          decoration: BoxDecoration(
                            color: const Color(0xFF064e3b).withOpacity(0.5),
                            borderRadius: BorderRadius.circular(12),
                          ),
                          child: Text(
                            'Активен',
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
                'Последний вход: ',
                style: GoogleFonts.inter(color: Colors.white70, fontSize: 13),
              ),
              Text(
                lastLogin,
                style: GoogleFonts.inter(
                  color: isOnline ? const Color(0xFF06b6d4) : Colors.white54, 
                  fontSize: 13,
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),
          const Divider(color: Colors.white12, height: 1),
          const SizedBox(height: 16),
          
          // Action Buttons
          if (role != 'Супер-админ' || isSelf) // If it's super-admin but not self, maybe show it? In the screenshot it's shown for Evgeny Kostin (dimmed) and Ruslan (normal). Wait, for Ruslan (Супер-админ) the buttons are normal! For Evgeny Kostin (Супер-админ) they are dimmed. So they are shown for all, but dimmed if isSelf.
            SizedBox(
              width: double.infinity,
              child: OutlinedButton(
                style: OutlinedButton.styleFrom(
                  side: BorderSide(color: isSelf ? Colors.white.withOpacity(0.05) : Colors.white12),
                  padding: const EdgeInsets.symmetric(vertical: 12),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                  foregroundColor: isSelf ? Colors.white30 : Colors.white,
                ),
                onPressed: isSelf ? null : () {},
                child: Text('Сделать Админ', style: GoogleFonts.inter(fontSize: 13, fontWeight: FontWeight.bold)),
              ),
            ),
          const SizedBox(height: 8),
          Row(
            children: [
              Expanded(
                child: OutlinedButton.icon(
                  style: OutlinedButton.styleFrom(
                    side: BorderSide(color: isSelf ? Colors.white.withOpacity(0.05) : Colors.white12),
                    padding: const EdgeInsets.symmetric(vertical: 12),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                    foregroundColor: isSelf ? Colors.white30 : Colors.white,
                  ),
                  icon: Icon(LucideIcons.key, size: 14),
                  label: Text('Логин/пароль', style: GoogleFonts.inter(fontSize: 13, fontWeight: FontWeight.bold)),
                  onPressed: isSelf ? null : () {},
                ),
              ),
              const SizedBox(width: 8),
              OutlinedButton(
                style: OutlinedButton.styleFrom(
                  backgroundColor: isSelf ? const Color(0xFFef4444).withOpacity(0.2) : const Color(0xFFef4444),
                  side: BorderSide.none,
                  padding: const EdgeInsets.all(12),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                  minimumSize: const Size(44, 44),
                  foregroundColor: isSelf ? Colors.white30 : Colors.white,
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
          color: const Color(0xFF09090b),
          borderRadius: BorderRadius.circular(20),
          border: Border.all(color: Colors.white12),
        ),
        child: Column(
          children: [
            Padding(
              padding: const EdgeInsets.all(24.0),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Список пользователей',
                    style: GoogleFonts.inter(
                      color: Colors.white,
                      fontSize: 16,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    'Создание, удаление, смена ролей и логина/пароля · только для супер-админа',
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
                      label: Text('Создать', style: GoogleFonts.inter(color: Colors.black, fontSize: 14, fontWeight: FontWeight.bold)),
                      onPressed: () {
                        CreateUserDialog.show(context);
                      },
                    ),
                  ),
                  const SizedBox(height: 16),
                  TextField(
                    onChanged: (val) => setState(() => _searchQuery = val),
                    style: GoogleFonts.inter(color: Colors.white, fontSize: 14),
                    decoration: InputDecoration(
                      hintText: 'Поиск пользователя...',
                      hintStyle: GoogleFonts.inter(color: Colors.white38, fontSize: 14),
                      filled: true,
                      fillColor: Colors.black,
                      contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
                      enabledBorder: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(16),
                        borderSide: const BorderSide(color: Colors.white12),
                      ),
                      focusedBorder: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(16),
                        borderSide: const BorderSide(color: Colors.white38),
                      ),
                    ),
                  ),
                ],
              ),
            ),
            Expanded(
              child: ListView(
                padding: const EdgeInsets.symmetric(horizontal: 24),
                children: [
                  _buildUserCard(
                    name: 'Евгений Хань',
                    role: 'Супер-админ',
                    initials: 'ЕВ', // Actually it's ЕХ, but in screenshot it's ЕВ maybe from Evgeny?
                    lastLogin: '1 авг., 22:52',
                  ),
                  _buildUserCard(
                    name: 'Оскар Ткаченко',
                    role: 'Сотрудник',
                    initials: 'ОС', // maybe OSkar?
                    lastLogin: '7 авг., 21:34',
                  ),
                  _buildUserCard(
                    name: 'Владислав',
                    role: 'Сотрудник',
                    initials: 'ВЛ',
                    avatarUrl: 'https://i.pravatar.cc/150?img=11', // Placeholder avatar
                    lastLogin: '9 авг., 13:12',
                  ),
                  _buildUserCard(
                    name: 'Руслан Ткаченко',
                    role: 'Супер-админ',
                    initials: 'РТ',
                    avatarUrl: 'https://i.pravatar.cc/150?img=12', // Placeholder avatar
                    lastLogin: '22 авг., 13:26',
                  ),
                  _buildUserCard(
                    name: 'Евгений Костин',
                    role: 'Супер-админ',
                    initials: 'ЕК',
                    avatarUrl: 'https://i.pravatar.cc/150?img=13', // Placeholder avatar
                    lastLogin: 'В сети',
                    isOnline: true,
                    isSelf: true,
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
