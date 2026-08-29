import 'dart:io';
import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';
import 'package:image_picker/image_picker.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../../../../providers/settings_provider.dart';
import '../../../../theme/app_theme.dart';
import 'package:flutter_lucide/flutter_lucide.dart';

class BrandingTab extends StatefulWidget {
  const BrandingTab({super.key});

  @override
  State<BrandingTab> createState() => _BrandingTabState();
}

class _BrandingTabState extends State<BrandingTab> {
  final _supabase = Supabase.instance.client;
  final _appNameController = TextEditingController();
  bool _isLoading = false;
  bool _isUploading = false;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _appNameController.text = context.read<SettingsProvider>().settings.appName;
    });
  }

  @override
  void dispose() {
    _appNameController.dispose();
    super.dispose();
  }

  Future<void> _saveAppName() async {
    final newName = _appNameController.text.trim();
    if (newName.isEmpty) return;

    setState(() => _isLoading = true);
    try {
      await _supabase
          .from('app_settings')
          .update({'app_name': newName})
          .eq('id', 1);

      if (mounted) {
        context.read<SettingsProvider>().updateSettings(appName: newName);
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Название успешно обновлено')),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Ошибка при сохранении: $e'), backgroundColor: Colors.red),
        );
      }
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  Future<void> _pickAndUploadLogo() async {
    final picker = ImagePicker();
    final pickedFile = await picker.pickImage(source: ImageSource.gallery, maxWidth: 512, maxHeight: 512);

    if (pickedFile == null) return;

    setState(() => _isUploading = true);
    try {
      final fileBytes = await pickedFile.readAsBytes();
      final fileExt = pickedFile.path.split('.').last;
      final fileName = 'logo_${DateTime.now().millisecondsSinceEpoch}.$fileExt';

      // Upload to Supabase Storage
      await _supabase.storage.from('assets').uploadBinary(
            fileName,
            fileBytes,
            fileOptions: FileOptions(contentType: 'image/$fileExt', upsert: true),
          );

      // Get public URL
      final logoUrl = _supabase.storage.from('assets').getPublicUrl(fileName);

      // Update Database
      await _supabase
          .from('app_settings')
          .update({'app_logo_url': logoUrl})
          .eq('id', 1);

      if (mounted) {
        context.read<SettingsProvider>().updateSettings(appLogoUrl: logoUrl);
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Логотип успешно обновлен')),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Ошибка при загрузке: $e'), backgroundColor: Colors.red),
        );
      }
    } finally {
      if (mounted) setState(() => _isUploading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final colors = AppTheme.colors;
    final currentLogoUrl = context.watch<SettingsProvider>().settings.appLogoUrl;

    return Scaffold(
      backgroundColor: colors.background,
      appBar: AppBar(
        backgroundColor: colors.card,
        title: Text(
          'Брендирование приложения',
          style: GoogleFonts.inter(color: colors.foreground, fontWeight: FontWeight.bold),
        ),
        elevation: 1,
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(24),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Название приложения (отображается в меню и заголовках)',
              style: GoogleFonts.inter(color: colors.foreground, fontSize: 16, fontWeight: FontWeight.w500),
            ),
            const SizedBox(height: 12),
            Row(
              children: [
                Expanded(
                  child: TextField(
                    controller: _appNameController,
                    style: GoogleFonts.inter(color: colors.foreground),
                    decoration: InputDecoration(
                      filled: true,
                      fillColor: colors.card,
                      border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(8),
                        borderSide: BorderSide(color: colors.border),
                      ),
                      enabledBorder: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(8),
                        borderSide: BorderSide(color: colors.border),
                      ),
                      focusedBorder: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(8),
                        borderSide: BorderSide(color: colors.primary),
                      ),
                    ),
                  ),
                ),
                const SizedBox(width: 16),
                SizedBox(
                  height: 52,
                  child: ElevatedButton(
                    onPressed: _isLoading ? null : _saveAppName,
                    style: ElevatedButton.styleFrom(
                      backgroundColor: colors.primary,
                      foregroundColor: colors.card,
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                    ),
                    child: _isLoading 
                        ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2))
                        : const Text('Сохранить'),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 32),
            Text(
              'Логотип приложения (используется в меню и как иконка сайта)',
              style: GoogleFonts.inter(color: colors.foreground, fontSize: 16, fontWeight: FontWeight.w500),
            ),
            const SizedBox(height: 16),
            Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Container(
                  width: 128,
                  height: 128,
                  decoration: BoxDecoration(
                    color: colors.card,
                    border: Border.all(color: colors.border),
                    borderRadius: BorderRadius.circular(16),
                  ),
                  clipBehavior: Clip.hardEdge,
                  child: currentLogoUrl != null
                      ? Image.network(currentLogoUrl, fit: BoxFit.cover)
                      : Center(
                          child: Text(
                            'Нет лого',
                            style: GoogleFonts.inter(color: colors.foreground.withValues(alpha: 0.5)),
                          ),
                        ),
                ),
                const SizedBox(width: 24),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      ElevatedButton.icon(
                        onPressed: _isUploading ? null : _pickAndUploadLogo,
                        style: ElevatedButton.styleFrom(
                          backgroundColor: colors.card,
                          foregroundColor: colors.foreground,
                          side: BorderSide(color: colors.border),
                          padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                        ),
                        icon: _isUploading
                            ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2))
                            : const Icon(LucideIcons.upload),
                        label: const Text('Загрузить новый'),
                      ),
                      const SizedBox(height: 12),
                      Text(
                        'Рекомендуется квадратное изображение (PNG, JPG) размером от 256x256.',
                        style: GoogleFonts.inter(color: colors.foreground.withValues(alpha: 0.5), fontSize: 14),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}
