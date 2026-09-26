import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:flutter_lucide/flutter_lucide.dart';
import 'package:provider/provider.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../../../theme/app_theme.dart';
import 'package:mobile_app_flutter/providers/locale_provider.dart';
import 'package:image_picker/image_picker.dart';
import 'dart:typed_data';
import 'package:pro_image_editor/pro_image_editor.dart';
import '../../image_editor_screen.dart';
import '../../../utils/transliteration.dart';

class ReportsTab extends StatefulWidget {
  const ReportsTab({super.key});

  @override
  State<ReportsTab> createState() => _ReportsTabState();
}

class _ReportsTabState extends State<ReportsTab> {
  String _selectedSiteId = 'all';
  String _selectedTime = 'all';
  String _searchQuery = '';
  
  List<Map<String, dynamic>> _reports = [];
  List<Map<String, dynamic>> _sites = [];
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _fetchSites();
    _fetchReports();
  }

  Future<void> _fetchSites() async {
    try {
      final res = await Supabase.instance.client.from('sites').select('id, name');
      final List<Map<String, dynamic>> loadedSites = List<Map<String, dynamic>>.from(res);
      
      // Sort alphabetically by transliterated name
      loadedSites.sort((a, b) {
        final nameA = TransliterationService.transliterateIfNeeded(a['name'] ?? '', 'ru');
        final nameB = TransliterationService.transliterateIfNeeded(b['name'] ?? '', 'ru');
        return nameA.compareTo(nameB);
      });
      
      if (mounted) setState(() => _sites = loadedSites);
    } catch (_) {}
  }

  Future<void> _fetchReports() async {
    setState(() => _isLoading = true);
    try {
      var query = Supabase.instance.client
          .from('photo_reports')
          .select('id, description, criticality, photo_url, created_at, site_id');

      if (_selectedSiteId == 'general_chat') {
        query = query.isFilter('site_id', null);
      } else if (_selectedSiteId != 'all') {
        query = query.eq('site_id', _selectedSiteId);
      }
      
      if (_searchQuery.isNotEmpty) {
        query = query.ilike('description', '%$_searchQuery%');
      }

      if (_selectedTime == 'today') {
        final d = DateTime.now();
        final today = DateTime(d.year, d.month, d.day);
        query = query.gte('created_at', today.toIso8601String());
      } else if (_selectedTime == 'week') {
        final d = DateTime.now().subtract(const Duration(days: 7));
        query = query.gte('created_at', d.toIso8601String());
      }

      final res = await query.order('created_at', ascending: false).limit(50);
      
      if (mounted) {
        setState(() {
          _reports = List<Map<String, dynamic>>.from(res);
          _isLoading = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() => _isLoading = false);
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Ошибка: $e')));
      }
    }
  }

  void _editReport(Map<String, dynamic> report) {
    final controller = TextEditingController(text: report['description'] ?? '');
    final photoUrl = report['photo_url'];
    final imageUrl = photoUrl != null && photoUrl.toString().isNotEmpty
        ? Supabase.instance.client.storage.from('photo-reports').getPublicUrl(photoUrl)
        : null;

    Uint8List? newImageBytes;
    String? newImageExt;

    showDialog(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (context, setDialogState) {
          return AlertDialog(
            backgroundColor: Theme.of(context).cardColor,
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
            title: Text(context.read<LocaleProvider>().t('common.edit') ?? 'Редактирование', style: GoogleFonts.inter(color: Theme.of(context).appColors.foreground, fontWeight: FontWeight.w600)),
            content: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                if (newImageBytes != null)
                  ClipRRect(
                    borderRadius: BorderRadius.circular(12),
                    child: Image.memory(
                      newImageBytes!,
                      fit: BoxFit.contain,
                      height: 200,
                      width: double.infinity,
                    ),
                  )
                else if (imageUrl != null)
                  ClipRRect(
                    borderRadius: BorderRadius.circular(12),
                    child: Image.network(
                      imageUrl,
                      fit: BoxFit.contain,
                      height: 200,
                      width: double.infinity,
                      errorBuilder: (_, __, ___) => Container(
                        height: 120,
                        color: Theme.of(context).appColors.foreground.withValues(alpha: 0.05),
                        child: Icon(LucideIcons.image, color: Theme.of(context).appColors.foreground.withValues(alpha: 0.2), size: 48),
                      ),
                    ),
                  ),
                const SizedBox(height: 12),
                Row(
                  children: [
                    Expanded(
                      child: OutlinedButton.icon(
                        icon: Icon(LucideIcons.pencil, size: 16, color: Theme.of(context).appColors.foreground),
                        label: Text(context.read<LocaleProvider>().t('admin.reports.draw') ?? 'Рисовать', style: GoogleFonts.inter(color: Theme.of(context).appColors.foreground)),
                        onPressed: () async {
                          if (imageUrl == null && newImageBytes == null) return;
                          final bytes = await Navigator.push<Uint8List?>(
                            context,
                            MaterialPageRoute(
                              builder: (_) => ImageEditorScreen(
                                imageBytes: newImageBytes,
                                imageUrl: imageUrl,
                              ),
                            ),
                          );
                          if (bytes != null) {
                            setDialogState(() {
                              newImageBytes = bytes;
                              newImageExt = 'png';
                            });
                          }
                        },
                      ),
                    ),
                    const SizedBox(width: 8),
                    Expanded(
                      child: OutlinedButton.icon(
                        icon: Icon(LucideIcons.upload, size: 16, color: Theme.of(context).appColors.foreground),
                        label: Text(context.read<LocaleProvider>().t('admin.reports.replace') ?? 'Заменить', style: GoogleFonts.inter(color: Theme.of(context).appColors.foreground)),
                        onPressed: () async {
                          final picker = ImagePicker();
                          final xfile = await picker.pickImage(source: ImageSource.gallery);
                          if (xfile != null) {
                            final bytes = await xfile.readAsBytes();
                            setDialogState(() {
                              newImageBytes = bytes;
                              newImageExt = xfile.name.split('.').last;
                            });
                          }
                        },
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 12),
                TextField(
                  controller: controller,
                  maxLines: 2,
                  style: GoogleFonts.inter(color: Theme.of(context).appColors.foreground),
                  decoration: InputDecoration(
                    hintText: context.read<LocaleProvider>().t('chat.photo.descPlaceholder') ?? 'Описание...',
                    hintStyle: GoogleFonts.inter(color: Theme.of(context).appColors.foreground.withValues(alpha: 0.3)),
                    filled: true,
                    fillColor: Theme.of(context).appColors.foreground.withValues(alpha: 0.05),
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide.none),
                  ),
                ),
              ],
            ),
            actions: [
              TextButton(
                onPressed: () => Navigator.pop(ctx),
                child: Text(context.read<LocaleProvider>().t('common.cancel') ?? 'Отмена', style: GoogleFonts.inter(color: Theme.of(context).appColors.foreground.withValues(alpha: 0.54))),
              ),
              TextButton(
                onPressed: () async {
                  Navigator.pop(ctx);
                  try {
                    String? finalPhotoUrl = report['photo_url'];
                    if (newImageBytes != null) {
                      final path = 'edited_${DateTime.now().millisecondsSinceEpoch}.${newImageExt ?? "jpg"}';
                      await Supabase.instance.client.storage.from('photo-reports').uploadBinary(path, newImageBytes!);
                      finalPhotoUrl = path;
                    }
                    await Supabase.instance.client.from('photo_reports').update({
                      'description': controller.text.trim(),
                      if (newImageBytes != null) 'photo_url': finalPhotoUrl,
                    }).eq('id', report['id']);
                    _fetchReports();
                    if (mounted) {
                      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(context.read<LocaleProvider>().t('common.save') ?? 'Сохранено')));
                    }
                  } catch (e) {
                    if (mounted) {
                      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Ошибка: $e')));
                    }
                  }
                },
                child: Text(context.read<LocaleProvider>().t('common.save') ?? 'Сохранить', style: GoogleFonts.inter(color: Theme.of(context).primaryColor, fontWeight: FontWeight.w600)),
              ),
            ],
          );
        }
      ),
    );
  }

  Future<void> _deleteReport(String id) async {
    bool? confirm = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: Theme.of(context).cardColor,
        title: Text(context.read<LocaleProvider>().t('reports.delete_title') ?? 'Удаление', style: GoogleFonts.inter(color: Theme.of(context).appColors.foreground)),
        content: Text(context.read<LocaleProvider>().t('reports.delete_msg') ?? 'Вы уверены, что хотите удалить этот отчёт?', style: GoogleFonts.inter(color: Theme.of(context).appColors.foreground.withValues(alpha: 0.7))),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: Text(context.watch<LocaleProvider>().t('calendar.cancel') ?? 'Отмена', style: GoogleFonts.inter(color: Theme.of(context).appColors.foreground.withValues(alpha: 0.54))),
          ),
          TextButton(
            onPressed: () => Navigator.pop(ctx, true),
            child: Text(context.watch<LocaleProvider>().t('calendar.delete') ?? 'Удалить', style: GoogleFonts.inter(color: Colors.redAccent)),
          ),
        ],
      ),
    );

    if (confirm != true) return;
    
    try {
      await Supabase.instance.client.from('photo_reports').delete().eq('id', id);
      _fetchReports();
    } catch (e) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Ошибка: $e')));
    }
  }

  InputDecoration _inputDeco(String hint) {
    return InputDecoration(
      hintText: hint,
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
    );
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Padding(
          padding: const EdgeInsets.all(16.0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                context.watch<LocaleProvider>().t('reports.title') ?? 'Фотоотчёты',
                style: GoogleFonts.inter(color: Theme.of(context).appColors.foreground, fontSize: 20, fontWeight: FontWeight.bold),
              ),
              const SizedBox(height: 16),
              TextField(
                onChanged: (val) {
                  _searchQuery = val;
                  _fetchReports();
                },
                style: GoogleFonts.inter(color: Theme.of(context).appColors.foreground, fontSize: 14),
                decoration: _inputDeco(context.watch<LocaleProvider>().t('reports.search') ?? 'Поиск по описанию...'),
              ),
              const SizedBox(height: 12),
              
              // Dropdown Sites
              Container(
                width: double.infinity,
                padding: const EdgeInsets.symmetric(horizontal: 16),
                decoration: BoxDecoration(
                  color: Theme.of(context).cardColor,
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: Theme.of(context).appColors.foreground.withValues(alpha: 0.12)),
                ),
                child: DropdownButtonHideUnderline(
                  child: DropdownButton<String>(
                    value: _selectedSiteId == 'general_chat' ? 'all' : _selectedSiteId,
                    dropdownColor: Theme.of(context).cardColor,
                    icon: Icon(LucideIcons.chevron_down, color: Theme.of(context).appColors.foreground.withValues(alpha: 0.54), size: 16),
                    style: GoogleFonts.inter(color: Theme.of(context).appColors.foreground, fontSize: 14),
                    items: [
                      DropdownMenuItem(value: 'all', child: Text(context.watch<LocaleProvider>().t('dashboard.all_sites') ?? 'Все объекты')),
                      ..._sites.map((s) => DropdownMenuItem(value: s['id'] as String, child: Text(TransliterationService.transliterateIfNeeded(s['name'] ?? '', 'ru')))),
                    ],
                    onChanged: (v) {
                      if (v != null) {
                        setState(() => _selectedSiteId = v);
                        _fetchReports();
                      }
                    },
                  ),
                ),
              ),
              const SizedBox(height: 12),

              // Dropdown Time
              Container(
                width: double.infinity,
                padding: const EdgeInsets.symmetric(horizontal: 16),
                decoration: BoxDecoration(
                  color: Theme.of(context).cardColor,
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: Theme.of(context).appColors.foreground.withValues(alpha: 0.12)),
                ),
                child: DropdownButtonHideUnderline(
                  child: DropdownButton<String>(
                    value: _selectedTime,
                    dropdownColor: Theme.of(context).cardColor,
                    icon: Icon(LucideIcons.chevron_down, color: Theme.of(context).appColors.foreground.withValues(alpha: 0.54), size: 16),
                    style: GoogleFonts.inter(color: Theme.of(context).appColors.foreground, fontSize: 14),
                    items: [
                      DropdownMenuItem(value: 'all', child: Text(context.watch<LocaleProvider>().t('dashboard.time_all') ?? 'За всё время')),
                      DropdownMenuItem(value: 'today', child: Text(context.watch<LocaleProvider>().t('dashboard.time_today') ?? 'За сегодня')),
                      DropdownMenuItem(value: 'week', child: Text(context.watch<LocaleProvider>().t('dashboard.time_week') ?? 'За неделю')),
                    ],
                    onChanged: (v) {
                      if (v != null) {
                        setState(() => _selectedTime = v);
                        _fetchReports();
                      }
                    },
                  ),
                ),
              ),
              const SizedBox(height: 12),
              SizedBox(
                width: double.infinity,
                child: _selectedSiteId == 'general_chat' 
                  ? ElevatedButton.icon(
                      style: ElevatedButton.styleFrom(
                        backgroundColor: Theme.of(context).primaryColor,
                        foregroundColor: Colors.white,
                        padding: const EdgeInsets.symmetric(vertical: 14),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                        elevation: 0,
                      ),
                      icon: const Icon(LucideIcons.message_square, size: 18),
                      label: Text(context.watch<LocaleProvider>().t('chat.general_channel') ?? 'Общий чат', style: GoogleFonts.inter(fontWeight: FontWeight.w500)),
                      onPressed: () {
                        setState(() => _selectedSiteId = 'all');
                        _fetchReports();
                      },
                    )
                  : OutlinedButton.icon(
                      style: OutlinedButton.styleFrom(
                        foregroundColor: Theme.of(context).appColors.foreground,
                        side: BorderSide(color: Theme.of(context).appColors.foreground.withValues(alpha: 0.12)),
                        padding: const EdgeInsets.symmetric(vertical: 14),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                      ),
                      icon: const Icon(LucideIcons.message_square, size: 18),
                      label: Text(context.watch<LocaleProvider>().t('chat.general_channel') ?? 'Общий чат', style: GoogleFonts.inter(fontWeight: FontWeight.w500)),
                      onPressed: () {
                        setState(() => _selectedSiteId = 'general_chat');
                        _fetchReports();
                      },
                    ),
              ),
            ],
          ),
        ),
        
        Expanded(
          child: _isLoading
              ? Center(child: CircularProgressIndicator(color: Theme.of(context).appColors.foreground.withValues(alpha: 0.54)))
              : _reports.isEmpty
                  ? Center(
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Icon(LucideIcons.camera, color: Theme.of(context).appColors.foreground.withValues(alpha: 0.2), size: 48),
                          const SizedBox(height: 16),
                          Text(
                            context.watch<LocaleProvider>().t('reports.empty') ?? 'Отчётов пока нет',
                            style: GoogleFonts.inter(color: Theme.of(context).appColors.foreground.withValues(alpha: 0.54)),
                          ),
                        ],
                      ),
                    )
                  : GridView.builder(
                      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                      gridDelegate: const SliverGridDelegateWithMaxCrossAxisExtent(
                        maxCrossAxisExtent: 300,
                        mainAxisSpacing: 16,
                        crossAxisSpacing: 16,
                        childAspectRatio: 0.75,
                      ),
                      itemCount: _reports.length,
                      itemBuilder: (context, index) {
                        final r = _reports[index];
                        final date = DateTime.tryParse(r['created_at'] ?? '');
                        final dateStr = date != null ? '${date.day.toString().padLeft(2, '0')}.${date.month.toString().padLeft(2, '0')}.${date.year} ${date.hour.toString().padLeft(2, '0')}:${date.minute.toString().padLeft(2, '0')}' : '';
                        
                        return Container(
                          decoration: BoxDecoration(
                            color: Theme.of(context).cardColor,
                            borderRadius: BorderRadius.circular(24),
                            border: Border.all(color: Theme.of(context).appColors.foreground.withValues(alpha: 0.12)),
                            boxShadow: [
                              BoxShadow(color: Colors.black.withValues(alpha: 0.05), blurRadius: 10, offset: const Offset(0, 4)),
                            ],
                          ),
                          clipBehavior: Clip.antiAlias,
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              // Header
                              Padding(
                                padding: const EdgeInsets.all(16),
                                child: Row(
                                  children: [
                                    Container(
                                      width: 40,
                                      height: 40,
                                      decoration: BoxDecoration(
                                        color: Theme.of(context).primaryColor.withValues(alpha: 0.1),
                                        shape: BoxShape.circle,
                                      ),
                                      child: Icon(LucideIcons.camera, color: Theme.of(context).primaryColor, size: 20),
                                    ),
                                    const SizedBox(width: 12),
                                    Expanded(
                                      child: Column(
                                        crossAxisAlignment: CrossAxisAlignment.start,
                                        children: [
                                          Text(
                                            TransliterationService.transliterateIfNeeded(
                                              r['site_id'] == null
                                                ? (context.read<LocaleProvider>().t('chat.general_channel') ?? 'Общий чат')
                                                : (_sites.firstWhere((s) => s['id'] == r['site_id'], orElse: () => {'name': 'Без объекта'})['name'] ?? 'Без объекта'),
                                              'ru',
                                            ),
                                            style: GoogleFonts.inter(color: Theme.of(context).appColors.foreground, fontWeight: FontWeight.bold),
                                            maxLines: 1,
                                            overflow: TextOverflow.ellipsis,
                                          ),
                                          Text(
                                            dateStr,
                                            style: GoogleFonts.inter(color: Theme.of(context).appColors.foreground.withValues(alpha: 0.54), fontSize: 12),
                                          ),
                                        ],
                                      ),
                                    ),
                                    PopupMenuButton<String>(
                                      icon: Icon(Icons.more_horiz, color: Theme.of(context).appColors.foreground.withValues(alpha: 0.54)),
                                      color: Theme.of(context).cardColor,
                                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                                      onSelected: (val) {
                                        if (val == 'edit') {
                                          _editReport(r);
                                        } else if (val == 'delete') {
                                          _deleteReport(r['id']);
                                        }
                                      },
                                      itemBuilder: (BuildContext context) => <PopupMenuEntry<String>>[
                                        PopupMenuItem<String>(
                                          value: 'edit',
                                          child: Row(
                                            children: [
                                              Icon(LucideIcons.pencil, color: Theme.of(context).appColors.foreground, size: 18),
                                              const SizedBox(width: 12),
                                              Text(context.read<LocaleProvider>().t('admin.reports.edit') ?? 'Редактировать', style: GoogleFonts.inter(color: Theme.of(context).appColors.foreground)),
                                            ],
                                          ),
                                        ),
                                        PopupMenuItem<String>(
                                          value: 'delete',
                                          child: Row(
                                            children: [
                                              Icon(LucideIcons.trash_2, color: Colors.redAccent, size: 18),
                                              const SizedBox(width: 12),
                                              Text(context.read<LocaleProvider>().t('admin.reports.delete') ?? 'Удалить', style: GoogleFonts.inter(color: Colors.redAccent)),
                                            ],
                                          ),
                                        ),
                                      ],
                                    ),
                                  ],
                                ),
                              ),
                              
                              // Media
                              if (r['photo_url'] != null && r['photo_url'].toString().isNotEmpty)
                                Expanded(
                                  child: SizedBox(
                                    width: double.infinity,
                                    child: Image.network(
                                      Supabase.instance.client.storage.from('photo-reports').getPublicUrl(r['photo_url']),
                                      fit: BoxFit.cover,
                                      errorBuilder: (_, __, ___) => Container(
                                        color: Theme.of(context).appColors.foreground.withValues(alpha: 0.05),
                                        child: Icon(LucideIcons.image, color: Theme.of(context).appColors.foreground.withValues(alpha: 0.2), size: 48),
                                      ),
                                    ),
                                  ),
                                ),
                                
                              // Description
                              if (r['description'] != null && r['description'].toString().isNotEmpty)
                                Padding(
                                  padding: const EdgeInsets.all(12),
                                  child: Text(
                                    r['description'],
                                    style: GoogleFonts.inter(color: Theme.of(context).appColors.foreground, fontSize: 12, height: 1.4),
                                    maxLines: 2,
                                    overflow: TextOverflow.ellipsis,
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
}

