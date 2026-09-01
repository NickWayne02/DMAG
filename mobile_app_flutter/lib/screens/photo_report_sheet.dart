import 'package:mobile_app_flutter/providers/locale_provider.dart';
import 'package:provider/provider.dart';
import 'dart:io';
import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:flutter_lucide/flutter_lucide.dart';
import 'package:image_picker/image_picker.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../theme/app_theme.dart';
import '../widgets/bounce_button.dart';
import '../utils/app_toast.dart';
import 'package:flutter/foundation.dart' show kIsWeb;
import '../providers/shift_provider.dart';

class PhotoReportSheet extends StatefulWidget {
  final Map<String, dynamic>? site;
  final Map<String, dynamic>? editingMessage;

  const PhotoReportSheet({super.key, this.site, this.editingMessage});

  static Future<void> show(BuildContext context, Map<String, dynamic>? site, {Map<String, dynamic>? editingMessage}) {
    return showGeneralDialog(
      context: context,
      barrierDismissible: true,
      barrierLabel: 'PhotoReport',
      barrierColor: Colors.black.withValues(alpha: 0.7),
      transitionDuration: const Duration(milliseconds: 250),
      pageBuilder: (context, animation, secondaryAnimation) {
        return Scaffold(
          backgroundColor: Colors.transparent,
          body: Align(
            alignment: Alignment.center,
            child: PhotoReportSheet(site: site, editingMessage: editingMessage),
          ),
        );
      },
      transitionBuilder: (context, animation, secondaryAnimation, child) {
        final scaleValue = CurvedAnimation(
          parent: animation,
          curve: Curves.easeOutCubic,
        ).value;
        
        return FadeTransition(
          opacity: animation,
          child: Transform.scale(
            scale: 0.90 + (0.10 * scaleValue),
            alignment: Alignment.center,
            child: child,
          ),
        );
      },
    );
  }

  @override
  State<PhotoReportSheet> createState() => _PhotoReportSheetState();
}

class _PhotoReportSheetState extends State<PhotoReportSheet> {
  final TextEditingController _descController = TextEditingController();
  final ImagePicker _picker = ImagePicker();
  
  XFile? _imageFile;
  String? _existingPhotoUrl;
  String _criticality = 'info';
  bool _isSending = false;

  @override
  void initState() {
    super.initState();
    if (widget.editingMessage != null) {
      final content = widget.editingMessage!['content'] as String;
      final parts = content.replaceAll(RegExp(r'\[ФОТО_ОТЧЕТ\] |\[PHOTO_REPORT\] '), '').split(' | ');
      if (parts.isNotEmpty) {
        _existingPhotoUrl = parts[0];
        if (parts.length > 2) {
          _criticality = parts[1];
          _descController.text = parts[2];
        } else if (parts.length > 1) {
          _descController.text = parts[1];
        }
      }
    }
  }

  final Map<String, Map<String, dynamic>> _criticalityOptions = {
    'info': {'label': 'Информация', 'color': const Color(0xFF4CAF50), 'icon': LucideIcons.info},
    'important': {'label': 'Важно', 'color': const Color(0xFFFFB300), 'icon': LucideIcons.triangle_alert},
    'urgent': {'label': 'Срочно', 'color': const Color(0xFFF44336), 'icon': LucideIcons.circle_alert},
  };

  Future<void> _pickImage() async {
    final XFile? image = await _picker.pickImage(
      source: ImageSource.camera,
      imageQuality: 80,
    );
    if (image != null) {
      setState(() {
        _imageFile = image;
        _existingPhotoUrl = null;
      });
    }
  }

  Future<void> _pickImageGallery() async {
    final XFile? image = await _picker.pickImage(
      source: ImageSource.gallery,
      imageQuality: 80,
    );
    if (image != null) {
      setState(() {
        _imageFile = image;
        _existingPhotoUrl = null;
      });
    }
  }

