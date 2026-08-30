import 'package:mobile_app_flutter/utils/transliteration.dart';
import '../theme/app_theme.dart';
import '../providers/locale_provider.dart';
import '../providers/settings_provider.dart';
import 'package:provider/provider.dart';
import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:flutter_lucide/flutter_lucide.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../services/auth_service.dart';
import 'photo_report_sheet.dart';

class ChatScreen extends StatefulWidget {
  const ChatScreen({super.key});

  @override
  State<ChatScreen> createState() => _ChatScreenState();
}

class _ChatScreenState extends State<ChatScreen> {
  final _supabase = Supabase.instance.client;
  
  bool _isShowingChannelsList = true;
  String _activeChannelType = 'general';
  String _activeChannelId = 'general';
  String _activeChannelTitle = 'Общий чат команды';

  List<Map<String, dynamic>> _sites = [];
  List<Map<String, dynamic>> _profiles = [];
  List<String> _dmChannelIds = [];
  final List<String> _mutedChannels = [];

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

  void _switchChannel(String type, String id, String title) {
    setState(() {
      _activeChannelType = type;
      _activeChannelId = id;
      _activeChannelTitle = title;
      _isShowingChannelsList = false;
    });
  }

  void _startNewDm() {
    final user = AuthService.currentUser;
    if (user == null) return;

    final available = _profiles.where((p) => p['id'] != user.id).toList();
    
    showModalBottomSheet(
      context: context,
      backgroundColor: const Color(0xFF1E1E1E),
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
                        child: p['avatar_url'] == null ? Text(p['full_name']?.substring(0, 1) ?? 'U', style: TextStyle(color: Theme.of(context).appColors.foreground)) : null,
                      ),
                      title: Text(p['full_name'] ?? context.watch<LocaleProvider>().t('chat.no_name') ?? 'Без имени', style: GoogleFonts.inter(color: Theme.of(context).appColors.foreground)),
                      onTap: () {
                        Navigator.of(context).pop();
                        final ids = [user.id, p['id']]..sort();
                        final cid = 'dm_${ids[0]}_${ids[1]}';
                        if (!_dmChannelIds.contains(cid)) {
                          setState(() => _dmChannelIds.add(cid));
                        }
                        _switchChannel('direct', cid, p['full_name'] ?? context.watch<LocaleProvider>().t('chat.dm') ?? 'Личный чат');
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
          TextButton(onPressed: () => Navigator.of(ctx).pop(false), child: Text(context.watch<LocaleProvider>().t('chat.media_cancel') ?? 'Отмена', style: TextStyle(color: Theme.of(context).appColors.foreground))),
          TextButton(onPressed: () => Navigator.of(ctx).pop(true), child: Text(context.watch<LocaleProvider>().t('calendar.delete') ?? 'Удалить', style: const TextStyle(color: Colors.red))),
        ],
      )
    );

    if (confirm != true) return;

    setState(() {
      _dmChannelIds.remove(cid);
      if (_activeChannelId == cid) {
        _isShowingChannelsList = true;
      }
    });

    try {
      await _supabase.from('chat_messages').delete().eq('channel_type', 'direct').eq('channel_id', cid);
    } catch (e) {
      debugPrint(e.toString());
    }
  }

  Future<void> _clearHistory() async {
    final user = AuthService.currentUser;
    if (user == null) return;

    final confirm = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: Theme.of(context).cardColor,
        title: Text(context.watch<LocaleProvider>().t('chat.clear_history_title') ?? 'Очистить историю?', style: TextStyle(color: Theme.of(context).appColors.foreground)),
        content: Text(context.watch<LocaleProvider>().t('chat.clear_history_msg') ?? 'Это действие удалит все сообщения в текущем чате.', style: TextStyle(color: Theme.of(context).appColors.foreground.withValues(alpha: 0.7))),
        actions: [
          TextButton(onPressed: () => Navigator.of(ctx).pop(false), child: Text(context.watch<LocaleProvider>().t('chat.media_cancel') ?? 'Отмена', style: TextStyle(color: Theme.of(context).appColors.foreground))),
          TextButton(onPressed: () => Navigator.of(ctx).pop(true), child: Text(context.watch<LocaleProvider>().t('chat.clear_btn') ?? 'Очистить', style: const TextStyle(color: Colors.red))),
        ],
      )
    );

    if (confirm != true) return;

    try {
      await _supabase.from('chat_messages').delete().eq('channel_type', _activeChannelType).eq('channel_id', _activeChannelId);
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(context.read<LocaleProvider>().t('chat.clear_success') ?? 'История очищена')));
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(context.read<LocaleProvider>().t('chat.clear_error') ?? 'Ошибка очистки истории')));
    }
  }

  void _showChatInfo() {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: Theme.of(context).cardColor,
        title: Text(context.watch<LocaleProvider>().t('chat.info_title') ?? 'Информация о чате', style: TextStyle(color: Theme.of(context).appColors.foreground)),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(context.watch<LocaleProvider>().t('chat.info_name') ?? 'Название', style: TextStyle(color: Theme.of(context).appColors.foreground.withValues(alpha: 0.54), fontSize: 12)),
            Text(_activeChannelTitle, style: TextStyle(color: Theme.of(context).appColors.foreground, fontSize: 16, fontWeight: FontWeight.bold)),
            const SizedBox(height: 12),
            Text(context.watch<LocaleProvider>().t('chat.info_type') ?? 'Тип чата', style: TextStyle(color: Theme.of(context).appColors.foreground.withValues(alpha: 0.54), fontSize: 12)),
            Text(
              _activeChannelType == 'general' ? context.watch<LocaleProvider>().t('chat.info_type_general') ?? 'Общий канал' : _activeChannelType == 'direct' ? context.watch<LocaleProvider>().t('chat.info_type_dm') ?? 'Личные сообщения' : context.watch<LocaleProvider>().t('chat.info_type_site') ?? 'Чат объекта',
              style: TextStyle(color: Theme.of(context).appColors.foreground, fontSize: 14),
            ),
            const SizedBox(height: 12),
            Text(context.watch<LocaleProvider>().t('chat.info_notifs') ?? 'Уведомления', style: TextStyle(color: Theme.of(context).appColors.foreground.withValues(alpha: 0.54), fontSize: 12)),
            Text(
              _mutedChannels.contains(_activeChannelId) ? context.watch<LocaleProvider>().t('chat.info_notifs_off') ?? 'Отключены' : context.watch<LocaleProvider>().t('chat.info_notifs_on') ?? 'Включены',
              style: TextStyle(color: Theme.of(context).appColors.foreground, fontSize: 14),
            ),
          ],
        ),
        actions: [
          TextButton(onPressed: () => Navigator.of(ctx).pop(), child: Text(context.watch<LocaleProvider>().t('chat.info_close') ?? 'Закрыть', style: TextStyle(color: Theme.of(context).primaryColor))),
        ],
      )
    );
  }

  void _showChatMedia() {
    showModalBottomSheet(
      context: context,
      backgroundColor: const Color(0xFF1E1E1E),
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
      builder: (ctx) {
        bool isSelectionMode = false;
        Set<String> selectedMessageIds = {};

        return StatefulBuilder(
          builder: (context, setModalState) {
            return DraggableScrollableSheet(
              initialChildSize: 0.7,
              minChildSize: 0.4,
              maxChildSize: 0.9,
              expand: false,
              builder: (context, scrollController) {
                return Column(
                  children: [
                    Padding(
                      padding: const EdgeInsets.all(16),
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Text(context.watch<LocaleProvider>().t('chat.media_title') ?? 'Вложенные медиа', style: GoogleFonts.inter(color: Theme.of(context).appColors.foreground, fontSize: 18, fontWeight: FontWeight.bold)),
                          if (!isSelectionMode)
                            Row(
                              children: [
                                TextButton(
                                  onPressed: () {
                                    setModalState(() => isSelectionMode = true);
                                  },
                                  style: TextButton.styleFrom(
                                    padding: const EdgeInsets.symmetric(horizontal: 16),
                                    side: BorderSide(color: Theme.of(context).appColors.foreground.withValues(alpha: 0.24)),
                                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
                                  ),
                                  child: Text(context.watch<LocaleProvider>().t('chat.media_select') ?? 'Выбрать', style: TextStyle(color: Theme.of(context).appColors.foreground)),
                                ),
                                const SizedBox(width: 8),
                                GestureDetector(
                                  onTap: () => Navigator.of(context).pop(),
                                  child: Icon(LucideIcons.x, color: Theme.of(context).appColors.foreground.withValues(alpha: 0.54), size: 24),
                                )
                              ],
                            )
                          else
                            Row(
                              children: [
                                TextButton(
                                  onPressed: () {
                                    setModalState(() {
                                      isSelectionMode = false;
                                      selectedMessageIds.clear();
                                    });
                                  },
                                  child: Text(context.watch<LocaleProvider>().t('chat.media_cancel') ?? 'Отмена', style: TextStyle(color: Theme.of(context).appColors.foreground)),
                                ),
                                if (selectedMessageIds.isNotEmpty)
                                  TextButton(
                                    onPressed: () async {
                                      // Delete messages
                                      try {
                                        await _supabase
                                            .from('chat_messages')
                                            .delete()
                                            .inFilter('id', selectedMessageIds.toList());
                                        if (!context.mounted) return;
                                        setModalState(() {
                                          isSelectionMode = false;
                                          selectedMessageIds.clear();
                                        });
                                        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(context.read<LocaleProvider>().t('chat.media_delete_success') ?? 'Удалено')));
                                      } catch (e) {
                                        if (!context.mounted) return;
                                        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(context.read<LocaleProvider>().t('chat.media_delete_error') ?? 'Ошибка удаления')));
                                      }
                                    },
                                    style: TextButton.styleFrom(
                                      backgroundColor: const Color(0xFFE54D4D),
                                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
                                    ),
                                    child: Text('''${context.watch<LocaleProvider>().t('chat.media_delete_count') ?? 'Удалить'} (${selectedMessageIds.length})''', style: TextStyle(color: Theme.of(context).appColors.foreground)),
                                  ),
                                const SizedBox(width: 8),
                                GestureDetector(
                                  onTap: () => Navigator.of(context).pop(),
                                  child: Icon(LucideIcons.x, color: Theme.of(context).appColors.foreground.withValues(alpha: 0.54), size: 24),
                                )
                              ],
                            ),
                        ],
                      ),
                    ),
                    Expanded(
                      child: FutureBuilder<List<Map<String, dynamic>>>(
                        future: _supabase
                            .from('chat_messages')
                            .select('id, content')
                            .eq('channel_type', _activeChannelType)
                            .eq('channel_id', _activeChannelId)
                            .or('content.like.%[ФОТО_ОТЧЕТ]%,content.like.%[PHOTO_REPORT]%')
                            .order('created_at', ascending: false),
                        builder: (context, snapshot) {
                          if (snapshot.connectionState == ConnectionState.waiting && !snapshot.hasData) {
                            return Center(child: CircularProgressIndicator(color: Theme.of(context).primaryColor));
                          }
                          if (snapshot.hasError) {
                            return Center(child: Text(context.watch<LocaleProvider>().t('chat.media_error_load') ?? 'Ошибка загрузки', style: TextStyle(color: Theme.of(context).appColors.foreground.withValues(alpha: 0.54))));
                          }
                          final items = snapshot.data ?? [];
                          
                          // Parse out photo URL and map it to message ID
                          final List<Map<String, dynamic>> mediaItems = [];
                          for (var item in items) {
                            final content = item['content'] as String? ?? '';
                            final parts = content.replaceAll(RegExp(r'\[ФОТО_ОТЧЕТ\] |\[PHOTO_REPORT\] '), '').split(' | ');
                            if (parts.isNotEmpty && parts[0].isNotEmpty) {
                              String photoUrl = parts[0];
                              if (!photoUrl.startsWith('http')) {
                                photoUrl = _supabase.storage.from('photo-reports').getPublicUrl(photoUrl);
                              }
                              mediaItems.add({
                                'id': item['id'].toString(),
                                'url': photoUrl,
                              });
                            }
                          }

                          if (mediaItems.isEmpty) {
                            return Center(child: Text(context.watch<LocaleProvider>().t('chat.media_empty') ?? 'Нет медиа файлов', style: TextStyle(color: Theme.of(context).appColors.foreground.withValues(alpha: 0.54))));
                          }

                          return GridView.builder(
                            controller: scrollController,
                            padding: const EdgeInsets.all(16),
                            gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                              crossAxisCount: 3,
                              crossAxisSpacing: 8,
                              mainAxisSpacing: 8,
                            ),
                            itemCount: mediaItems.length,
                            itemBuilder: (context, index) {
                              final item = mediaItems[index];
                              final id = item['id'] as String;
                              final url = item['url'] as String;
                              final isSelected = selectedMessageIds.contains(id);

                              return GestureDetector(
                                onTap: () {
                                  if (isSelectionMode) {
                                    setModalState(() {
                                      if (isSelected) {
                                        selectedMessageIds.remove(id);
                                      } else {
                                        selectedMessageIds.add(id);
                                      }
                                    });
                                  } else {
                                    Navigator.push(context, PageRouteBuilder(
                                      opaque: false,
                                      barrierColor: Colors.black.withValues(alpha: 0.9),
                                      pageBuilder: (context, _, __) {
                                        return Scaffold(
                                          backgroundColor: Colors.transparent,
                                          body: Center(
                                            child: Stack(
                                              alignment: Alignment.topRight,
                                              children: [
                                                GestureDetector(
                                                  onTap: () => Navigator.pop(context),
                                                  child: InteractiveViewer(
                                                    panEnabled: true,
                                                    minScale: 0.5,
                                                    maxScale: 4,
                                                    child: Hero(
                                                      tag: 'media_photo_$id',
                                                      child: ClipRRect(
                                                        borderRadius: BorderRadius.circular(24),
                                                        child: Image.network(url, fit: BoxFit.contain, width: MediaQuery.of(context).size.width * 0.95, height: MediaQuery.of(context).size.height * 0.85),
                                                      ),
                                                    ),
                                                  ),
                                                ),
                                                Padding(
                                                  padding: const EdgeInsets.all(8.0),
                                                  child: GestureDetector(
                                                    onTap: () => Navigator.pop(context),
                                                    child: Container(
                                                      decoration: BoxDecoration(
                                                        color: Colors.black.withValues(alpha: 0.5),
                                                        shape: BoxShape.circle,
                                                      ),
                                                      padding: const EdgeInsets.all(8),
                                                      child: const Icon(LucideIcons.x, color: Colors.white, size: 20),
                                                    ),
                                                  ),
                                                ),
                                              ],
                                            ),
                                          ),
                                        );
                                      }
                                    ));
                                  }
                                },
                                onLongPress: () {
                                  if (!isSelectionMode) {
                                    setModalState(() {
                                      isSelectionMode = true;
                                      selectedMessageIds.add(id);
                                    });
                                  }
                                },
                                child: Container(
                                  decoration: BoxDecoration(
                                    borderRadius: BorderRadius.circular(12),
                                    border: isSelected ? Border.all(color: Theme.of(context).primaryColor, width: 3) : null,
                                  ),
                                  child: Stack(
                                    fit: StackFit.expand,
                                    children: [
                                      ClipRRect(
                                        borderRadius: BorderRadius.circular(isSelected ? 9 : 12),
                                        child: Hero(
                                          tag: 'media_photo_$id',
                                          child: Image.network(url, fit: BoxFit.cover),
                                        ),
                                      ),
                                      if (isSelected)
                                        Container(
                                          decoration: BoxDecoration(
                                            color: Colors.black.withValues(alpha: 0.4),
                                            borderRadius: BorderRadius.circular(9),
                                          ),
                                          child: const Center(
                                            child: Icon(Icons.check_circle, color: Colors.white, size: 32),
                                          ),
                                        ),
                                    ],
                                  ),
                                ),
                              );
                            },
                          );
                        },
                      ),
                    ),
                  ],
                );
              },
            );
          }
        );
      }
    );
  }

  @override
  Widget build(BuildContext context) {
    if (_isLoading) {
      return Scaffold(backgroundColor: Theme.of(context).scaffoldBackgroundColor, body: Center(child: CircularProgressIndicator(color: Theme.of(context).primaryColor)));
    }

    final user = AuthService.currentUser;
    final dmChannelsMap = <String, Map<String, dynamic>>{};
    
    for (var cid in _dmChannelIds) {
      final parts = cid.split('_');
      if (parts.length == 3 && user != null) {
        final otherId = parts[1] == user.id ? parts[2] : parts[1];
        final otherProfile = _profiles.firstWhere((p) => p['id'] == otherId, orElse: () => {});
        dmChannelsMap[cid] = otherProfile;
      }
    }

    if (_isShowingChannelsList) {
      return Scaffold(
        backgroundColor: Theme.of(context).scaffoldBackgroundColor,
        appBar: AppBar(
          backgroundColor: Theme.of(context).appBarTheme.backgroundColor,
          leading: IconButton(
            icon: Icon(LucideIcons.arrow_left, color: Theme.of(context).appColors.foreground),
            onPressed: () => Navigator.of(context).pop(), // Go back to dashboard
          ),
          title: Text(
            '${context.watch<SettingsProvider>().settings.appName} Chat',
            style: GoogleFonts.inter(fontSize: 18, fontWeight: FontWeight.bold, color: Theme.of(context).appColors.foreground),
          ),
          bottom: PreferredSize(
            preferredSize: const Size.fromHeight(1),
            child: Container(color: Theme.of(context).appColors.foreground.withValues(alpha: 0.12), height: 1),
          ),
        ),
        body: ListView(
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 16),
          children: [
            Padding(
              padding: const EdgeInsets.only(left: 4, bottom: 8),
              child: Text(context.watch<LocaleProvider>().t('chat.main') ?? 'ОСНОВНЫЕ', style: GoogleFonts.inter(color: Theme.of(context).appColors.foreground.withValues(alpha: 0.54), fontSize: 10, fontWeight: FontWeight.bold, letterSpacing: 1)),
            ),
            _buildDrawerItem(
              icon: LucideIcons.hash,
              title: context.watch<LocaleProvider>().t('chat.general') ?? 'Общий чат команды',
              isActive: _activeChannelType == 'general',
              onTap: () => _switchChannel('general', 'general', context.read<LocaleProvider>().t('chat.general') ?? 'Общий чат команды'),
            ),
            
            const SizedBox(height: 24),
            
            Padding(
              padding: const EdgeInsets.only(left: 4, bottom: 8),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(context.watch<LocaleProvider>().t('chat.dms') ?? 'ЛИЧНЫЕ СООБЩЕНИЯ', style: GoogleFonts.inter(color: Theme.of(context).appColors.foreground.withValues(alpha: 0.54), fontSize: 10, fontWeight: FontWeight.bold, letterSpacing: 1)),
                  GestureDetector(
                    onTap: _startNewDm,
                    child: Icon(LucideIcons.plus, color: Theme.of(context).appColors.foreground.withValues(alpha: 0.54), size: 16),
                  )
                ],
              ),
            ),
            ..._dmChannelIds.map((cid) {
              final profile = dmChannelsMap[cid];
              final name = profile?['full_name'] ?? context.watch<LocaleProvider>().t('chat.dm') ?? 'Личный чат';
              return _buildDrawerItem(
                icon: LucideIcons.user,
                title: name,
                isActive: _activeChannelId == cid,
                onDelete: () => _deleteDmChat(cid),
                onTap: () => _switchChannel('direct', cid, name),
              );
            }),

            const SizedBox(height: 24),

            if (_sites.isNotEmpty)
              Padding(
                padding: const EdgeInsets.only(left: 4, bottom: 8),
                child: Text(context.watch<LocaleProvider>().t('chat.sites') ?? 'ОБЪЕКТЫ', style: GoogleFonts.inter(color: Theme.of(context).appColors.foreground.withValues(alpha: 0.54), fontSize: 10, fontWeight: FontWeight.bold, letterSpacing: 1)),
              ),
            ..._sites.map((site) {
              return _buildDrawerItem(
                icon: LucideIcons.building_2,
                title: site['name'],
                isActive: _activeChannelId == site['id'],
                onTap: () => _switchChannel('site', site['id'], site['name']),
              );
            }),
          ],
        ),
      );
    }

    // We are in ChatContent view
    return Scaffold(
      backgroundColor: Theme.of(context).scaffoldBackgroundColor,
      appBar: AppBar(
        backgroundColor: Theme.of(context).appBarTheme.backgroundColor,
        leading: IconButton(
          icon: Icon(LucideIcons.arrow_left, color: Theme.of(context).appColors.foreground),
          onPressed: () {
            setState(() {
              _isShowingChannelsList = true;
            });
          },
        ),
        title: Text(
          _activeChannelTitle,
          style: GoogleFonts.inter(fontSize: 16, fontWeight: FontWeight.bold, color: Theme.of(context).appColors.foreground),
        ),
        actions: [
          PopupMenuButton<String>(
            icon: Icon(Icons.more_vert, color: Theme.of(context).appColors.foreground),
            color: const Color(0xFF151515),
            onSelected: (value) {
              if (value == 'info') _showChatInfo();
              if (value == 'media') _showChatMedia();
              if (value == 'mute') {
                setState(() {
                  if (_mutedChannels.contains(_activeChannelId)) {
                    _mutedChannels.remove(_activeChannelId);
                  } else {
                    _mutedChannels.add(_activeChannelId);
                  }
                });
              }
              if (value == 'clear') _clearHistory();
            },
            itemBuilder: (BuildContext ctx) => <PopupMenuEntry<String>>[
              PopupMenuItem<String>(
                value: 'info',
                child: Text(ctx.read<LocaleProvider>().t('chat.info_title') ?? 'Информация о чате', style: TextStyle(color: Theme.of(context).appColors.foreground)),
              ),
              PopupMenuItem<String>(
                value: 'media',
                child: Text(ctx.read<LocaleProvider>().t('chat.media_title') ?? 'Вложенные медиа', style: TextStyle(color: Theme.of(context).appColors.foreground)),
              ),
              PopupMenuItem<String>(
                value: 'mute',
                child: Text(_mutedChannels.contains(_activeChannelId) ? ctx.read<LocaleProvider>().t('chat.notifs_enable') ?? 'Включить уведомления' : ctx.read<LocaleProvider>().t('chat.notifs_disable') ?? 'Отключить уведомления', style: TextStyle(color: Theme.of(context).appColors.foreground)),
              ),
              if (_activeChannelType == 'direct' || _isSuperAdmin)
                PopupMenuItem<String>(
                  value: 'clear',
                  child: Text(ctx.read<LocaleProvider>().t('chat.clear_history') ?? 'Очистить историю', style: const TextStyle(color: Colors.red)),
                ),
            ],
          )
        ],
        bottom: PreferredSize(
          preferredSize: const Size.fromHeight(1),
          child: Container(color: Theme.of(context).appColors.foreground.withValues(alpha: 0.12), height: 1),
        ),
      ),
      body: ChatContent(
        key: ValueKey('$_activeChannelType-$_activeChannelId'),
        channelType: _activeChannelType,
        channelId: _activeChannelId,
        profiles: _profiles,
        sites: _sites,
        isSuperAdmin: _isSuperAdmin,
      ),
    );
  }

  Widget _buildDrawerItem({required IconData icon, required String title, required bool isActive, VoidCallback? onDelete, required VoidCallback onTap}) {
    return Container(
      margin: const EdgeInsets.only(bottom: 2),
      decoration: BoxDecoration(
        color: isActive ? Theme.of(context).appColors.primary.withValues(alpha: 0.1) : Colors.transparent, 
        borderRadius: BorderRadius.circular(16),
      ),
      child: ListTile(
        leading: Icon(icon, color: Theme.of(context).appColors.foreground.withValues(alpha: 0.54), size: 18),
        title: Text(
          title,
          style: GoogleFonts.inter(
            color: Theme.of(context).appColors.foreground,
            fontWeight: isActive ? FontWeight.w600 : FontWeight.normal,
            fontSize: 14,
          ),
          maxLines: 1,
          overflow: TextOverflow.ellipsis,
        ),
        trailing: onDelete != null
          ? GestureDetector(
              onTap: onDelete,
              child: Icon(LucideIcons.trash_2, color: Theme.of(context).appColors.foreground.withValues(alpha: 0.54), size: 16),
            )
          : null,
        onTap: onTap,
        dense: true,
        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 0),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
      ),
    );
  }
}

