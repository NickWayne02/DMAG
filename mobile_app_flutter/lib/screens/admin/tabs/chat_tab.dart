import '../../../providers/translation_provider.dart';
import 'package:mobile_app_flutter/utils/transliteration.dart';
import 'package:provider/provider.dart';
import 'package:mobile_app_flutter/providers/locale_provider.dart';
import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:flutter_lucide/flutter_lucide.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../../../services/auth_service.dart';
import '../../chat_screen.dart'; // To reuse ChatContent
import '../../../theme/app_theme.dart';
import '../../../providers/settings_provider.dart';

class ChatTab extends StatefulWidget {
  const ChatTab({super.key});

  @override
  State<ChatTab> createState() => _ChatTabState();
}

class _ChatTabState extends State<ChatTab> {
  final _supabase = Supabase.instance.client;
  
  List<Map<String, dynamic>> _sites = [];
  List<Map<String, dynamic>> _profiles = [];
  List<String> _dmChannelIds = [];
  final Map<String, Map<String, dynamic>> _dmChannelsMap = {};

  bool _isLoading = true;
  bool _isSuperAdmin = false;

  @override
  void initState() {
    super.initState();
    _loadData();
  }

  Future<void> _loadData() async {
    final user = AuthService.currentUser;
    if (user == null) return;

    try {
      final pRes = await _supabase.from('profiles').select('id, full_name, avatar_url').eq('is_active', true);
      _profiles = List<Map<String, dynamic>>.from(pRes);

      final sRes = await _supabase.from('sites').select('id, name');
      _sites = List<Map<String, dynamic>>.from(sRes);

      final dmRes = await _supabase
          .from('chat_messages')
          .select('channel_id')
          .eq('channel_type', 'direct')
          .like('channel_id', '%${user.id}%');
      
      final Set<String> uniqueDms = {};
      for (var row in dmRes) {
        uniqueDms.add(row['channel_id'] as String);
      }
      _dmChannelIds = uniqueDms.toList();

      for (var cid in _dmChannelIds) {
        final parts = cid.split('_');
        if (parts.length == 3) {
          final otherId = parts[1] == user.id ? parts[2] : parts[1];
          final otherProfile = _profiles.firstWhere((p) => p['id'] == otherId, orElse: () => {});
          _dmChannelsMap[cid] = otherProfile;
        }
      }
      
      final p = await AuthService.getProfile(user.id);
      if (p != null) {
        _isSuperAdmin = p['role'] == 'super_admin';
      }
    } catch (e) {
      debugPrint('Error loading chat data: $e');
    }

    if (mounted) {
      setState(() => _isLoading = false);
    }
  }

  void _openChat(String type, String id, String title) {
    Navigator.of(context).push(
      MaterialPageRoute(
        builder: (ctx) => Scaffold(
          backgroundColor: Theme.of(context).cardColor,
          appBar: AppBar(
            backgroundColor: Theme.of(context).cardColor,
            leading: IconButton(
              icon: Icon(LucideIcons.arrow_left, color: Theme.of(context).appColors.foreground),
              onPressed: () => Navigator.of(ctx).pop(),
            ),
            title: Text(
              title,
              style: GoogleFonts.inter(fontSize: 16, fontWeight: FontWeight.bold, color: Theme.of(context).appColors.foreground),
            ),
            bottom: PreferredSize(
              preferredSize: const Size.fromHeight(1),
              child: Container(color: Theme.of(context).appColors.foreground.withValues(alpha: 0.12), height: 1),
            ),
          ),
          body: ChatContent(
            channelType: type,
            channelId: id,
            profiles: _profiles,
            sites: _sites,
            isSuperAdmin: _isSuperAdmin,
          ),
        ),
      ),
    );
  }

