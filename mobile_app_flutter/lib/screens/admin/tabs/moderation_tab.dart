import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:flutter_lucide/flutter_lucide.dart';
import 'dart:typed_data';
import '../../image_editor_screen.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../../../widgets/translated_message.dart';
import 'package:provider/provider.dart';
import 'package:mobile_app_flutter/providers/locale_provider.dart';
import '../../../theme/app_theme.dart';

class ModerationTab extends StatefulWidget {
  const ModerationTab({super.key});

  @override
  State<ModerationTab> createState() => _ModerationTabState();
}

class _ModerationTabState extends State<ModerationTab> with SingleTickerProviderStateMixin {
  final _supabase = Supabase.instance.client;
  List<Map<String, dynamic>> _messages = [];
  Map<String, String> _profiles = {};
  bool _isLoading = true;
  String? _selectedChatId;
  
  // New State variables
  late TabController _tabController;
  final Set<String> _selectedIds = {};
  String _searchQuery = '';
  int _limit = 100;

  String? t(String key) => context.watch<LocaleProvider>().t(key);

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 3, vsync: this);
    _tabController.addListener(() {
      if (!_tabController.indexIsChanging) {
        setState(() {
          _selectedChatId = null;
          _selectedIds.clear();
          _searchQuery = '';
        });
      }
    });
    _loadMessages();
  }
  
  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  Future<void> _loadMessages() async {
    setState(() => _isLoading = true);
    try {
      final res = await _supabase
          .from('chat_messages')
          .select('*')
          .inFilter('channel_type', ['general', 'direct', 'site'])
          .order('created_at', ascending: false)
          .limit(_limit);
          
      final profs = await _supabase.from('profiles').select('id, full_name');
      final Map<String, String> pMap = {};
      for (var p in profs) {
        pMap[p['id'].toString()] = p['full_name']?.toString() ?? 'Без имени';
      }
      final sitesReq = await _supabase.from('sites').select('id, name');
      for (var s in sitesReq) {
        pMap[s['id'].toString()] = s['name']?.toString() ?? 'Объект';
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
    final confirm = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: Theme.of(context).cardColor,
        title: Text('Удалить?', style: TextStyle(color: Theme.of(context).appColors.foreground)),
        content: Text('Удалить это сообщение навсегда?', style: TextStyle(color: Theme.of(context).appColors.foreground.withValues(alpha: 0.7))),
        actions: [
          TextButton(onPressed: () => Navigator.of(ctx).pop(false), child: Text(context.read<LocaleProvider>().t('admin.sites.dlgCancel') ?? 'Отмена', style: TextStyle(color: Theme.of(context).appColors.foreground))),
          TextButton(onPressed: () => Navigator.of(ctx).pop(true), child: const Text('Удалить', style: TextStyle(color: Colors.red))),
        ],
      ),
    );

    if (confirm != true) return;

    try {
      await _supabase.from('chat_messages').delete().eq('id', id);
      setState(() {
        _messages.removeWhere((m) => m['id'].toString() == id);
        _selectedIds.remove(id);
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
  
  Future<void> _bulkDelete() async {
    if (_selectedIds.isEmpty) return;
    
    final confirm = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: Theme.of(context).cardColor,
        title: Text('Удалить ${_selectedIds.length} сообщений?', style: TextStyle(color: Theme.of(context).appColors.foreground)),
        actions: [
          TextButton(onPressed: () => Navigator.of(ctx).pop(false), child: Text('Отмена', style: TextStyle(color: Theme.of(context).appColors.foreground))),
          TextButton(onPressed: () => Navigator.of(ctx).pop(true), child: const Text('Удалить', style: TextStyle(color: Colors.red))),
        ],
      ),
    );

    if (confirm != true) return;
    
    setState(() => _isLoading = true);
    try {
      await _supabase.from('chat_messages').delete().inFilter('id', _selectedIds.toList());
      _selectedIds.clear();
      await _loadMessages();
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Сообщения удалены')));
      }
    } catch (e) {
      if (mounted) {
        setState(() => _isLoading = false);
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Ошибка удаления: $e')));
      }
    }
  }

  Future<void> _editMessage(Map<String, dynamic> msg) async {
    final rawContent = msg['content']?.toString() ?? '';
    final isPhotoReport = rawContent.contains('[PHOTO_REPORT]') || rawContent.contains('[ФОТО_ОТЧЕТ]');
    
    if (isPhotoReport) {
      String textToSplit = rawContent;
      if (rawContent.contains('[ФОТО_ОТЧЕТ]')) {
        textToSplit = rawContent.substring(rawContent.indexOf('[ФОТО_ОТЧЕТ]') + '[ФОТО_ОТЧЕТ]'.length).trim();
      } else if (rawContent.contains('[PHOTO_REPORT]')) {
        textToSplit = rawContent.substring(rawContent.indexOf('[PHOTO_REPORT]') + '[PHOTO_REPORT]'.length).trim();
      }
      final parts = textToSplit.split(' | ');
      String? photoUrl = parts.isNotEmpty && parts[0].isNotEmpty ? parts[0] : null;
      if (photoUrl != null && !photoUrl.startsWith('http')) {
        photoUrl = _supabase.storage.from('photo-reports').getPublicUrl(photoUrl);
      }
      
      String description = parts.length >= 3 ? parts.sublist(2).join(' | ') : '';
      final textController = TextEditingController(text: description);
      Uint8List? newImageBytes;

      final result = await showDialog<String>(
        context: context,
        builder: (ctx) => StatefulBuilder(
          builder: (context, setDialogState) {
            return AlertDialog(
              backgroundColor: Theme.of(context).cardColor,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
              title: Text(context.read<LocaleProvider>().t('admin.moderation.edit_message') ?? 'Редактировать сообщение', style: TextStyle(color: Theme.of(context).appColors.foreground, fontWeight: FontWeight.w600)),
              content: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  if (newImageBytes != null)
                    ClipRRect(
                      borderRadius: BorderRadius.circular(12),
                      child: Image.memory(newImageBytes!, fit: BoxFit.contain, height: 200, width: double.infinity),
                    )
                  else if (photoUrl != null)
                    ClipRRect(
                      borderRadius: BorderRadius.circular(12),
                      child: Image.network(photoUrl, fit: BoxFit.contain, height: 200, width: double.infinity),
                    ),
                  const SizedBox(height: 12),
                  Row(
                    children: [
                      Expanded(
                        child: OutlinedButton.icon(
                          icon: Icon(LucideIcons.pencil, size: 16, color: Theme.of(context).appColors.foreground),
                          label: Text(context.read<LocaleProvider>().t('admin.reports.draw') ?? 'Рисовать', style: TextStyle(color: Theme.of(context).appColors.foreground)),
                          onPressed: () async {
                            if (photoUrl == null && newImageBytes == null) return;
                            final bytes = await Navigator.push<Uint8List?>(
                              context,
                              MaterialPageRoute(
                                builder: (_) => ImageEditorScreen(
                                  imageUrl: newImageBytes == null ? photoUrl : null,
                                  imageBytes: newImageBytes,
                                ),
                              ),
                            );
                            if (bytes != null) {
                              setDialogState(() => newImageBytes = bytes);
                            }
                          },
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 12),
                  TextField(
                    controller: textController,
                    maxLines: 3,
                    style: TextStyle(color: Theme.of(context).appColors.foreground),
                    decoration: InputDecoration(
                      filled: true,
                      fillColor: Theme.of(context).appColors.foreground.withValues(alpha: 0.05),
                      border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide.none),
                    ),
                  ),
                ],
              ),
              actions: [
                TextButton(onPressed: () => Navigator.pop(context), child: Text(context.read<LocaleProvider>().t('admin.sites.dlgCancel') ?? 'Отмена', style: TextStyle(color: Theme.of(context).appColors.foreground))),
                TextButton(
                  onPressed: () async {
                    if (newImageBytes != null) {
                      try {
                        final fileName = '${DateTime.now().millisecondsSinceEpoch}_${msg['id']}.png';
                        await _supabase.storage.from('photo-reports').uploadBinary(fileName, newImageBytes!);
                        final savedUrl = _supabase.storage.from('photo-reports').getPublicUrl(fileName);
                        Navigator.pop(context, '[PHOTO_REPORT] $savedUrl | info | ${textController.text}');
                      } catch (e) {
                        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Ошибка: $e')));
                      }
                    } else {
                      final p = parts.isNotEmpty ? parts[0] : '';
                      final info = parts.length > 1 ? parts[1] : 'info';
                      Navigator.pop(context, '[PHOTO_REPORT] $p | $info | ${textController.text}');
                    }
                  },
                  child: Text(context.read<LocaleProvider>().t('admin.sites.dlgSave') ?? 'Сохранить'),
                ),
              ],
            );
          },
        ),
      );

      if (result != null && result != rawContent) {
        try {
          await _supabase.from('chat_messages').update({'content': result}).eq('id', msg['id']);
          setState(() {
            final idx = _messages.indexWhere((m) => m['id'] == msg['id']);
            if (idx != -1) {
              _messages[idx]['content'] = result;
            }
          });
        } catch (e) {
          if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Error: $e')));
        }
      }
      return;
    }

    final textController = TextEditingController(text: rawContent);
    final newContent = await showDialog<String>(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: Theme.of(context).cardColor,
        title: Text(context.read<LocaleProvider>().t('admin.moderation.edit_message') ?? 'Редактировать сообщение', style: TextStyle(color: Theme.of(context).appColors.foreground)),
        content: TextField(
          controller: textController,
          maxLines: 5,
          style: TextStyle(color: Theme.of(context).appColors.foreground),
          decoration: InputDecoration(
            filled: true,
            fillColor: Theme.of(context).appColors.foreground.withValues(alpha: 0.05),
            border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide.none),
          ),
        ),
        actions: [
          TextButton(onPressed: () => Navigator.of(ctx).pop(null), child: Text(context.read<LocaleProvider>().t('admin.sites.dlgCancel') ?? 'Отмена', style: TextStyle(color: Theme.of(context).appColors.foreground))),
          TextButton(onPressed: () => Navigator.of(ctx).pop(textController.text), child: Text(context.read<LocaleProvider>().t('admin.sites.dlgSave') ?? 'Сохранить', style: TextStyle(color: Colors.blue))),
        ],
      ),
    );

    if (newContent == null || newContent == rawContent) return;

    try {
      await _supabase.from('chat_messages').update({'content': newContent}).eq('id', msg['id']);
      setState(() {
        final idx = _messages.indexWhere((m) => m['id'] == msg['id']);
        if (idx != -1) {
          _messages[idx]['content'] = newContent;
        }
      });
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Message updated')));
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Error: $e')));
      }
    }
  }

  void _showImageDialog(String url) {
    showDialog(
      context: context,
      builder: (context) => Dialog(
        backgroundColor: Colors.transparent,
        child: Stack(
          alignment: Alignment.center,
          children: [
            InteractiveViewer(
              child: Image.network(url, fit: BoxFit.contain),
            ),
            Positioned(
              top: 10,
              right: 10,
              child: IconButton(
                icon: const Icon(Icons.close, color: Colors.white, size: 30),
                onPressed: () => Navigator.of(context).pop(),
              ),
            )
          ],
        ),
      )
    );
  }

  Widget _buildContent(Map<String, dynamic> msg, AppColors colors) {
    final content = msg['content']?.toString() ?? '';
    Widget mainWidget;
    String displayContent = content;
    bool isPhotoReport = false;

    if (content.contains('[ФОТО_ОТЧЕТ]') || content.contains('[PHOTO_REPORT]')) {
      isPhotoReport = true;
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
      displayContent = desc;

      if (photoUrl.isNotEmpty && !photoUrl.startsWith('http')) {
        photoUrl = _supabase.storage.from('photo-reports').getPublicUrl(photoUrl);
      }
      
      String critLang = criticality.toUpperCase();
      if (criticality.toLowerCase() == 'info') critLang = t('crit.info') ?? 'ИНФОРМАЦИЯ';
      if (criticality.toLowerCase() == 'important') critLang = t('crit.important') ?? 'ВАЖНО';
      if (criticality.toLowerCase() == 'urgent') critLang = t('crit.urgent') ?? 'СРОЧНО';

      mainWidget = Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          if (photoUrl.isNotEmpty)
            GestureDetector(
              onTap: () => _showImageDialog(photoUrl),
              child: Padding(
                padding: const EdgeInsets.only(right: 12.0),
                child: ClipRRect(
                  borderRadius: BorderRadius.circular(8),
                  child: Stack(
                    alignment: Alignment.center,
                    children: [
                      Image.network(
                        photoUrl,
                        height: 80,
                        width: 80,
                        fit: BoxFit.cover,
                        errorBuilder: (context, error, stackTrace) => Container(
                          height: 80, width: 80, color: Colors.grey.withValues(alpha: 0.3), child: const Icon(Icons.error)
                        ),
                      ),
                      Container(
                        height: 80, width: 80,
                        color: Colors.black26,
                        child: const Icon(LucideIcons.maximize_2, color: Colors.white, size: 24),
                      )
                    ],
                  )
                ),
              ),
            ),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                if (criticality.isNotEmpty)
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                    margin: const EdgeInsets.only(bottom: 4),
                    decoration: BoxDecoration(
                      color: colors.primary.withValues(alpha: 0.2),
                      borderRadius: BorderRadius.circular(4),
                    ),
                    child: Text(critLang, style: GoogleFonts.inter(fontSize: 10, color: colors.primary, fontWeight: FontWeight.bold)),
                  ),
                if (desc.isNotEmpty) 
                  Text(desc, style: GoogleFonts.inter(color: colors.foreground, fontSize: 14)),
              ],
            ),
          )
        ],
      );
    } else {
      mainWidget = Text(content, style: GoogleFonts.inter(color: colors.foreground, fontSize: 14));
    }

    final sourceLang = msg['source_lang']?.toString();
    final targetLang = Provider.of<LocaleProvider>(context).currentLang;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        mainWidget,
        if (sourceLang != null && sourceLang != targetLang) ...[
          const SizedBox(height: 6),
          Container(
            padding: const EdgeInsets.only(left: 8),
            decoration: BoxDecoration(border: Border(left: BorderSide(color: colors.border, width: 2))),
            child: TranslatedMessageContent(
              id: msg['id'].toString(),
              content: displayContent,
              sourceLang: sourceLang,
              targetLang: targetLang,
              isMine: false,
              isPhotoReport: isPhotoReport,
              translatingText: t('chat.translating') ?? 'Перевод...',
            ),
          )
        ]
      ],
    );
  }

  String _getChatName(String channelId) {
    if (_profiles.containsKey(channelId)) return _profiles[channelId]!;
    if (!channelId.startsWith('dm_')) return channelId;
    final parts = channelId.replaceFirst('dm_', '').split('_');
    if (parts.length >= 2) {
      final name1 = _profiles[parts[0]] ?? 'Неизвестный';
      final name2 = _profiles[parts[1]] ?? 'Неизвестный';
      return '$name1 и $name2';
    }
    return channelId;
  }

  Widget _buildMessageList(String filterType) {
    final colors = Theme.of(context).appColors;
    List<Map<String, dynamic>> filtered = _messages.where((m) => m['channel_type'] == filterType).toList();

    if (_searchQuery.isNotEmpty) {
      final q = _searchQuery.toLowerCase();
      filtered = filtered.where((m) {
        final content = (m['content']?.toString() ?? '').toLowerCase();
        final author = (m['author_name']?.toString() ?? '').toLowerCase();
        return content.contains(q) || author.contains(q);
      }).toList();
    }

    if (_isLoading && _messages.isEmpty) {
      return Center(child: CircularProgressIndicator(color: colors.primary));
    }

    if ((filterType == 'direct' || filterType == 'site') && _selectedChatId == null) {
      final chatIds = filtered.map((m) => m['channel_id'].toString()).toSet().toList();
      if (chatIds.isEmpty) {
        return Center(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(LucideIcons.message_square, size: 48, color: colors.foreground.withValues(alpha: 0.2)),
              const SizedBox(height: 16),
              Text(filterType == 'direct' ? 'Нет личных сообщений' : 'Нет сообщений объектов', style: GoogleFonts.inter(color: colors.foreground.withValues(alpha: 0.5))),
            ],
          ),
        );
      }

      return ListView.builder(
        padding: const EdgeInsets.all(16),
        itemCount: chatIds.length,
        itemBuilder: (ctx, i) {
          final chatId = chatIds[i];
          final chatMessages = filtered.where((m) => m['channel_id'] == chatId).toList();
          final lastMsg = chatMessages.isNotEmpty ? chatMessages.first : null;
          
          String preview = lastMsg?['content']?.toString() ?? '';
          if (preview.contains('[PHOTO_REPORT]') || preview.contains('[ФОТО_ОТЧЕТ]')) {
             preview = '📷 Фотоотчет';
          }

          return Container(
            margin: const EdgeInsets.only(bottom: 8),
            decoration: BoxDecoration(
              color: colors.card,
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: colors.border),
            ),
            child: ListTile(
              title: Text(_getChatName(chatId), style: GoogleFonts.inter(color: colors.foreground, fontWeight: FontWeight.w600, fontSize: 14)),
              subtitle: Text(
                '$preview', 
                maxLines: 1, 
                overflow: TextOverflow.ellipsis,
                style: GoogleFonts.inter(color: colors.foreground.withValues(alpha: 0.6), fontSize: 12)
              ),
              trailing: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                    decoration: BoxDecoration(color: colors.background, borderRadius: BorderRadius.circular(12)),
                    child: Text('${chatMessages.length}', style: TextStyle(color: colors.foreground, fontSize: 11)),
                  ),
                  const SizedBox(width: 8),
                  Icon(LucideIcons.chevron_right, color: colors.foreground.withValues(alpha: 0.5), size: 16),
                ],
              ),
              onTap: () {
                setState(() {
                  _selectedChatId = chatId;
                  _searchQuery = '';
                });
              },
            ),
          );
        },
      );
    }

    if ((filterType == 'direct' || filterType == 'site') && _selectedChatId != null) {
      filtered = filtered.where((m) => m['channel_id'] == _selectedChatId).toList();
    }

    if (filtered.isEmpty) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(LucideIcons.message_square, size: 48, color: colors.foreground.withValues(alpha: 0.2)),
            const SizedBox(height: 16),
            Text('Ничего не найдено', style: GoogleFonts.inter(color: colors.foreground.withValues(alpha: 0.5))),
          ],
        ),
      );
    }

    bool allSelected = filtered.isNotEmpty && filtered.every((m) => _selectedIds.contains(m['id'].toString()));

    return Column(
      children: [
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
          child: Row(
            children: [
              if ((filterType == 'direct' || filterType == 'site') && _selectedChatId != null)
                IconButton(
                  icon: Icon(LucideIcons.arrow_left, color: colors.foreground),
                  onPressed: () => setState(() => _selectedChatId = null),
                ),
              Expanded(
                child: Container(
                  height: 40,
                  decoration: BoxDecoration(
                    color: colors.background,
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: colors.border),
                  ),
                  child: TextField(
                    style: TextStyle(color: colors.foreground, fontSize: 14),
                    decoration: InputDecoration(
                      hintText: context.watch<LocaleProvider>().t('reports.search') ?? 'Поиск...',
                      hintStyle: TextStyle(color: colors.foreground.withValues(alpha: 0.5)),
                      prefixIcon: Icon(LucideIcons.search, size: 16, color: colors.foreground.withValues(alpha: 0.5)),
                      border: InputBorder.none,
                      contentPadding: const EdgeInsets.only(top: 8),
                    ),
                    onChanged: (v) => setState(() => _searchQuery = v),
                  ),
                ),
              ),
            ],
          ),
        ),
        
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 4),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              if (_selectedIds.isNotEmpty)
                ElevatedButton.icon(
                  onPressed: _bulkDelete,
                  icon: const Icon(LucideIcons.trash_2, size: 16, color: Colors.white),
                  label: Text('Удалить (${_selectedIds.length})', style: const TextStyle(color: Colors.white)),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: Colors.red,
                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 0),
                    minimumSize: const Size(0, 32)
                  ),
                )
              else 
                const SizedBox(),
              
              Row(
                children: [
                  Text(context.watch<LocaleProvider>().t('admin.moderation.select_all') ?? 'Выбрать все', style: GoogleFonts.inter(color: colors.foreground, fontSize: 12)),
                  Checkbox(
                    value: allSelected,
                    activeColor: colors.primary,
                    onChanged: (val) {
                      setState(() {
                        if (val == true) {
                          _selectedIds.addAll(filtered.map((m) => m['id'].toString()));
                        } else {
                          _selectedIds.removeAll(filtered.map((m) => m['id'].toString()));
                        }
                      });
                    },
                  ),
                ],
              )
            ],
          ),
        ),
        
        Expanded(
          child: ListView.builder(
            padding: const EdgeInsets.all(16),
            itemCount: filtered.length + 1,
            itemBuilder: (ctx, i) {
              if (i == filtered.length) {
                if (filtered.length >= _limit) {
                  return Padding(
                    padding: const EdgeInsets.symmetric(vertical: 16),
                    child: Center(
                      child: TextButton(
                        onPressed: () {
                          setState(() => _limit += 50);
                          _loadMessages();
                        },
                        child: Text('Загрузить еще', style: TextStyle(color: colors.primary)),
                      ),
                    ),
                  );
                }
                return const SizedBox(height: 32);
              }

              final msg = filtered[i];
              final id = msg['id'].toString();
              final isSelected = _selectedIds.contains(id);

              return Container(
                margin: const EdgeInsets.only(bottom: 12),
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: isSelected ? colors.primary.withValues(alpha: 0.05) : colors.card,
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: isSelected ? colors.primary.withValues(alpha: 0.3) : colors.border),
                ),
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Checkbox(
                      value: isSelected,
                      activeColor: colors.primary,
                      onChanged: (val) {
                        setState(() {
                          if (val == true) _selectedIds.add(id);
                          else _selectedIds.remove(id);
                        });
                      },
                    ),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            children: [
                              Expanded(
                                child: Text(
                                  msg['author_name']?.toString() ?? 'Без имени',
                                  style: GoogleFonts.inter(color: colors.foreground, fontWeight: FontWeight.w600, fontSize: 13),
                                ),
                              ),
                              if (msg['created_at'] != null)
                                Text(
                                  msg['created_at'].toString().substring(0, 16).replaceAll('T', ' '),
                                  style: GoogleFonts.inter(color: colors.foreground.withValues(alpha: 0.5), fontSize: 11),
                                ),
                            ],
                          ),
                          if ((filterType == 'direct' || filterType == 'site') && _selectedChatId == null) ...[
                            const SizedBox(height: 4),
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                              decoration: BoxDecoration(
                                color: colors.background,
                                borderRadius: BorderRadius.circular(4),
                                border: Border.all(color: colors.border)
                              ),
                              child: Text("Чат: ${_getChatName(msg['channel_id'].toString())}", style: TextStyle(color: colors.foreground.withValues(alpha: 0.6), fontSize: 10)),
                            )
                          ],
                          const SizedBox(height: 8),
                          _buildContent(msg, colors),
                          const SizedBox(height: 8),
                          Row(
                            mainAxisAlignment: MainAxisAlignment.end,
                            children: [
                              IconButton(
                                icon: const Icon(LucideIcons.pencil, size: 14, color: Colors.blue),
                                onPressed: () => _editMessage(msg),
                                padding: EdgeInsets.zero,
                                constraints: const BoxConstraints(),
                              ),
                              const SizedBox(width: 16),
                              IconButton(
                                icon: const Icon(LucideIcons.trash_2, size: 14, color: Colors.red),
                                onPressed: () => _deleteMessage(id),
                                padding: EdgeInsets.zero,
                                constraints: const BoxConstraints(),
                              ),
                            ],
                          )
                        ],
                      ),
                    ),
                  ],
                ),
              );
            },
          ),
        ),
      ],
    );
  }

  @override
  Widget build(BuildContext context) {
    final colors = Theme.of(context).appColors;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(t('admin.moderation.title') ?? 'Модерация', style: GoogleFonts.inter(fontSize: 24, fontWeight: FontWeight.bold, color: colors.foreground)),
              const SizedBox(height: 4),
              Text(t('admin.moderation.desc') ?? 'Управление сообщениями в чатах', style: GoogleFonts.inter(fontSize: 14, color: colors.foreground.withValues(alpha: 0.6))),
            ],
          ),
        ),
        
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 24),
          child: Container(
            height: 44,
            decoration: BoxDecoration(
              color: colors.background,
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: colors.border),
            ),
            child: TabBar(
              controller: _tabController,
              indicator: BoxDecoration(
                color: colors.card,
                borderRadius: BorderRadius.circular(10),
                border: Border.all(color: colors.border),
              ),
              indicatorSize: TabBarIndicatorSize.tab,
              labelColor: colors.foreground,
              unselectedLabelColor: colors.foreground.withValues(alpha: 0.5),
              padding: const EdgeInsets.all(4),
              tabs: [
                Tab(text: context.watch<LocaleProvider>().t('chat.general_channel') ?? 'Общий чат'),
                Tab(text: context.watch<LocaleProvider>().t('chat.private_chats') ?? 'Личные чаты'),
                Tab(text: context.watch<LocaleProvider>().t('chat.objects') ?? 'Объекты'),
              ],
            ),
          ),
        ),
        const SizedBox(height: 16),
        
        Expanded(
          child: TabBarView(
            controller: _tabController,
            children: [
              _buildMessageList('general'),
              _buildMessageList('direct'),
              _buildMessageList('site'),
            ],
          ),
        ),
      ],
    );
  }
}
