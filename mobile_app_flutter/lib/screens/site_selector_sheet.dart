import '../providers/translation_provider.dart';
import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:flutter_lucide/flutter_lucide.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:provider/provider.dart';
import '../theme/app_theme.dart';
import 'admin/dialogs/add_site_dialog.dart';
import '../providers/locale_provider.dart';
import '../utils/transliteration.dart';

class SiteSelectorSheet extends StatefulWidget {
  final String? initialSiteId;
  final ValueChanged<Map<String, dynamic>> onSelect;

  const SiteSelectorSheet({
    super.key,
    this.initialSiteId,
    required this.onSelect,
  });

  static Future<void> show(BuildContext context, {
    String? initialSiteId,
    required ValueChanged<Map<String, dynamic>> onSelect,
  }) {
    return showModalBottomSheet(
      context: context,
      backgroundColor: Colors.transparent,
      isScrollControlled: true,
      builder: (context) => SiteSelectorSheet(
        initialSiteId: initialSiteId,
        onSelect: onSelect,
      ),
    );
  }

  @override
  State<SiteSelectorSheet> createState() => _SiteSelectorSheetState();
}

class _SiteSelectorSheetState extends State<SiteSelectorSheet> {
  final _supabase = Supabase.instance.client;
  List<Map<String, dynamic>> _sites = [];
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _loadSites();
  }

  Future<void> _loadSites() async {
    try {
      final data = await _supabase
          .from('sites')
          .select('id, name, address, customer, comment')
          .order('created_at', ascending: false);
      
      if (mounted) {
        setState(() {
          _sites = List<Map<String, dynamic>>.from(data);
          _isLoading = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() => _isLoading = false);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(context.read<LocaleProvider>().t('site_selector.error') ?? 'Ошибка загрузки объектов')),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      height: MediaQuery.of(context).size.height * 0.75,
      decoration: BoxDecoration(
        color: Theme.of(context).cardColor,
        borderRadius: const BorderRadius.only(
          topLeft: Radius.circular(24),
          topRight: Radius.circular(24),
        ),
        border: Border.all(color: Theme.of(context).appColors.border),
      ),
      child: Column(
        children: [
          // Drag handle
          Center(
            child: Container(
              margin: const EdgeInsets.only(top: 12, bottom: 24),
              width: 40,
              height: 4,
              decoration: BoxDecoration(
                color: Theme.of(context).appColors.border,
                borderRadius: BorderRadius.circular(2),
              ),
            ),
          ),
          
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 24),
            child: Row(
              children: [
                Text(
                  context.watch<LocaleProvider>().t('siteDlg.title') ?? 'Выбор объекта',
                  style: GoogleFonts.inter(
                    fontSize: 20,
                    fontWeight: FontWeight.bold,
                    color: Colors.white,
                  ),
                ),
                  const Spacer(),
                  IconButton(
                    icon: const Icon(LucideIcons.plus, color: Colors.white),
                    onPressed: () async {
                      final result = await AddSiteDialog.show(context);
                      if (result == true) {
                        _loadSites();
                      }
                    },
                  ),
                  IconButton(
                    icon: const Icon(LucideIcons.x, color: Colors.white),
                    onPressed: () => Navigator.of(context).pop(),
                  )
              ],
            ),
          ),
          const SizedBox(height: 16),
          
          Expanded(
            child: _isLoading
                ? Center(child: CircularProgressIndicator(color: Theme.of(context).primaryColor))
                : _sites.isEmpty
                    ? Center(child: Text(context.watch<LocaleProvider>().t('site_selector.empty') ?? 'Нет доступных объектов', style: TextStyle(color: Theme.of(context).appColors.muted)))
                    : ListView.builder(
                        padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 8),
                        itemCount: _sites.length,
                        itemBuilder: (context, index) {
                          final site = _sites[index];
                          final isActive = site['id'] == widget.initialSiteId;
                          final currentLang = context.watch<LocaleProvider>().currentLang;
                          
                          return GestureDetector(
                            onTap: () {
                              widget.onSelect(site);
                              Navigator.of(context).pop();
                            },
                            child: Container(
                              margin: const EdgeInsets.only(bottom: 12),
                              padding: const EdgeInsets.all(16),
                              decoration: BoxDecoration(
                                color: isActive ? Theme.of(context).primaryColor.withValues(alpha: 0.05) : Colors.transparent,
                                borderRadius: BorderRadius.circular(16),
                                border: Border.all(
                                  color: isActive ? Theme.of(context).primaryColor : Theme.of(context).appColors.border,
                                ),
                              ),
                              child: Row(
                                children: [
                                  Container(
                                    padding: const EdgeInsets.all(12),
                                    decoration: BoxDecoration(
                                      color: Theme.of(context).primaryColor.withValues(alpha: 0.1),
                                      borderRadius: BorderRadius.circular(12),
                                    ),
                                    child: Icon(LucideIcons.map_pin, color: Theme.of(context).primaryColor, size: 20),
                                  ),
                                  const SizedBox(width: 16),
                                  Expanded(
                                    child: Column(
                                      crossAxisAlignment: CrossAxisAlignment.start,
                                      children: [
                                        Text(
                                          context.watch<TranslationProvider>().translate(site['name'] ?? context.read<LocaleProvider>().t('site_selector.no_name') ?? 'Без названия', currentLang),
                                          style: GoogleFonts.inter(
                                            fontSize: 16,
                                            fontWeight: FontWeight.w600,
                                            color: Colors.white,
                                          ),
                                        ),
                                        if (site['address'] != null && site['address'].toString().isNotEmpty) ...[
                                          const SizedBox(height: 4),
                                          Text(
                                            context.watch<TranslationProvider>().translate(site['address'], currentLang),
                                            style: GoogleFonts.inter(
                                              fontSize: 12,
                                              color: Theme.of(context).appColors.muted,
                                            ),
                                          ),
                                        ]
                                      ],
                                    ),
                                  ),
                                  if (isActive)
                                    Icon(LucideIcons.check, color: Theme.of(context).primaryColor),
                                ],
                              ),
                            ),
                          );
                        },
                      ),
          )
        ],
      ),
    );
  }
}
