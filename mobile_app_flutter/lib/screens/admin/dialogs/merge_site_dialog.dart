import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:flutter_lucide/flutter_lucide.dart';
import 'package:provider/provider.dart';
import '../../../theme/app_theme.dart';
import '../../../providers/locale_provider.dart';

class MergeSiteDialog extends StatefulWidget {
  final Map<String, dynamic> sourceSite;
  final List<Map<String, dynamic>> allSites;

  const MergeSiteDialog({
    super.key,
    required this.sourceSite,
    required this.allSites,
  });

  static Future<bool?> show(
      BuildContext context, Map<String, dynamic> sourceSite, List<Map<String, dynamic>> allSites) {
    return showDialog<bool>(
      context: context,
      builder: (ctx) => MergeSiteDialog(sourceSite: sourceSite, allSites: allSites),
    );
  }

  @override
  State<MergeSiteDialog> createState() => _MergeSiteDialogState();
}

class _MergeSiteDialogState extends State<MergeSiteDialog> {
  String? _targetSiteId;
  bool _isLoading = false;

  Future<void> _merge() async {
    if (_targetSiteId == null) return;
    
    setState(() => _isLoading = true);
    try {
      await Supabase.instance.client.rpc('merge_sites', params: {
        'source_id': widget.sourceSite['id'],
        'target_id': _targetSiteId,
      });
      if (mounted) {
        Navigator.pop(context, true);
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Ошибка при объединении: $e')),
        );
      }
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final availableTargets = widget.allSites.where((s) => s['id'] != widget.sourceSite['id']).toList();
    final sourceName = widget.sourceSite['name'] ?? '';

    return Dialog(
      backgroundColor: Colors.transparent,
      elevation: 0,
      insetPadding: const EdgeInsets.symmetric(horizontal: 16),
      child: Container(
        width: double.infinity,
        constraints: const BoxConstraints(maxWidth: 400),
        decoration: BoxDecoration(
          color: Theme.of(context).cardColor,
          borderRadius: BorderRadius.circular(24),
          border: Border.all(color: Theme.of(context).appColors.foreground.withValues(alpha: 0.12)),
        ),
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(10),
                  decoration: BoxDecoration(
                    color: Theme.of(context).appColors.foreground.withValues(alpha: 0.05),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Icon(LucideIcons.git_merge, color: Theme.of(context).appColors.foreground, size: 20),
                ),
                const SizedBox(width: 16),
                Expanded(
                  child: Text(
                    context.watch<LocaleProvider>().t('sites.merge_title') ?? 'Объединение объектов',
                    style: GoogleFonts.inter(
                      color: Theme.of(context).appColors.foreground,
                      fontSize: 18,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 16),
            Text(
              context.watch<LocaleProvider>().t('sites.merge_desc') ?? 
                'Перенос всех смен и отчётов из объекта "$sourceName" в другой объект. Исходный объект будет удалён.',
              style: GoogleFonts.inter(
                color: Theme.of(context).appColors.foreground.withValues(alpha: 0.7),
                fontSize: 14,
              ),
            ),
            const SizedBox(height: 24),
            Text(
              context.watch<LocaleProvider>().t('sites.merge_target') ?? 'Целевой объект',
              style: GoogleFonts.inter(
                color: Theme.of(context).appColors.foreground,
                fontSize: 14,
                fontWeight: FontWeight.w600,
              ),
            ),
            const SizedBox(height: 8),
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
                  value: _targetSiteId,
                  hint: Text(context.watch<LocaleProvider>().t('sites.merge_select') ?? 'Выберите объект...', 
                    style: GoogleFonts.inter(color: Theme.of(context).appColors.foreground.withValues(alpha: 0.54))),
                  dropdownColor: Theme.of(context).cardColor,
                  icon: Icon(LucideIcons.chevron_down, color: Theme.of(context).appColors.foreground.withValues(alpha: 0.54), size: 16),
                  style: GoogleFonts.inter(color: Theme.of(context).appColors.foreground, fontSize: 14),
                  isExpanded: true,
                  items: availableTargets.map((s) {
                    return DropdownMenuItem<String>(
                      value: s['id'] as String,
                      child: Text(s['name'] ?? ''),
                    );
                  }).toList(),
                  onChanged: (v) {
                    setState(() => _targetSiteId = v);
                  },
                ),
              ),
            ),
            const SizedBox(height: 32),
            Row(
              mainAxisAlignment: MainAxisAlignment.end,
              children: [
                TextButton(
                  onPressed: () => Navigator.pop(context),
                  child: Text(
                    context.watch<LocaleProvider>().t('calendar.cancel') ?? 'Отмена',
                    style: GoogleFonts.inter(
                      color: Theme.of(context).appColors.foreground.withValues(alpha: 0.54),
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                ),
                const SizedBox(width: 8),
                ElevatedButton(
                  onPressed: _targetSiteId == null || _isLoading ? null : _merge,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: Theme.of(context).appColors.foreground,
                    foregroundColor: Theme.of(context).cardColor,
                    elevation: 0,
                    padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                  ),
                  child: _isLoading
                      ? SizedBox(
                          height: 16,
                          width: 16,
                          child: CircularProgressIndicator(strokeWidth: 2, color: Theme.of(context).cardColor),
                        )
                      : Text(
                          context.watch<LocaleProvider>().t('sites.merge_btn') ?? 'Объединить',
                          style: GoogleFonts.inter(fontWeight: FontWeight.bold),
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
