import 'dart:io';
import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:flutter_lucide/flutter_lucide.dart';
import 'package:image_picker/image_picker.dart';
import 'package:provider/provider.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../theme/app_theme.dart';
import '../widgets/bounce_button.dart';
import '../utils/app_toast.dart';
import 'package:flutter/foundation.dart' show kIsWeb;

class PhotoReportSheet extends StatefulWidget {
  final Map<String, dynamic>? site;

  const PhotoReportSheet({Key? key, this.site}) : super(key: key);

  static Future<void> show(BuildContext context, Map<String, dynamic>? site) {
    return showGeneralDialog(
      context: context,
      barrierDismissible: true,
      barrierLabel: 'PhotoReport',
      barrierColor: Colors.black.withOpacity(0.7),
      transitionDuration: const Duration(milliseconds: 250),
      pageBuilder: (context, animation, secondaryAnimation) {
        return Align(
          alignment: Alignment.center,
          child: Material(
            color: Colors.transparent,
            child: PhotoReportSheet(site: site),
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
  
  XFile? _selectedImage;
  String _criticality = 'info';
  bool _isBusy = false;

  final Map<String, Map<String, dynamic>> _criticalityOptions = {
    'info': {'label': 'Информация', 'color': const Color(0xFF4CAF50), 'icon': LucideIcons.info},
    'important': {'label': 'Важно', 'color': const Color(0xFFFFB300), 'icon': LucideIcons.triangle_alert},
    'urgent': {'label': 'Срочно', 'color': const Color(0xFFF44336), 'icon': LucideIcons.circle_alert},
  };

  Future<void> _pickImage(ImageSource source) async {
    try {
      final XFile? image = await _picker.pickImage(
        source: source,
        imageQuality: 80,
      );
      if (image != null) {
        setState(() {
          _selectedImage = image;
        });
      }
    } catch (e) {
      AppToast.show(context, 'Ошибка при выборе фото', color: Colors.red);
    }
  }

  Future<void> _submit() async {
    if (widget.site == null) {
      AppToast.show(context, 'Сначала выберите объект на главном экране', color: Colors.red);
      return;
    }
    
    if (_selectedImage == null && _descController.text.trim().isEmpty) {
      AppToast.show(context, 'Добавьте фото или описание', color: Colors.red);
      return;
    }

    setState(() => _isBusy = true);

    try {
      final user = Supabase.instance.client.auth.currentUser;
      if (user == null) throw Exception('Пользователь не авторизован');

      String? photoUrl;

      if (_selectedImage != null) {
        final bytes = await _selectedImage!.readAsBytes();
        final ext = _selectedImage!.name.split('.').last;
        final path = '${DateTime.now().millisecondsSinceEpoch}_${user.id.substring(0, 5)}.$ext';
        
        await Supabase.instance.client.storage
            .from('photo-reports')
            .uploadBinary(path, bytes);
            
        photoUrl = path;
      }

      await Supabase.instance.client.from('photo_reports').insert({
        'site_id': widget.site!['id'],
        'author_id': user.id,
        'description': _descController.text.trim().isEmpty ? null : _descController.text.trim(),
        'criticality': _criticality,
        'photo_url': photoUrl,
      });

      if (mounted) {
        AppToast.showSuccess(context, 'Фотоотчет отправлен');
        Navigator.pop(context);
      }
    } catch (e) {
      if (mounted) {
        AppToast.show(context, 'Ошибка: ${e.toString()}', color: Colors.red);
      }
    } finally {
      if (mounted) {
        setState(() => _isBusy = false);
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
                  color: isSelected ? color.withOpacity(0.15) : Colors.transparent,
                  border: Border.all(
                    color: isSelected ? color : colors.border,
                  ),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Column(
                  children: [
                    Icon(
                      data['icon'] as IconData,
                      color: isSelected ? color : colors.foreground.withOpacity(0.5),
                      size: 20,
                    ),
                    const SizedBox(height: 4),
                    Text(
                      data['label'] as String,
                      style: GoogleFonts.inter(
                        fontSize: 11,
                        fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
                        color: isSelected ? color : colors.foreground.withOpacity(0.5),
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
                        'Новый фотоотчет',
                        style: GoogleFonts.inter(
                          fontSize: 20,
                          fontWeight: FontWeight.bold,
                          color: colors.foreground,
                        ),
                      ),
                      if (widget.site != null)
                        Text(
                          'Объект: ${widget.site!['name'] ?? widget.site!['address']}',
                          style: GoogleFonts.inter(
                            fontSize: 12,
                            color: colors.foreground.withOpacity(0.6),
                          ),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        )
                      else
                        Text(
                          'Сначала выберите объект на главном экране',
                          style: GoogleFonts.inter(
                            fontSize: 12,
                            color: Colors.redAccent,
                          ),
                        ),
                    ],
                  ),
                ),
                IconButton(
                  icon: Icon(LucideIcons.x, color: colors.foreground.withOpacity(0.5)),
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
                  if (_selectedImage == null) ...[
                    Row(
                      children: [
                        Expanded(
                          child: BounceButton(
                            onTap: () => _pickImage(ImageSource.camera),
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
                                  Text('Снимок', style: GoogleFonts.inter(color: colors.foreground, fontSize: 12)),
                                ],
                              ),
                            ),
                          ),
                        ),
                        const SizedBox(width: 16),
                        Expanded(
                          child: BounceButton(
                            onTap: () => _pickImage(ImageSource.gallery),
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
                                  Text('Галерея', style: GoogleFonts.inter(color: colors.foreground, fontSize: 12)),
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
                          kIsWeb 
                            ? Image.network(_selectedImage!.path, fit: BoxFit.cover) 
                            : Image.file(File(_selectedImage!.path), fit: BoxFit.cover),
                          Positioned(
                            top: 8,
                            right: 8,
                            child: BounceButton(
                              onTap: () => setState(() => _selectedImage = null),
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
                  Text('Описание', style: GoogleFonts.inter(color: colors.foreground, fontWeight: FontWeight.w500, fontSize: 14)),
                  const SizedBox(height: 8),
                  TextField(
                    controller: _descController,
                    maxLines: 4,
                    style: GoogleFonts.inter(color: colors.foreground, fontSize: 14),
                    decoration: InputDecoration(
                      hintText: 'Введите описание проблемы или отчета...',
                      hintStyle: GoogleFonts.inter(color: colors.foreground.withOpacity(0.4), fontSize: 14),
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
                  Text('Важность', style: GoogleFonts.inter(color: colors.foreground, fontWeight: FontWeight.w500, fontSize: 14)),
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
              onTap: _isBusy || widget.site == null ? () {} : _submit,
              child: Container(
                width: double.infinity,
                padding: const EdgeInsets.symmetric(vertical: 16),
                decoration: BoxDecoration(
                  color: _isBusy || widget.site == null ? colors.muted : colors.primary,
                  borderRadius: BorderRadius.circular(12),
                ),
                child: _isBusy
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
                            'Отправить отчет',
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