  Future<void> _submit() async {
    // The check for site == null was removed to allow sending reports to the general chat
    
    if (_imageFile == null && _existingPhotoUrl == null) {
      AppToast.show(context, context.read<LocaleProvider>().t('photo_report.error_photo') ?? 'Добавьте фото', color: Colors.red);
      return;
    }

    setState(() => _isSending = true);

    try {
      final user = Supabase.instance.client.auth.currentUser;
      if (user == null) throw Exception(context.read<LocaleProvider>().t('photo_report.error_auth') ?? 'Пользователь не авторизован');
      
      final shift = context.read<ShiftProvider>();
      final authorName = shift.userProfile?['full_name'] ?? user.email ?? context.read<LocaleProvider>().t('dashboard.employee') ?? 'Сотрудник';

      String photoUrl;
      if (_imageFile != null) {
        final nameParts = _imageFile!.name.split('.');
        final fileExt = nameParts.length > 1 ? nameParts.last.replaceAll(RegExp(r'[^a-zA-Z0-9]'), '') : 'jpg';
        final fileName = '${DateTime.now().millisecondsSinceEpoch}_${user.id}.$fileExt';
        
        if (kIsWeb) {
          final bytes = await _imageFile!.readAsBytes();
          await Supabase.instance.client.storage
              .from('photo-reports')
              .uploadBinary(fileName, bytes);
        } else {
          await Supabase.instance.client.storage
              .from('photo-reports')
              .upload(fileName, File(_imageFile!.path));
        }
            
        photoUrl = fileName;
      } else {
        photoUrl = _existingPhotoUrl!;
      }

      if (widget.editingMessage != null) {
        final desc = _descController.text.trim().isEmpty ? '' : _descController.text.trim();
        await Supabase.instance.client.from('chat_messages').update({
          'content': '[PHOTO_REPORT] $photoUrl | $_criticality | $desc',
        }).eq('id', widget.editingMessage!['id']);
        
        if (_existingPhotoUrl != null) {
           await Supabase.instance.client.from('photo_reports')
             .update({
               'description': _descController.text.trim().isEmpty ? null : _descController.text.trim(),
               'criticality': _criticality,
               'photo_url': photoUrl,
             })
             .eq('photo_url', _existingPhotoUrl!);
        }
      } else {
        await Supabase.instance.client.from('photo_reports').insert({
          'site_id': widget.site?['id'],
          'author_id': user.id,
          'description': _descController.text.trim().isEmpty ? null : _descController.text.trim(),
          'criticality': _criticality,
          'photo_url': photoUrl,
        });

        final desc = _descController.text.trim().isEmpty ? '' : _descController.text.trim();
        await Supabase.instance.client.from('chat_messages').insert({
          'channel_type': widget.site == null ? 'general' : 'site',
          'channel_id': widget.site == null ? 'general' : widget.site!['id'],
          'author_id': user.id,
          'author_name': authorName,
          'content': '[PHOTO_REPORT] $photoUrl | $_criticality | $desc',
          'source_lang': 'ru',
        });
      }

      if (mounted) {
        AppToast.showSuccess(context, widget.editingMessage != null 
          ? (context.read<LocaleProvider>().t('photo_report.success_edit') ?? 'Фотоотчет отредактирован')
          : (context.read<LocaleProvider>().t('photo_report.success') ?? 'Фотоотчет отправлен'));
        Navigator.pop(context);
      }
    } catch (e) {
      if (mounted) {
        AppToast.show(context, '''${context.read<LocaleProvider>().t('photo_report.error_send') ?? 'Ошибка отправки'}: ${e.toString()}''', color: Colors.red);
      }
    } finally {
      if (mounted) {
        setState(() => _isSending = false);
      }
    }
  }

  @override
  void dispose() {
    _descController.dispose();
    super.dispose();
  }

