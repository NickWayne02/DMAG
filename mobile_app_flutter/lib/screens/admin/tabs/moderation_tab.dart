import 'package:flutter/material.dart';
import '../../../utils/transliteration.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:flutter_lucide/flutter_lucide.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:provider/provider.dart';
import 'package:mobile_app_flutter/providers/locale_provider.dart';
import '../../../theme/app_theme.dart';


class ModerationTab extends StatefulWidget {
  const ModerationTab({super.key});

  @override
  State<ModerationTab> createState() => _ModerationTabState();
}

class _ModerationTabState extends State<ModerationTab> {
  final _supabase = Supabase.instance.client;
  List<Map<String, dynamic>> _messages = [];
  Map<String, String> _profiles = {};
  bool _isLoading = true;
  String? _selectedChatId;

  @override
  void initState() {
    super.initState();
    _loadMessages();
  }

  Future<void> _loadMessages() async {
    try {
      final res = await _supabase
          .from('chat_messages')
          .select('*')
          .inFilter('channel_type', ['general', 'direct'])
          .order('created_at', ascending: false)
          .limit(100);
          
      final profs = await _supabase.from('profiles').select('id, full_name');
      final Map<String, String> pMap = {};
      for (var p in profs) {
        pMap[p['id'].toString()] = p['full_name']?.toString() ?? 'Без имени';
      }

      if (mounted) {
        setState(() {
          _messages = List<Map<String, dynamic>>.from(res);
          _profiles = pMap;
          _isLoading = false;
        });
      }
    } catch (e) {
      debugPrint('Error loading moderation messages: $e');
      if (mounted) setState(() => _isLoading = false);
    }
  }