  void _startNewDm() {
    final user = AuthService.currentUser;
    if (user == null) return;

    final available = _profiles.where((p) => p['id'] != user.id).toList();
    
    showModalBottomSheet(
      context: context,
      backgroundColor: Theme.of(context).cardColor, // standard dark sheet
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
      builder: (ctx) {
        return Container(
          height: MediaQuery.of(context).size.height * 0.6,
          padding: const EdgeInsets.symmetric(vertical: 20),
          child: Column(
            children: [
              Text(context.watch<LocaleProvider>().t('chat.new_dialog') ?? 'Новый диалог', style: GoogleFonts.inter(color: Theme.of(context).appColors.foreground, fontSize: 18, fontWeight: FontWeight.bold)),
              const SizedBox(height: 16),
              Expanded(
                child: ListView.builder(
                  itemCount: available.length,
                  itemBuilder: (context, index) {
                    final p = available[index];
                    return ListTile(
                      leading: CircleAvatar(
                        backgroundColor: Theme.of(context).appColors.foreground.withValues(alpha: 0.24),
                        backgroundImage: p['avatar_url'] != null ? NetworkImage(p['avatar_url']) : null,
                        child: p['avatar_url'] == null ? Text(context.watch<TranslationProvider>().translate(p['full_name'] ?? '', context.read<LocaleProvider>().currentLang).substring(0, 1), style: TextStyle(color: Theme.of(context).appColors.foreground)) : null,
                      ),
                      title: Text(context.watch<TranslationProvider>().translate(p['full_name'] ?? context.watch<LocaleProvider>().t('chat.no_name') ?? 'Без имени', context.read<LocaleProvider>().currentLang), style: GoogleFonts.inter(color: Theme.of(context).appColors.foreground)),
                      onTap: () {
                        Navigator.of(context).pop();
                        final ids = [user.id, p['id']]..sort();
                        final cid = 'dm_${ids[0]}_${ids[1]}';
                        if (!_dmChannelIds.contains(cid)) {
                          setState(() {
                            _dmChannelIds.add(cid);
                            _dmChannelsMap[cid] = p;
                          });
                        }
                        _openChat('direct', cid, context.watch<TranslationProvider>().translate(p['full_name'] ?? context.watch<LocaleProvider>().t('chat.dm') ?? 'Личный чат', context.read<LocaleProvider>().currentLang));
                      },
                    );
                  },
                ),
              ),
            ],
          ),
        );
      }
    );
  }

