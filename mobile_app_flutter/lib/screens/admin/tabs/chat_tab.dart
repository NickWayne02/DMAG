import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:flutter_lucide/flutter_lucide.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../../../services/auth_service.dart';
import '../../chat_screen.dart'; // To reuse ChatContent

class ChatTab extends StatefulWidget {
  const ChatTab({Key? key}) : super(key: key);

  @override
  State<ChatTab> createState() => _ChatTabState();
}

class _ChatTabState extends State<ChatTab> {
  final _supabase = Supabase.instance.client;
  
  List<Map<String, dynamic>> _sites = [];
  List<Map<String, dynamic>> _profiles = [];
  List<String> _dmChannelIds = [];
  Map<String, Map<String, dynamic>> _dmChannelsMap = {};

  bool _isLoading = true;

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
          backgroundColor: Colors.black,
          appBar: AppBar(
            backgroundColor: Colors.black,
            leading: IconButton(
              icon: const Icon(LucideIcons.arrow_left, color: Colors.white),
              onPressed: () => Navigator.of(ctx).pop(),
            ),
            title: Text(
              title,
              style: GoogleFonts.inter(fontSize: 16, fontWeight: FontWeight.bold, color: Colors.white),
            ),
            bottom: PreferredSize(
              preferredSize: const Size.fromHeight(1),
              child: Container(color: Colors.white12, height: 1),
            ),
          ),
          body: ChatContent(
            channelType: type,
            channelId: id,
            profiles: _profiles,
            sites: _sites,
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
      backgroundColor: const Color(0xFF1E1E1E), // standard dark sheet
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
      builder: (ctx) {
        return Container(
          height: MediaQuery.of(context).size.height * 0.6,
          padding: const EdgeInsets.symmetric(vertical: 20),
          child: Column(
            children: [
              Text('Новый диалог', style: GoogleFonts.inter(color: Colors.white, fontSize: 18, fontWeight: FontWeight.bold)),
              const SizedBox(height: 16),
              Expanded(
                child: ListView.builder(
                  itemCount: available.length,
                  itemBuilder: (context, index) {
                    final p = available[index];
                    return ListTile(
                      leading: CircleAvatar(
                        backgroundColor: Colors.white24,
                        backgroundImage: p['avatar_url'] != null ? NetworkImage(p['avatar_url']) : null,
                        child: p['avatar_url'] == null ? Text(p['full_name']?.substring(0, 1) ?? 'U', style: const TextStyle(color: Colors.white)) : null,
                      ),
                      title: Text(p['full_name'] ?? 'Без имени', style: GoogleFonts.inter(color: Colors.white)),
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
                        _openChat('direct', cid, p['full_name'] ?? 'Личный чат');
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
        backgroundColor: const Color(0xFF1E1E1E),
        title: const Text('Удалить чат?', style: TextStyle(color: Colors.white)),
        content: const Text('Вы уверены, что хотите удалить этот диалог? История будет удалена.', style: TextStyle(color: Colors.white70)),
        actions: [
          TextButton(onPressed: () => Navigator.of(ctx).pop(false), child: const Text('Отмена', style: TextStyle(color: Colors.white))),
          TextButton(onPressed: () => Navigator.of(ctx).pop(true), child: const Text('Удалить', style: TextStyle(color: Colors.red))),
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
              color: Colors.white54,
              fontSize: 12,
              fontWeight: FontWeight.bold,
              letterSpacing: 0.5,
            ),
          ),
          if (hasAddButton)
            GestureDetector(
              onTap: onAddTap,
              child: const Icon(LucideIcons.plus, color: Colors.white54, size: 16),
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
        color: isActive ? const Color(0xFF334155) : Colors.transparent, // Slate 700 if active
        borderRadius: BorderRadius.circular(16),
      ),
      child: ListTile(
        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 0),
        leading: Icon(icon, color: Colors.white70, size: 20),
        title: Text(
          title,
          style: GoogleFonts.inter(
            color: Colors.white,
            fontSize: 14,
            fontWeight: isActive ? FontWeight.bold : FontWeight.normal,
          ),
        ),
        trailing: hasDelete
            ? GestureDetector(
                onTap: onDelete,
                child: const Icon(LucideIcons.trash_2, color: Colors.white54, size: 16),
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
          color: const Color(0xFF09090b),
          borderRadius: BorderRadius.circular(20),
          border: Border.all(color: Colors.white12),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Padding(
              padding: const EdgeInsets.all(24.0),
              child: Text(
                'DMAG Chat',
                style: GoogleFonts.inter(
                  color: Colors.white,
                  fontSize: 20,
                  fontWeight: FontWeight.bold,
                ),
              ),
            ),
            const Divider(color: Colors.white12, height: 1),
            const SizedBox(height: 16),
            Expanded(
              child: _isLoading 
                ? const Center(child: CircularProgressIndicator(color: Colors.white))
                : ListView(
                padding: EdgeInsets.zero,
                children: [
                  _buildSectionTitle('ОСНОВНЫЕ'),
                  _buildChatItem(
                    icon: LucideIcons.hash,
                    title: 'Общий чат команды',
                    isActive: false,
                    onTap: () => _openChat('general', 'general', 'Общий чат команды'),
                  ),
                  const SizedBox(height: 12),
                  
                  _buildSectionTitle('ЛИЧНЫЕ СООБЩЕНИЯ', hasAddButton: true, onAddTap: _startNewDm),
                  if (_dmChannelIds.isEmpty)
                    Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 8),
                      child: Text('Нет личных сообщений', style: GoogleFonts.inter(color: Colors.white38, fontSize: 13)),
                    ),
                  ..._dmChannelIds.map((cid) {
                    final profile = _dmChannelsMap[cid];
                    final name = profile?['full_name'] ?? 'Личный чат';
                    return _buildChatItem(
                      icon: LucideIcons.user,
                      title: name,
                      hasDelete: true,
                      onDelete: () => _deleteDmChat(cid),
                      onTap: () => _openChat('direct', cid, name),
                    );
                  }).toList(),
                  const SizedBox(height: 12),
                  
                  _buildSectionTitle('ОБЪЕКТЫ (${_sites.length})'),
                  if (_sites.isEmpty)
                    Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 8),
                      child: Text('Нет объектов', style: GoogleFonts.inter(color: Colors.white38, fontSize: 13)),
                    ),
                  ..._sites.map((site) {
                    return _buildChatItem(
                      icon: LucideIcons.building_2,
                      title: site['name'],
                      onTap: () => _openChat('site', site['id'], site['name']),
                    );
                  }).toList(),
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
