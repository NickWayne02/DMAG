import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';
import 'package:image_picker/image_picker.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../../../../providers/settings_provider.dart';
import '../../../../theme/app_theme.dart';
import 'package:flutter_lucide/flutter_lucide.dart';
import '../../../../providers/locale_provider.dart';

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
  late Future<List<Map<String, dynamic>>> _presetsFuture;

  Future<List<Map<String, dynamic>>> _fetchPresets() async {
    final response = await _supabase.from('app_branding_presets').select().order('created_at');
    return List<Map<String, dynamic>>.from(response);
  }

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _appNameController.text = context.read<SettingsProvider>().settings.appName;
    });
    _presetsFuture = _fetchPresets();
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
    final pickedFile = await picker.pickImage(source: ImageSource.gallery, maxWidth: 500, maxHeight: 500);

    if (pickedFile == null) return;

    setState(() => _isUploading = true);
    try {
      final fileBytes = await pickedFile.readAsBytes();
      final fileExt = pickedFile.path.split('.').last;
      final fileName = 'logo_${DateTime.now().millisecondsSinceEpoch}.$fileExt';

      // Получаем текущий URL, чтобы удалить старый файл
      final currentLogoUrl = mounted ? context.read<SettingsProvider>().settings.appLogoUrl : null;
      if (currentLogoUrl != null && currentLogoUrl.contains('/assets/')) {
        try {
          final parts = currentLogoUrl.split('/assets/');
          if (parts.length > 1) {
            final oldPath = parts[1];
            await _supabase.storage.from('assets').remove([oldPath]);
          }
        } catch (e) {
          debugPrint('Failed to delete old logo: $e');
        }
      }

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

  Future<void> _saveCurrentAsPreset() async {
    final currentName = context.read<SettingsProvider>().settings.appName;
    final currentLogo = context.read<SettingsProvider>().settings.appLogoUrl;
    
    setState(() => _isUploading = true);
    try {
      await _supabase.from('app_branding_presets').insert({
        'app_name': currentName,
        'app_logo_url': currentLogo,
      });
      if (mounted) {
        setState(() {
          _presetsFuture = _fetchPresets();
        });
        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Текущий бренд сохранен в галерею')));
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Ошибка сохранения: $e'), backgroundColor: Colors.red));
      }
    } finally {
      if (mounted) setState(() => _isUploading = false);
    }
  }

  Future<void> _applyPreset(Map<String, dynamic> preset) async {
    setState(() => _isLoading = true);
    try {
      await _supabase.from('app_settings').update({
        'app_name': preset['app_name'],
        'app_logo_url': preset['app_logo_url'],
      }).eq('id', 1);
      
      if (mounted) {
        context.read<SettingsProvider>().updateSettings(
          appName: preset['app_name'], 
          appLogoUrl: preset['app_logo_url']
        );
        _appNameController.text = preset['app_name'];
        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Бренд применен!')));
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Ошибка применения: $e'), backgroundColor: Colors.red));
      }
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  Future<void> _deletePreset(String id) async {
    try {
      await _supabase.from('app_branding_presets').delete().eq('id', id);
      if (mounted) {
        setState(() {
          _presetsFuture = _fetchPresets();
        });
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Ошибка удаления: $e'), backgroundColor: Colors.red));
      }
    }
  }

  Widget _buildPresetCard(Map<String, dynamic> preset, AppColors colors, String? Function(String) t) {
    return Container(
      decoration: BoxDecoration(
        color: colors.card,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: colors.border),
      ),
      padding: const EdgeInsets.all(12),
      child: Column(
        children: [
          Expanded(
            child: Container(
              width: double.infinity,
              decoration: BoxDecoration(
                color: colors.background,
                borderRadius: BorderRadius.circular(8),
              ),
              clipBehavior: Clip.hardEdge,
              child: preset['app_logo_url'] != null
                  ? Image.network(preset['app_logo_url'], fit: BoxFit.cover)
                  : Center(child: Text(t('admin.branding.noLogo') ?? 'Нет лого', style: GoogleFonts.inter(fontSize: 10, color: colors.foreground.withValues(alpha: 0.5)))),
            ),
          ),
          const SizedBox(height: 8),
          Text(
            preset['app_name'] ?? (t('admin.branding.noName') ?? 'Без названия'),
            style: GoogleFonts.inter(color: colors.foreground, fontSize: 14, fontWeight: FontWeight.bold),
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
          ),
          const SizedBox(height: 8),
          Row(
            children: [
              Expanded(
                child: ElevatedButton(
                  onPressed: _isLoading ? null : () => _applyPreset(preset),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: colors.primary,
                    foregroundColor: colors.card,
                    padding: EdgeInsets.zero,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                  ),
                  child: Text(t('admin.branding.apply') ?? 'Применить', style: const TextStyle(fontSize: 11)),
                ),
              ),
              const SizedBox(width: 4),
              IconButton(
                onPressed: () => _deletePreset(preset['id']),
                icon: const Icon(LucideIcons.trash_2, size: 16),
                color: Colors.red,
                padding: EdgeInsets.zero,
                constraints: const BoxConstraints(minWidth: 32, minHeight: 32),
                style: IconButton.styleFrom(
                  backgroundColor: Colors.red.withValues(alpha: 0.1),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final colors = Theme.of(context).appColors;
    final t = context.watch<LocaleProvider>().t;
    final currentLogoUrl = context.watch<SettingsProvider>().settings.appLogoUrl;

    return Scaffold(
      backgroundColor: colors.background,
      appBar: AppBar(
        backgroundColor: colors.card,
        title: Text(
          t('admin.tab.branding') ?? 'Брендирование',
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
              t('admin.branding.nameDesc') ?? 'Название приложения',
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
                        : Text(t('admin.users.save') ?? 'Сохранить'),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 32),
            Text(
              t('admin.branding.logoDesc') ?? 'Логотип приложения',
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
                            t('admin.branding.noLogo') ?? 'Нет лого',
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
                        label: Text(t('admin.branding.uploadNew') ?? 'Загрузить новый'),
                      ),
                      const SizedBox(height: 12),
                      Text(
                        t('admin.branding.logoHint') ?? 'Рекомендуется квадратное изображение (PNG, JPG) размером от 256x256.',
                        style: GoogleFonts.inter(color: colors.foreground.withValues(alpha: 0.5), fontSize: 14),
                      ),
                    ],
                  ),
                ),
              ],
            ),
            const SizedBox(height: 32),
            const Divider(),
            const SizedBox(height: 16),
            Wrap(
              alignment: WrapAlignment.spaceBetween,
              crossAxisAlignment: WrapCrossAlignment.center,
              spacing: 16,
              runSpacing: 16,
              children: [
                Text(
                  t('admin.branding.gallery') ?? 'Галерея брендов',
                  style: GoogleFonts.inter(color: colors.foreground, fontSize: 16, fontWeight: FontWeight.bold),
                ),
                ElevatedButton.icon(
                  onPressed: _isUploading ? null : _saveCurrentAsPreset,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: colors.card,
                    foregroundColor: colors.foreground,
                    side: BorderSide(color: colors.border),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                  ),
                  icon: const Icon(LucideIcons.save, size: 16),
                  label: Text(t('admin.branding.saveCurrent') ?? 'Сохранить как пресет', style: const TextStyle(fontSize: 13)),
                ),
              ],
            ),
            const SizedBox(height: 16),
            FutureBuilder<List<Map<String, dynamic>>>(
              future: _presetsFuture,
              builder: (context, snapshot) {
                if (snapshot.connectionState == ConnectionState.waiting) {
                  return const Center(child: CircularProgressIndicator());
                }
                if (snapshot.hasError) {
                  return Text('Ошибка загрузки галереи: ${snapshot.error}', style: const TextStyle(color: Colors.red));
                }
                final presets = snapshot.data ?? [];
                if (presets.isEmpty) {
                  return Text(t('admin.branding.galleryEmpty') ?? 'Пусто', style: TextStyle(color: colors.foreground.withValues(alpha: 0.5)));
                }
                return GridView.builder(
                  shrinkWrap: true,
                  physics: const NeverScrollableScrollPhysics(),
                  gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                    crossAxisCount: 2,
                    crossAxisSpacing: 16,
                    mainAxisSpacing: 16,
                    childAspectRatio: 0.85,
                  ),
                  itemCount: presets.length,
                  itemBuilder: (context, index) {
                    final preset = presets[index];
                    return _buildPresetCard(preset, colors, t);
                  },
                );
              },
            ),
          ],
        ),
      ),
    );
  }
}