// ----------------------------------------------------------------------
// Chat Content
// ----------------------------------------------------------------------

class ChatContent extends StatefulWidget {
  final String channelType;
  final String channelId;
  final List<Map<String, dynamic>> profiles;
  final List<Map<String, dynamic>> sites;
  final bool isSuperAdmin;

  const ChatContent({
    super.key,
    required this.channelType,
    required this.channelId,
    required this.profiles,
    required this.sites,
    this.isSuperAdmin = false,
  });

  @override
  State<ChatContent> createState() => _ChatContentState();
}

class _ChatContentState extends State<ChatContent> {
  final TextEditingController _messageController = TextEditingController();
  final ScrollController _scrollController = ScrollController();
  final _supabase = Supabase.instance.client;
  bool _isSending = false;

  void _sendMessage() async {
    final text = _messageController.text.trim();
    if (text.isEmpty) return;
    
    final user = AuthService.currentUser;
    if (user == null) return;

    setState(() => _isSending = true);
    try {
      final profile = widget.profiles.firstWhere((p) => p['id'] == user.id, orElse: () => {});
      final authorName = profile['full_name'] ?? user.email ?? context.watch<LocaleProvider>().t('dashboard.employee') ?? 'Сотрудник';
      
      await _supabase.from('chat_messages').insert({
        'channel_type': widget.channelType,
        'channel_id': widget.channelId,
        'author_id': user.id,
        'author_name': authorName,
        'content': text,
        'source_lang': 'ru',
      });
      _messageController.clear();
      // Scroll to bottom
      Future.delayed(const Duration(milliseconds: 100), () {
        if (_scrollController.hasClients) {
          _scrollController.animateTo(
            0,
            duration: const Duration(milliseconds: 300),
            curve: Curves.easeOut,
          );
        }
      });
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(context.watch<LocaleProvider>().t('chat.send_error') ?? 'Ошибка отправки сообщения')));
      }
    } finally {
      if (mounted) {
        setState(() => _isSending = false);
      }
    }
  }

  void _openPhotoReport() {
    Map<String, dynamic>? site;
    if (widget.channelType == 'site') {
      site = widget.sites.firstWhere((s) => s['id'] == widget.channelId, orElse: () => {});
    }
    
    PhotoReportSheet.show(context, site);
  }

  void _deleteMessage(String id) async {
    final confirm = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: Theme.of(context).cardColor,
        title: Text(context.watch<LocaleProvider>().t('chat.del_msg_title') ?? 'Удалить?', style: TextStyle(color: Theme.of(context).appColors.foreground)),
        content: Text(context.watch<LocaleProvider>().t('chat.del_msg_content') ?? 'Сообщение будет удалено.', style: TextStyle(color: Theme.of(context).appColors.foreground.withValues(alpha: 0.7))),
        actions: [
          TextButton(onPressed: () => Navigator.of(ctx).pop(false), child: Text(context.watch<LocaleProvider>().t('chat.media_cancel') ?? 'Отмена', style: TextStyle(color: Theme.of(context).appColors.foreground))),
          TextButton(onPressed: () => Navigator.of(ctx).pop(true), child: Text(context.watch<LocaleProvider>().t('calendar.delete') ?? 'Удалить', style: const TextStyle(color: Colors.red))),
        ],
      )
    );

    if (confirm == true) {
      try {
        await _supabase.from('chat_messages').delete().eq('id', id);
      } catch (e) {
        debugPrint(e.toString());
      }
    }
  }

  void _showImageFullScreen(String url, String tag) {
    Navigator.push(context, PageRouteBuilder(
      opaque: false,
      barrierColor: Colors.black.withValues(alpha: 0.9),
      pageBuilder: (context, _, __) {
        return Scaffold(
          backgroundColor: Colors.transparent,
          body: Center(
            child: Stack(
              alignment: Alignment.topRight,
              children: [
                GestureDetector(
                  onTap: () => Navigator.pop(context),
                  child: InteractiveViewer(
                    panEnabled: true,
                    minScale: 0.5,
                    maxScale: 4,
                    child: Hero(
                      tag: tag,
                      child: ClipRRect(
                        borderRadius: BorderRadius.circular(24),
                        child: Image.network(url, fit: BoxFit.contain, width: MediaQuery.of(context).size.width * 0.95, height: MediaQuery.of(context).size.height * 0.85),
                      ),
                    ),
                  ),
                ),
                Padding(
                  padding: const EdgeInsets.all(8.0),
                  child: GestureDetector(
                    onTap: () => Navigator.pop(context),
                    child: Container(
                      decoration: BoxDecoration(
                        color: Colors.black.withValues(alpha: 0.5),
                        shape: BoxShape.circle,
                      ),
                      padding: const EdgeInsets.all(8),
                      child: const Icon(LucideIcons.x, color: Colors.white, size: 20),
                    ),
                  ),
                ),
              ],
            ),
          ),
        );
      }
    ));
  }

  @override
  void dispose() {
    _messageController.dispose();
    _scrollController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Expanded(
          child: StreamBuilder<List<Map<String, dynamic>>>(
            stream: _supabase
                .from('chat_messages')
                .stream(primaryKey: ['id'])
                .eq('channel_type', widget.channelType)
                .eq('channel_id', widget.channelId)
                .order('created_at', ascending: false),
            builder: (context, snapshot) {
              if (snapshot.hasError) {
                return Center(child: Text(context.watch<LocaleProvider>().t('chat.media_error_load') ?? 'Ошибка загрузки', style: TextStyle(color: Theme.of(context).appColors.foreground.withValues(alpha: 0.54))));
              }
              if (!snapshot.hasData) {
                return Center(child: CircularProgressIndicator(color: Theme.of(context).primaryColor));
              }

              final messages = snapshot.data!;
              if (messages.isEmpty) {
                return Center(child: Text(context.watch<LocaleProvider>().t('chat.no_msgs') ?? 'Нет сообщений', style: TextStyle(color: Theme.of(context).appColors.foreground.withValues(alpha: 0.54))));
              }

              return ListView.builder(
                controller: _scrollController,
                reverse: true,
                padding: const EdgeInsets.all(16),
                itemCount: messages.length,
                itemBuilder: (context, index) {
                  final msg = messages[index];
                  final isMe = msg['author_id'] == AuthService.currentUser?.id;
                  return _buildMessageBubble(msg, isMe);
                },
              );
            },
          ),
        ),
        
        // Message Input matching screenshot
        Container(
          padding: const EdgeInsets.only(left: 16, right: 16, top: 12, bottom: 16),
          color: Theme.of(context).cardColor, 
          child: SafeArea(
            child: Row(
              children: [
                GestureDetector(
                  onTap: _openPhotoReport,
                  child: Icon(LucideIcons.camera, color: Theme.of(context).appColors.foreground.withValues(alpha: 0.7), size: 24),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Container(
                    decoration: BoxDecoration(
                      color: Theme.of(context).appColors.background, 
                      borderRadius: BorderRadius.circular(24),
                    ),
                    child: TextField(
                      controller: _messageController,
                      style: TextStyle(color: Theme.of(context).appColors.foreground, fontSize: 14),
                      decoration: InputDecoration(
                        hintText: context.watch<LocaleProvider>().t('chat.input_placeholder') ?? 'Сообщение...',
                        hintStyle: TextStyle(color: Theme.of(context).appColors.foreground.withValues(alpha: 0.38)),
                        border: InputBorder.none,
                        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                      ),
                      onSubmitted: (_) => _sendMessage(),
                    ),
                  ),
                ),
                const SizedBox(width: 12),
                GestureDetector(
                  onTap: _isSending ? null : _sendMessage,
                  child: Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: Theme.of(context).primaryColor, 
                      shape: BoxShape.circle,
                    ),
                    child: _isSending
                        ? SizedBox(width: 18, height: 18, child: CircularProgressIndicator(color: Theme.of(context).appColors.primaryForeground, strokeWidth: 2))
                        : Icon(LucideIcons.send, color: Theme.of(context).appColors.primaryForeground, size: 18),
                  ),
                )
              ],
            ),
          ),
        )
      ],
    );
  }

  Widget _buildMessageBubble(Map<String, dynamic> msg, bool isMe) {
    final authorName = TransliterationService.transliterateIfNeeded(msg['author_name'] as String? ?? '', context.read<LocaleProvider>().currentLang).isEmpty ? (context.watch<LocaleProvider>().t('chat.anon') ?? 'Аноним') : TransliterationService.transliterateIfNeeded(msg['author_name'] as String? ?? '', context.read<LocaleProvider>().currentLang); //context.watch<LocaleProvider>().t('chat.anon') ?? 'Аноним';
    final content = msg['content'] as String? ?? '';
    final createdAt = DateTime.tryParse(msg['created_at'].toString())?.toLocal() ?? DateTime.now();
    final timeString = '${createdAt.hour.toString().padLeft(2, '0')}:${createdAt.minute.toString().padLeft(2, '0')}';
    
    // Parse photo report
    final isPhotoReport = content.startsWith('[ФОТО_ОТЧЕТ]') || content.startsWith('[PHOTO_REPORT]');
    String? photoUrl;
    String displayContent = content;
    if (isPhotoReport) {
      final parts = content.replaceAll(RegExp(r'\[ФОТО_ОТЧЕТ\] |\[PHOTO_REPORT\] '), '').split(' | ');
      photoUrl = parts.isNotEmpty && parts[0].isNotEmpty ? parts[0] : null;
      if (photoUrl != null && !photoUrl.startsWith('http')) {
        photoUrl = _supabase.storage.from('photo-reports').getPublicUrl(photoUrl);
      }
      displayContent = content; 
    }

    final avatarUrl = _getAvatarUrl(msg['author_id'] as String?);

    return Padding(
      padding: const EdgeInsets.only(bottom: 16),
      child: Row(
        mainAxisAlignment: isMe ? MainAxisAlignment.end : MainAxisAlignment.start,
        crossAxisAlignment: CrossAxisAlignment.end,
        children: [
          if (!isMe) ...[
            CircleAvatar(
              radius: 16,
              backgroundColor: Theme.of(context).appColors.foreground.withValues(alpha: 0.12),
              backgroundImage: avatarUrl != null ? NetworkImage(avatarUrl) : null,
              child: avatarUrl == null ? Text(
                authorName.isNotEmpty ? authorName[0].toUpperCase() : 'U',
                style: GoogleFonts.inter(fontSize: 12, fontWeight: FontWeight.bold, color: Theme.of(context).appColors.foreground),
              ) : null,
            ),
            const SizedBox(width: 8),
          ],
          
          Flexible(
            child: Row(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                if (isMe || (widget.isSuperAdmin && isPhotoReport)) 
                   PopupMenuButton<String>(
                    icon: Icon(Icons.more_vert, color: Theme.of(context).appColors.foreground.withValues(alpha: 0.38), size: 16),
                    color: const Color(0xFF151515),
                    onSelected: (val) {
                      if (val == 'delete') {
                        _deleteMessage(msg['id'].toString());
                      } else if (val == 'edit') {
                        PhotoReportSheet.show(context, null, editingMessage: msg);
                      }
                    },
                    itemBuilder: (ctx) => [
                      if (widget.isSuperAdmin && isPhotoReport)
                        PopupMenuItem(
                          value: 'edit',
                          child: Row(
                            children: [
                              const Icon(LucideIcons.pencil, color: Colors.blue, size: 16),
                              const SizedBox(width: 8),
                              Text(ctx.read<LocaleProvider>().t('calendar.edit') ?? 'Редактировать', style: const TextStyle(color: Colors.blue)),
                            ],
                          ),
                        ),
                      PopupMenuItem(
                        value: 'delete',
                        child: Row(
                          children: [
                            const Icon(LucideIcons.trash_2, color: Colors.red, size: 16),
                            const SizedBox(width: 8),
                            Text(ctx.read<LocaleProvider>().t('calendar.delete') ?? 'Удалить', style: const TextStyle(color: Colors.red)),
                          ],
                        ),
                      )
                    ],
                  ),
                
                Flexible(
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                    decoration: BoxDecoration(
                      color: isMe ? Theme.of(context).primaryColor.withValues(alpha: 0.1) : Theme.of(context).cardColor,
                      borderRadius: BorderRadius.circular(16),
                      border: Border.all(color: Theme.of(context).appColors.border),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        if (!isMe)
                          Padding(
                            padding: const EdgeInsets.only(bottom: 4),
                            child: Text(
                              authorName,
                              style: GoogleFonts.inter(fontSize: 12, fontWeight: FontWeight.bold, color: Theme.of(context).appColors.foreground.withValues(alpha: 0.7)),
                            ),
                          ),
                        
                        if (isPhotoReport && photoUrl != null && photoUrl.startsWith('http')) ...[
                          GestureDetector(
                            onTap: () => _showImageFullScreen(photoUrl!, 'photo_${msg['id']}'),
                            child: Hero(
                              tag: 'photo_${msg['id']}',
                              child: ClipRRect(
                                borderRadius: BorderRadius.circular(8),
                                child: Image.network(photoUrl, fit: BoxFit.cover),
                              ),
                            ),
                          ),
                          const SizedBox(height: 8),
                        ],

                        Text(
                          displayContent,
                          style: GoogleFonts.inter(fontSize: 14, color: Theme.of(context).appColors.foreground),
                        ),
                        const SizedBox(height: 4),
                        Align(
                          alignment: Alignment.bottomRight,
                          child: Text(
                            timeString,
                            style: GoogleFonts.inter(fontSize: 10, color: Theme.of(context).appColors.foreground.withValues(alpha: 0.38)),
                          ),
                        ),
                      ],
                    ),
                  ),
                ),

                if (!isMe && widget.isSuperAdmin)
                  PopupMenuButton<String>(
                    icon: Icon(Icons.more_vert, color: Theme.of(context).appColors.foreground.withValues(alpha: 0.38), size: 16),
                    color: const Color(0xFF151515),
                    onSelected: (val) {
                      if (val == 'delete') _deleteMessage(msg['id'].toString());
                    },
                    itemBuilder: (ctx) => [
                      PopupMenuItem(
                        value: 'delete',
                        child: Row(
                          children: [
                            const Icon(LucideIcons.trash_2, color: Colors.red, size: 16),
                            const SizedBox(width: 8),
                            Text(ctx.read<LocaleProvider>().t('calendar.delete') ?? 'Удалить', style: const TextStyle(color: Colors.red)),
                          ],
                        ),
                      )
                    ],
                  ),
              ],
            ),
          ),
          
          if (isMe) const SizedBox(width: 8), // Gap for the right side
        ],
      ),
    );
  }

  String? _getAvatarUrl(String? userId) {
    if (userId == null) return null;
    try {
      final profile = widget.profiles.firstWhere((p) => p['id'] == userId);
      return profile['avatar_url'];
    } catch (e) {
      return null;
    }
  }
}