  Future<void> _deleteMessage(String id) async {
    final t = context.read<LocaleProvider>().t;
    final confirm = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: Theme.of(context).cardColor,
        title: Text('Удалить?', style: TextStyle(color: Theme.of(context).appColors.foreground)),
        content: Text('Удалить это сообщение навсегда?', style: TextStyle(color: Theme.of(context).appColors.foreground.withOpacity(0.7))),
        actions: [
          TextButton(onPressed: () => Navigator.of(ctx).pop(false), child: Text('Отмена', style: TextStyle(color: Theme.of(context).appColors.foreground))),
          TextButton(onPressed: () => Navigator.of(ctx).pop(true), child: const Text('Удалить', style: TextStyle(color: Colors.red))),
        ],
      ),
    );

    if (confirm != true) return;

    try {
      await _supabase.from('chat_messages').delete().eq('id', id);
      setState(() {
        _messages.removeWhere((m) => m['id'].toString() == id);
      });
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Сообщение удалено')));
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Ошибка удаления: $e')));
      }
    }
  }

  Future<void> _editMessage(Map<String, dynamic> msg) async {
    final textController = TextEditingController(text: msg['content']?.toString() ?? '');
    final newContent = await showDialog<String>(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: Theme.of(context).cardColor,
        title: Text('Редактировать сообщение', style: TextStyle(color: Theme.of(context).appColors.foreground)),
        content: TextField(
          controller: textController,
          maxLines: 5,
          style: TextStyle(color: Theme.of(context).appColors.foreground),
          decoration: InputDecoration(
            border: const OutlineInputBorder(),
            focusedBorder: OutlineInputBorder(borderSide: BorderSide(color: Theme.of(context).primaryColor)),
          ),
        ),
        actions: [
          TextButton(onPressed: () => Navigator.of(ctx).pop(null), child: Text('Отмена', style: TextStyle(color: Theme.of(context).appColors.foreground))),
          TextButton(onPressed: () => Navigator.of(ctx).pop(textController.text), child: const Text('Сохранить', style: TextStyle(color: Colors.blue))),
        ],
      ),
    );

    if (newContent == null || newContent == msg['content']) return;

    try {
      await _supabase.from('chat_messages').update({'content': newContent}).eq('id', msg['id']);
      setState(() {
        final idx = _messages.indexWhere((m) => m['id'] == msg['id']);
        if (idx != -1) {
          _messages[idx]['content'] = newContent;
        }
      });
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Сообщение обновлено')));
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Ошибка обновления: $e')));
      }
    }
  }

  Widget _buildContent(String content, AppColors colors) {
    if (content.contains('[ФОТО_ОТЧЕТ]') || content.contains('[PHOTO_REPORT]')) {
      String textToSplit = content;
      if (content.contains('[ФОТО_ОТЧЕТ]')) {
        textToSplit = content.substring(content.indexOf('[ФОТО_ОТЧЕТ]') + '[ФОТО_ОТЧЕТ]'.length).trim();
      } else if (content.contains('[PHOTO_REPORT]')) {
        textToSplit = content.substring(content.indexOf('[PHOTO_REPORT]') + '[PHOTO_REPORT]'.length).trim();
      }
      final parts = textToSplit.split(' | ');
      String photoUrl = parts.isNotEmpty ? parts[0] : '';
      String criticality = parts.length > 1 ? parts[1] : '';
      String desc = parts.length > 2 ? parts.sublist(2).join(' | ') : '';

      if (photoUrl.isNotEmpty && !photoUrl.startsWith('http')) {
        photoUrl = _supabase.storage.from('photo-reports').getPublicUrl(photoUrl);
      }

      return Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          if (photoUrl.isNotEmpty)
            Padding(
              padding: const EdgeInsets.symmetric(vertical: 8.0),
              child: ClipRRect(
                borderRadius: BorderRadius.circular(8),
                child: Image.network(
                  photoUrl,
                  height: 120,
                  width: 120,
                  fit: BoxFit.cover,
                  errorBuilder: (context, error, stackTrace) => const Icon(Icons.error),
                ),
              ),
            ),
          Row(
            children: [
              if (criticality.isNotEmpty)
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                  decoration: BoxDecoration(
                    color: colors.primary.withOpacity(0.2),
                    borderRadius: BorderRadius.circular(4),
                  ),
                  child: Text(criticality.toUpperCase(), style: GoogleFonts.inter(fontSize: 10, color: colors.primary, fontWeight: FontWeight.bold)),
                ),
              if (desc.isNotEmpty) ...[
                const SizedBox(width: 8),
                Expanded(child: Text(desc, style: GoogleFonts.inter(color: colors.foreground, fontSize: 14))),
              ]
            ],
          )
        ],
      );
    }
    return Text(content, style: GoogleFonts.inter(color: colors.foreground, fontSize: 14));
  }

  String _getChatName(String channelId) {
    if (!channelId.startsWith('dm_')) return channelId;
    final parts = channelId.replaceAll('dm_', '').split('_');
    if (parts.length >= 2) {
      final name1 = TransliterationService.transliterateIfNeeded(_profiles[parts[0]] ?? t('admin.moderation.unknown') ?? 'Неизвестный', context.read<LocaleProvider>().currentLang);
      final name2 = TransliterationService.transliterateIfNeeded(_profiles[parts[1]] ?? t('admin.moderation.unknown') ?? 'Неизвестный', context.read<LocaleProvider>().currentLang);
      return '$name1 ${t('admin.moderation.and') ?? 'и'} $name2';
    }
    return channelId;
  }

  Widget _buildList(String channelType, AppColors colors) {
    final filtered = _messages.where((m) => m['channel_type'] == channelType).toList();

    if (_isLoading) {
      return const Center(child: CircularProgressIndicator());
    }

    if (channelType == 'direct' && _selectedChatId == null) {
      final chatIds = filtered.map((m) => m['channel_id'].toString()).toSet().toList();
      
      if (chatIds.isEmpty) {
        return Center(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(LucideIcons.shield_check, size: 48, color: colors.foreground.withOpacity(0.2)),
              const SizedBox(height: 16),
              Text(t('admin.moderation.no_direct_chats') ?? 'Нет активных личных чатов', style: GoogleFonts.inter(color: Colors.white.withValues(alpha: 0.5))),
            ],
          ),
        );
      }

      return ListView.separated(
        padding: const EdgeInsets.all(24),
        itemCount: chatIds.length,
        separatorBuilder: (context, index) => const SizedBox(height: 12),
        itemBuilder: (context, index) {
          final chatId = chatIds[index];
          final lastMsg = filtered.firstWhere((m) => m['channel_id'].toString() == chatId);
          
          return InkWell(
            onTap: () {
              setState(() {
                _selectedChatId = chatId;
              });
            },
            borderRadius: BorderRadius.circular(12),
            child: Container(
              decoration: BoxDecoration(
                color: colors.card,
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: colors.foreground.withOpacity(0.05)),
              ),
              padding: const EdgeInsets.all(16),
              child: Row(
                children: [
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(_getChatName(chatId), style: GoogleFonts.inter(fontWeight: FontWeight.bold, color: colors.foreground)),
                        const SizedBox(height: 4),
                        Text(
                          lastMsg['content']?.toString() ?? '',
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: GoogleFonts.inter(color: colors.foreground.withOpacity(0.7), fontSize: 12),
                        ),
                      ],
                    ),
                  ),
                  Icon(LucideIcons.chevron_right, color: colors.foreground.withOpacity(0.3), size: 20),
                ],
              ),
            ),
          );
        },
      );
    }

    List<Map<String, dynamic>> messagesToShow = filtered;
    if (channelType == 'direct' && _selectedChatId != null) {
      messagesToShow = filtered.where((m) => m['channel_id'].toString() == _selectedChatId).toList();
    }

    if (messagesToShow.isEmpty) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(LucideIcons.shield_check, size: 48, color: colors.foreground.withOpacity(0.2)),
            const SizedBox(height: 16),
            Text(t('admin.moderation.no_messages') ?? 'Нет сообщений в этой категории', style: GoogleFonts.inter(color: Colors.white.withValues(alpha: 0.5))),
            if (_selectedChatId != null)
              TextButton(
                onPressed: () => setState(() => _selectedChatId = null),
                child: Text(t('admin.moderation.back') ?? 'Назад'),
              ),
          ],
        ),
      );
    }

    Widget listWidget = ListView.separated(
      padding: const EdgeInsets.all(24),
      itemCount: messagesToShow.length,
      separatorBuilder: (context, index) => const SizedBox(height: 12),
      itemBuilder: (context, index) {
        final msg = messagesToShow[index];
        final authorName = TransliterationService.transliterateIfNeeded(msg['author_name']?.toString() ?? t('admin.moderation.unknown') ?? 'Неизвестный', context.read<LocaleProvider>().currentLang);
        
        return Container(
          decoration: BoxDecoration(
            color: colors.card,
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: colors.foreground.withOpacity(0.05)),
          ),
          padding: const EdgeInsets.all(16),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Text(authorName, style: GoogleFonts.inter(fontWeight: FontWeight.bold, color: colors.foreground)),
                        if (channelType == 'direct') ...[
                          const SizedBox(width: 8),
                          Flexible(
                            child: Container(
                              padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                              decoration: BoxDecoration(
                                color: colors.foreground.withOpacity(0.05),
                                borderRadius: BorderRadius.circular(4),
                                border: Border.all(color: colors.foreground.withOpacity(0.1)),
                              ),
                              child: Text('${t('admin.moderation.chat') ?? 'Чат'}: ${_getChatName(msg['channel_id'].toString())}', overflow: TextOverflow.ellipsis, style: GoogleFonts.inter(fontSize: 10, color: colors.foreground.withOpacity(0.7))),
                            ),
                          ),
                        ]
                      ],
                    ),
                    const SizedBox(height: 8),
                    _buildContent(msg['content']?.toString() ?? '', colors),
                  ],
                ),
              ),
              Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  IconButton(
                    icon: const Icon(LucideIcons.pencil, color: Colors.blue, size: 20),
                    onPressed: () => _editMessage(msg),
                    tooltip: t('admin.moderation.edit') ?? 'Редактировать',
                  ),
                  IconButton(
                    icon: const Icon(LucideIcons.trash_2, color: Colors.red, size: 20),
                    onPressed: () => _deleteMessage(msg['id'].toString()),
                    tooltip: t('admin.moderation.delete') ?? 'Удалить',
                  ),
                ],
              ),
            ],
          ),
        );
      },
    );

    if (channelType == 'direct' && _selectedChatId != null) {
      return Column(
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(24, 16, 24, 0),
            child: Row(
              children: [
                IconButton(
                  icon: Icon(LucideIcons.arrow_left, color: colors.foreground),
                  onPressed: () => setState(() => _selectedChatId = null),
                ),
                Expanded(
                  child: Text(_getChatName(_selectedChatId!), style: GoogleFonts.inter(fontWeight: FontWeight.bold, color: colors.foreground, fontSize: 16)),
                ),
              ],
            ),
          ),
          Expanded(child: listWidget),
        ],
      );
    }

    return listWidget;
  }

  @override
  Widget build(BuildContext context) {
    final colors = Theme.of(context).appColors;
    final t = context.read<LocaleProvider>().t;
    
    return DefaultTabController(
      length: 2,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(24, 24, 24, 0),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(t('admin.moderation.title') ?? 'Модерация', style: GoogleFonts.inter(fontSize: 24, fontWeight: FontWeight.w700, color: Colors.white, height: 1.1)),
                const SizedBox(height: 4),
                Text(t('admin.moderation.desc') ?? 'Управление сообщениями в Общем и Личных чатах', style: GoogleFonts.inter(fontSize: 14, color: Colors.white.withValues(alpha: 0.7))),
              ],
            ),
          ),
          TabBar(
            labelColor: colors.primary,
            unselectedLabelColor: colors.foreground.withOpacity(0.5),
            indicatorColor: colors.primary,
            onTap: (index) {
              if (index == 1) {
                setState(() => _selectedChatId = null);
              }
            },
            tabs: [
              Tab(text: t('admin.moderation.general') ?? 'Общий чат'),
              Tab(text: t('admin.moderation.direct') ?? 'Личные чаты'),
            ],
          ),
          Expanded(
            child: TabBarView(
              children: [
                _buildList('general', colors),
                _buildList('direct', colors),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
