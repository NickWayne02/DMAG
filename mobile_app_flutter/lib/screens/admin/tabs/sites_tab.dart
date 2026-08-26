import '../../../utils/transliteration.dart';
import 'package:provider/provider.dart';
import 'package:mobile_app_flutter/providers/locale_provider.dart';
import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:flutter_lucide/flutter_lucide.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../dialogs/add_site_dialog.dart';

class SitesTab extends StatefulWidget {
  const SitesTab({super.key});

  @override
  State<SitesTab> createState() => _SitesTabState();
}

class _SitesTabState extends State<SitesTab> {
  List<Map<String, dynamic>> _sites = [];
  List<Map<String, dynamic>> _filteredSites = [];
  bool _isLoading = true;
  String _searchQuery = '';

  @override
  void initState() {
    super.initState();
    _fetchSites();
  }

  Future<void> _fetchSites() async {
    setState(() => _isLoading = true);
    try {
      final response = await Supabase.instance.client
          .from('sites')
          .select()
          .order('created_at', ascending: false);

      if (mounted) {
        setState(() {
          _sites = List<Map<String, dynamic>>.from(response);
          _applyFilter();
          _isLoading = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() => _isLoading = false);
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Ошибка загрузки: $e')));
      }
    }
  }

  void _applyFilter() {
    if (_searchQuery.isEmpty) {
      _filteredSites = List.from(_sites);
    } else {
      final q = _searchQuery.toLowerCase();
      _filteredSites = _sites.where((s) {
        final name = (s['name'] ?? '').toLowerCase();
        final addr = (s['address'] ?? '').toLowerCase();
        return name.contains(q) || addr.contains(q);
      }).toList();
    }
  }

  Future<void> _deleteSite(String id) async {
    bool? confirm = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: const Color(0xFF09090b),
        title: Text(context.read<LocaleProvider>().t('sites.delete_title') ?? 'Удаление', style: GoogleFonts.inter(color: Colors.white)),
        content: Text(context.read<LocaleProvider>().t('sites.delete_msg') ?? 'Вы уверены, что хотите удалить этот объект?', style: GoogleFonts.inter(color: Colors.white70)),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: Text(context.watch<LocaleProvider>().t('calendar.cancel') ?? 'Отмена', style: GoogleFonts.inter(color: Colors.white54)),
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
      await Supabase.instance.client.from('sites').delete().eq('id', id);
      _fetchSites();
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Ошибка удаления: $e')));
      }
    }
  }

  Future<void> _showSiteDialog([Map<String, dynamic>? site]) async {
    final result = await showDialog<bool>(
      context: context,
      builder: (ctx) => AddSiteDialog(site: site),
    );

    if (result == true) {
      _fetchSites();
    }
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
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          children: [
                            Text(
                              context.watch<LocaleProvider>().t('sites.title') ?? 'Объекты',
                              style: GoogleFonts.inter(color: Colors.white, fontSize: 18, fontWeight: FontWeight.bold),
                            ),
                            const SizedBox(width: 8),
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                              decoration: BoxDecoration(
                                color: Colors.white12,
                                borderRadius: BorderRadius.circular(12),
                              ),
                              child: Text(
                                '${_sites.length}',
                                style: GoogleFonts.inter(color: Colors.white, fontSize: 12, fontWeight: FontWeight.bold),
                              ),
                            )
                          ],
                        ),
                        const SizedBox(height: 4),
                        Text(
                          context.watch<LocaleProvider>().t('sites.subtitle') ?? 'Строительные площадки из базы данных',
                          style: GoogleFonts.inter(color: Colors.white54, fontSize: 12),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(width: 8),
                  OutlinedButton.icon(
                    style: OutlinedButton.styleFrom(
                      side: const BorderSide(color: Colors.white12),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
                      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                    ),
                    icon: const Icon(LucideIcons.plus, color: Colors.white, size: 14),
                    label: Text(context.watch<LocaleProvider>().t('sites.add') ?? 'Добавить', style: GoogleFonts.inter(color: Colors.white, fontSize: 12)),
                    onPressed: () => _showSiteDialog(),
                  ),
                ],
              ),
              const SizedBox(height: 16),
              TextField(
                onChanged: (val) {
                  setState(() {
                    _searchQuery = val;
                    _applyFilter();
                  });
                },
                style: GoogleFonts.inter(color: Colors.white, fontSize: 14),
                decoration: InputDecoration(
                  hintText: context.watch<LocaleProvider>().t('sites.search') ?? 'Поиск объекта...',
                  hintStyle: GoogleFonts.inter(color: Colors.white38),
                  prefixIcon: const Icon(LucideIcons.search, color: Colors.white38, size: 18),
                  filled: true,
                  fillColor: const Color(0xFF09090b),
                  contentPadding: const EdgeInsets.symmetric(vertical: 0, horizontal: 16),
                  enabledBorder: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(16),
                    borderSide: const BorderSide(color: Colors.white12),
                  ),
                  focusedBorder: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(16),
                    borderSide: const BorderSide(color: Colors.white38),
                  ),
                ),
              ),
            ],
          ),
        ),
        
        Expanded(
          child: _isLoading
              ? const Center(child: CircularProgressIndicator(color: Colors.white54))
              : _filteredSites.isEmpty
                  ? Center(
                      child: Text(context.watch<LocaleProvider>().t('sites.empty') ?? 'Нет объектов', style: GoogleFonts.inter(color: Colors.white54)),
                    )
                  : ListView.builder(
                      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                      itemCount: _filteredSites.length,
                      itemBuilder: (context, index) {
                        final site = _filteredSites[index];
                        final address = site['address']?.toString() ?? '';
                        final isGpsAuto = address.toUpperCase().startsWith('GPS:');
                        
                        return Container(
                          margin: const EdgeInsets.only(bottom: 12),
                          padding: const EdgeInsets.all(16),
                          decoration: BoxDecoration(
                            color: const Color(0xFF09090b),
                            border: Border.all(color: Colors.white12),
                            borderRadius: BorderRadius.circular(16),
                          ),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Row(
                                children: [
                                  Expanded(
                                    child: Text(
                                      TransliterationService.transliterateIfNeeded(site['name'] ?? context.watch<LocaleProvider>().t('sites.no_name') ?? 'Без названия', context.read<LocaleProvider>().currentLang),
                                      style: GoogleFonts.inter(color: Colors.white, fontSize: 16, fontWeight: FontWeight.bold),
                                    ),
                                  ),
                                  IconButton(
                                    icon: const Icon(LucideIcons.pencil, color: Colors.white70, size: 16),
                                    onPressed: () => _showSiteDialog(site),
                                    constraints: const BoxConstraints(),
                                    padding: const EdgeInsets.all(8),
                                  ),
                                  IconButton(
                                    icon: const Icon(LucideIcons.trash_2, color: Colors.redAccent, size: 16),
                                    onPressed: () => _deleteSite(site['id']),
                                    constraints: const BoxConstraints(),
                                    padding: const EdgeInsets.all(8),
                                  ),
                                ],
                              ),
                              const SizedBox(height: 8),
                              if (address.isNotEmpty) ...[
                                Row(
                                  children: [
                                    const Icon(LucideIcons.map_pin, color: Colors.white54, size: 14),
                                    const SizedBox(width: 6),
                                    Expanded(
                                      child: Text(
                                        TransliterationService.transliterateIfNeeded(address, context.read<LocaleProvider>().currentLang),
                                        style: GoogleFonts.inter(color: Colors.cyan[200], fontSize: 13),
                                      ),
                                    ),
                                  ],
                                ),
                                const SizedBox(height: 4),
                              ],
                              if (isGpsAuto) ...[
                                Row(
                                  children: [
                                    const Icon(LucideIcons.building, color: Colors.white54, size: 14),
                                    const SizedBox(width: 6),
                                    Text(
                                      'GPS Auto',
                                      style: GoogleFonts.inter(color: Colors.white54, fontSize: 13),
                                    ),
                                  ],
                                ),
                                const SizedBox(height: 4),
                              ],
                              const Padding(
                                padding: EdgeInsets.symmetric(vertical: 12),
                                child: Divider(color: Colors.white12, height: 1),
                              ),
                              Row(
                                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                children: [
                                  Text(
                                    context.watch<LocaleProvider>().t('sites.employees') ?? 'Сотрудников:',
                                    style: GoogleFonts.inter(color: Colors.white54, fontSize: 12),
                                  ),
                                  Container(
                                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                                    decoration: BoxDecoration(
                                      color: Colors.white12,
                                      borderRadius: BorderRadius.circular(12),
                                    ),
                                    child: Text(
                                      '0', // Placeholder
                                      style: GoogleFonts.inter(color: Colors.white, fontSize: 12, fontWeight: FontWeight.bold),
                                    ),
                                  ),
                                ],
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