  Widget _buildCriticalitySelector(AppColors colors) {
    return Row(
      children: _criticalityOptions.entries.map((entry) {
        final isSelected = _criticality == entry.key;
        final data = entry.value;
        final color = data['color'] as Color;
        
        return Expanded(
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 4),
            child: BounceButton(
              onTap: () => setState(() => _criticality = entry.key),
              child: AnimatedContainer(
                duration: const Duration(milliseconds: 200),
                padding: const EdgeInsets.symmetric(vertical: 12),
                decoration: BoxDecoration(
                  color: isSelected ? color.withValues(alpha: 0.15) : Colors.transparent,
                  border: Border.all(
                    color: isSelected ? color : colors.border,
                  ),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Column(
                  children: [
                    Icon(
                      data['icon'] as IconData,
                      color: isSelected ? color : colors.foreground.withValues(alpha: 0.5),
                      size: 20,
                    ),
                    const SizedBox(height: 4),
                    Text(
                      data['label'] as String,
                      style: GoogleFonts.inter(
                        fontSize: 11,
                        fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
                        color: isSelected ? color : colors.foreground.withValues(alpha: 0.5),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
        );
      }).toList(),
    );
  }

  @override
  Widget build(BuildContext context) {

    final colors = Theme.of(context).appColors;

    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 24),
      constraints: BoxConstraints(
        maxHeight: MediaQuery.of(context).size.height * 0.9,
      ),
      decoration: BoxDecoration(
        color: Theme.of(context).cardColor,
        borderRadius: BorderRadius.circular(24),
        border: Border.all(color: colors.border),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          // Header
          Padding(
            padding: const EdgeInsets.fromLTRB(24, 24, 24, 16),
            child: Row(
              children: [
                Icon(LucideIcons.camera, color: colors.foreground),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        widget.editingMessage != null ? 'Редактировать фотоотчет' : (context.watch<LocaleProvider>().t('photo_report.title_new') ?? 'Новый фотоотчет'),
                        style: GoogleFonts.inter(
                          fontSize: 20,
                          fontWeight: FontWeight.bold,
                          color: colors.foreground,
                        ),
                      ),
                      if (widget.site != null)
                        Text(
                          '''${context.watch<LocaleProvider>().t('photo_report.site') ?? 'Объект'}: ${widget.site!['name'] ?? widget.site!['address']}''',
                          style: GoogleFonts.inter(
                            fontSize: 12,
                            color: colors.foreground.withValues(alpha: 0.6),
                          ),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        )
                      else
                        Text(
                          context.watch<LocaleProvider>().t('photo_report.no_site') ?? 'Будет отправлено в общий чат команды',
                          style: GoogleFonts.inter(
                            fontSize: 12,
                            color: colors.foreground.withValues(alpha: 0.6),
                          ),
                        ),
                    ],
                  ),
                ),
                IconButton(
                  icon: Icon(LucideIcons.x, color: colors.foreground.withValues(alpha: 0.5)),
                  onPressed: () => Navigator.pop(context),
                )
              ],
            ),
          ),
          
          Expanded(
            child: SingleChildScrollView(
              padding: const EdgeInsets.symmetric(horizontal: 24),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const SizedBox(height: 8),
                  
                  // Image selection
                  if (_imageFile == null && _existingPhotoUrl == null) ...[
                    Row(
                      children: [
                        Expanded(
                          child: BounceButton(
                            onTap: () => _pickImage(),
                            child: Container(
                              height: 100,
                              decoration: BoxDecoration(
                                color: colors.background,
                                borderRadius: BorderRadius.circular(16),
                                border: Border.all(color: colors.border),
                              ),
                              child: Column(
                                mainAxisAlignment: MainAxisAlignment.center,
                                children: [
                                  Icon(LucideIcons.camera, color: colors.foreground, size: 28),
                                  const SizedBox(height: 8),
                                  Text(context.watch<LocaleProvider>().t('photo_report.camera') ?? 'Снимок', style: GoogleFonts.inter(color: colors.foreground, fontSize: 12)),
                                ],
                              ),
                            ),
                          ),
                        ),
                        const SizedBox(width: 16),
                        Expanded(
                          child: BounceButton(
                            onTap: () => _pickImageGallery(),
                            child: Container(
                              height: 100,
                              decoration: BoxDecoration(
                                color: colors.background,
                                borderRadius: BorderRadius.circular(16),
                                border: Border.all(color: colors.border),
                              ),
                              child: Column(
                                mainAxisAlignment: MainAxisAlignment.center,
                                children: [
                                  Icon(LucideIcons.image_plus, color: colors.foreground, size: 28),
                                  const SizedBox(height: 8),
                                  Text(context.watch<LocaleProvider>().t('photo_report.gallery') ?? 'Галерея', style: GoogleFonts.inter(color: colors.foreground, fontSize: 12)),
                                ],
                              ),
                            ),
                          ),
                        ),
                      ],
                    ),
                  ] else ...[
                    // Preview
                    Container(
                      width: double.infinity,
                      height: 200,
                      decoration: BoxDecoration(
                        borderRadius: BorderRadius.circular(16),
                        border: Border.all(color: colors.border),
                      ),
                      clipBehavior: Clip.antiAlias,
                      child: Stack(
                        fit: StackFit.expand,
                        children: [
                          if (_imageFile != null)
                            kIsWeb
                              ? Image.network(_imageFile!.path, fit: BoxFit.cover) 
                              : Image.file(File(_imageFile!.path), fit: BoxFit.cover)
                          else if (_existingPhotoUrl != null)
                            Image.network(Supabase.instance.client.storage.from('photo-reports').getPublicUrl(_existingPhotoUrl!), fit: BoxFit.cover),
                          if (widget.editingMessage == null)
                            Positioned(
                              top: 8,
                              right: 8,
                              child: BounceButton(
                                onTap: () => setState(() => _imageFile = null),
                                child: Container(
                                  padding: const EdgeInsets.all(8),
                                  decoration: const BoxDecoration(
                                    color: Colors.black54,
                                    shape: BoxShape.circle,
                                  ),
                                  child: const Icon(LucideIcons.trash_2, color: Colors.white, size: 16),
                                ),
                              ),
                            ),
                        ],
                      ),
                    ),
                  ],

                  const SizedBox(height: 24),
                  
                  // Description
                  Text(context.watch<LocaleProvider>().t('photo_report.desc_title') ?? 'Описание', style: GoogleFonts.inter(color: colors.foreground, fontWeight: FontWeight.w500, fontSize: 14)),
                  const SizedBox(height: 8),
                  TextField(
                    controller: _descController,
                    maxLines: 4,
                    style: GoogleFonts.inter(color: colors.foreground, fontSize: 14),
                    decoration: InputDecoration(
                      hintText: context.watch<LocaleProvider>().t('photo_report.desc_hint') ?? 'Введите описание проблемы или отчета...',
                      hintStyle: GoogleFonts.inter(color: colors.foreground.withValues(alpha: 0.4), fontSize: 14),
                      filled: true,
                      fillColor: colors.background,
                      border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(12),
                        borderSide: BorderSide(color: colors.border),
                      ),
                      enabledBorder: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(12),
                        borderSide: BorderSide(color: colors.border),
                      ),
                      focusedBorder: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(12),
                        borderSide: BorderSide(color: colors.primary),
                      ),
                    ),
                  ),

                  const SizedBox(height: 24),
                  
                  // Criticality
                  Text(context.watch<LocaleProvider>().t('photo_report.importance') ?? 'Важность', style: GoogleFonts.inter(color: colors.foreground, fontWeight: FontWeight.w500, fontSize: 14)),
                  const SizedBox(height: 8),
                  _buildCriticalitySelector(colors),

                  const SizedBox(height: 32),
                ],
              ),
            ),
          ),
          
          // Footer
          Padding(
            padding: const EdgeInsets.all(24),
            child: BounceButton(
              onTap: _isSending ? () {} : _submit,
              child: Container(
                width: double.infinity,
                padding: const EdgeInsets.symmetric(vertical: 16),
                decoration: BoxDecoration(
                  color: _isSending ? colors.muted : colors.primary,
                  borderRadius: BorderRadius.circular(12),
                ),
                child: _isSending
                    ? const Center(
                        child: SizedBox(
                          height: 20,
                          width: 20,
                          child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                        ),
                      )
                    : Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Icon(LucideIcons.send, color: colors.primaryForeground, size: 18),
                          const SizedBox(width: 8),
                          Text(
                            widget.editingMessage != null 
                              ? (context.watch<LocaleProvider>().t('photo_report.btn_edit') ?? 'Редактировать')
                              : (context.watch<LocaleProvider>().t('photo_report.btn_send') ?? 'Отправить отчет'),
                            style: GoogleFonts.inter(
                              color: colors.primaryForeground,
                              fontWeight: FontWeight.bold,
                              fontSize: 16,
                            ),
                          ),
                        ],
                      ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}