  Future<void> _deleteDmChat(String cid) async {
    final confirm = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: Theme.of(context).cardColor,
        title: Text(context.watch<LocaleProvider>().t('chat.delete_title') ?? 'Удалить чат?', style: TextStyle(color: Theme.of(context).appColors.foreground)),
        content: Text(context.watch<LocaleProvider>().t('chat.delete_msg') ?? 'Вы уверены, что хотите удалить этот диалог? История будет удалена.', style: TextStyle(color: Theme.of(context).appColors.foreground.withValues(alpha: 0.7))),
        actions: [
          TextButton(onPressed: () => Navigator.of(ctx).pop(false), child: Text(context.watch<LocaleProvider>().t('calendar.cancel') ?? 'Отмена', style: TextStyle(color: Theme.of(context).appColors.foreground))),
          TextButton(onPressed: () => Navigator.of(ctx).pop(true), child: Text(context.watch<LocaleProvider>().t('calendar.delete') ?? 'Удалить', style: const TextStyle(color: Colors.red))),
        ],
      )
    );

    if (confirm != true) return;

    setState(() {
      _dmChannelIds.remove(cid);
    });

    try {
      await _supabase.from('chat_messages').delete().eq('channel_type', 'direct').eq('channel_id', cid);
    } catch (e) {
      debugPrint(e.toString());
    }
  }

  Widget _buildSectionTitle(String title, {bool hasAddButton = false, VoidCallback? onAddTap}) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(
            title,
            style: GoogleFonts.inter(
              color: Theme.of(context).appColors.foreground.withValues(alpha: 0.54),
              fontSize: 12,
              fontWeight: FontWeight.bold,
              letterSpacing: 0.5,
            ),
          ),
          if (hasAddButton)
            GestureDetector(
              onTap: onAddTap,
              child: Icon(LucideIcons.plus, color: Theme.of(context).appColors.foreground.withValues(alpha: 0.54), size: 16),
            ),
        ],
      ),
    );
  }

  Widget _buildChatItem({
    required IconData icon,
    required String title,
    bool isActive = false,
    bool hasDelete = false,
    VoidCallback? onTap,
    VoidCallback? onDelete,
  }) {
    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 2),
      decoration: BoxDecoration(
        color: isActive ? Theme.of(context).appColors.primary.withValues(alpha: 0.1) : Colors.transparent, 
        borderRadius: BorderRadius.circular(16),
      ),
      child: ListTile(
        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 0),
        leading: Icon(icon, color: Theme.of(context).appColors.foreground.withValues(alpha: 0.7), size: 20),
        title: Text(
          title,
          style: GoogleFonts.inter(
            color: Theme.of(context).appColors.foreground,
            fontSize: 14,
            fontWeight: isActive ? FontWeight.bold : FontWeight.normal,
          ),
        ),
        trailing: hasDelete
            ? GestureDetector(
                onTap: onDelete,
                child: Icon(LucideIcons.trash_2, color: Theme.of(context).appColors.foreground.withValues(alpha: 0.54), size: 16),
              )
            : null,
        onTap: onTap,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
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
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Padding(
              padding: const EdgeInsets.all(24.0),
              child: Text(
                '${context.watch<SettingsProvider>().settings.appName} Chat',
                style: GoogleFonts.inter(
                  color: Theme.of(context).appColors.foreground,
                  fontSize: 20,
                  fontWeight: FontWeight.bold,
                ),
              ),
            ),
            Divider(color: Theme.of(context).appColors.foreground.withValues(alpha: 0.12), height: 1),
            const SizedBox(height: 16),
            Expanded(
              child: _isLoading 
                ? Center(child: CircularProgressIndicator(color: Theme.of(context).appColors.foreground))
                : ListView(
                padding: EdgeInsets.zero,
                children: [
                  _buildSectionTitle(context.watch<LocaleProvider>().t('chat.main') ?? 'ОСНОВНЫЕ'),
                  _buildChatItem(
                    icon: LucideIcons.hash,
                    title: context.watch<LocaleProvider>().t('chat.general') ?? 'Общий чат команды',
                    isActive: false,
                    onTap: () => _openChat('general', 'general', context.read<LocaleProvider>().t('chat.general') ?? 'Общий чат команды'),
                  ),
                  const SizedBox(height: 12),
                  
                  _buildSectionTitle(context.watch<LocaleProvider>().t('chat.dms') ?? 'ЛИЧНЫЕ СООБЩЕНИЯ', hasAddButton: true, onAddTap: _startNewDm),
                  if (_dmChannelIds.isEmpty)
                    Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 8),
                      child: Text(context.watch<LocaleProvider>().t('chat.no_dms') ?? 'Нет личных сообщений', style: GoogleFonts.inter(color: Theme.of(context).appColors.foreground.withValues(alpha: 0.38), fontSize: 13)),
                    ),
                  ..._dmChannelIds.map((cid) {
                    final profile = _dmChannelsMap[cid];
                    final name = context.watch<TranslationProvider>().translate(profile?['full_name'] ?? context.watch<LocaleProvider>().t('chat.dm') ?? 'Личный чат', context.read<LocaleProvider>().currentLang);
                    return _buildChatItem(
                      icon: LucideIcons.user,
                      title: name,
                      hasDelete: true,
                      onDelete: () => _deleteDmChat(cid),
                      onTap: () => _openChat('direct', cid, name),
                    );
                  }),
                  const SizedBox(height: 12),
                  
                  _buildSectionTitle('''${context.watch<LocaleProvider>().t('chat.sites') ?? 'ОБЪЕКТЫ'} (${_sites.length})'''),
                  if (_sites.isEmpty)
                    Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 8),
                      child: Text(context.watch<LocaleProvider>().t('sites.empty') ?? 'Нет объектов', style: GoogleFonts.inter(color: Theme.of(context).appColors.foreground.withValues(alpha: 0.38), fontSize: 13)),
                    ),
                  ..._sites.map((site) {
                    return _buildChatItem(
                      icon: LucideIcons.building_2,
                      title: context.watch<TranslationProvider>().translate(site['name'] ?? '', context.read<LocaleProvider>().currentLang),
                      onTap: () => _openChat('site', site['id'], context.watch<TranslationProvider>().translate(site['name'] ?? '', context.read<LocaleProvider>().currentLang)),
                    );
                  }),
                  const SizedBox(height: 24),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
