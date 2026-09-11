import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../providers/locale_provider.dart';
import '../providers/theme_provider.dart';
import '../providers/shift_provider.dart';
import 'bounce_button.dart';
import '../theme/app_theme.dart';

class PresetSelectorSheet extends StatefulWidget {
  final ShiftProvider shift;

  const PresetSelectorSheet({super.key, required this.shift});

  static void show(BuildContext context, ShiftProvider shift) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (c) => PresetSelectorSheet(shift: shift),
    );
  }

  @override
  State<PresetSelectorSheet> createState() => _PresetSelectorSheetState();
}

class _PresetSelectorSheetState extends State<PresetSelectorSheet> {
  List<Map<String, dynamic>> _presets = [];
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _loadPresets();
  }

  Future<void> _loadPresets() async {
    try {
      final data = await Supabase.instance.client
          .from('app_branding_presets')
          .select()
          .order('created_at');
      if (mounted) {
        setState(() {
          _presets = List<Map<String, dynamic>>.from(data);
          _isLoading = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() => _isLoading = false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final colors = Theme.of(context).appColors;
    final t = context.watch<LocaleProvider>().t;

    return Container(
      height: MediaQuery.of(context).size.height * 0.7,
      decoration: BoxDecoration(
        color: colors.background,
        borderRadius: const BorderRadius.vertical(top: Radius.circular(24)),
      ),
      child: Column(
        children: [
          const SizedBox(height: 12),
          Container(width: 40, height: 4, decoration: BoxDecoration(color: colors.foreground.withValues(alpha: 0.2), borderRadius: BorderRadius.circular(2))),
          const SizedBox(height: 16),
          Text(
            t('dashboard.select_firm') ?? 'Выберите Фирму',
            style: GoogleFonts.inter(fontSize: 18, fontWeight: FontWeight.bold, color: colors.foreground),
          ),
          const SizedBox(height: 16),
          Expanded(
            child: _isLoading
                ? Center(child: CircularProgressIndicator(color: colors.foreground))
                : ListView.builder(
                    padding: const EdgeInsets.symmetric(horizontal: 16),
                    itemCount: _presets.length,
                    itemBuilder: (context, index) {
                      final preset = _presets[index];
                      final isSelected = widget.shift.selectedPreset?['id'] == preset['id'];

                      return BounceButton(
                        onTap: () {
                          widget.shift.setSelectedPreset(preset);
                          Navigator.of(context).pop();
                        },
                        child: Container(
                          margin: const EdgeInsets.only(bottom: 8),
                          padding: const EdgeInsets.all(16),
                          decoration: BoxDecoration(
                            color: isSelected ? context.watch<ThemeProvider>().activeAccent.primary.withValues(alpha: 0.1) : colors.card,
                            borderRadius: BorderRadius.circular(16),
                            border: Border.all(
                              color: isSelected ? context.watch<ThemeProvider>().activeAccent.primary : colors.border,
                            ),
                          ),
                          child: Row(
                            children: [
                              Container(
                                width: 40,
                                height: 40,
                                decoration: BoxDecoration(
                                  borderRadius: BorderRadius.circular(8),
                                  color: colors.background,
                                  image: preset['app_logo_url'] != null
                                      ? DecorationImage(
                                          image: NetworkImage(preset['app_logo_url']),
                                          fit: BoxFit.cover,
                                        )
                                      : null,
                                ),
                                child: preset['app_logo_url'] == null
                                    ? Center(child: Icon(Icons.business, color: colors.foreground.withValues(alpha: 0.5)))
                                    : null,
                              ),
                              const SizedBox(width: 16),
                              Expanded(
                                child: Text(
                                  preset['app_name'] ?? 'DMAG',
                                  style: GoogleFonts.inter(
                                    fontSize: 16,
                                    fontWeight: FontWeight.bold,
                                    color: colors.foreground,
                                  ),
                                ),
                              ),
                              if (isSelected)
                                Icon(Icons.check_circle, color: context.watch<ThemeProvider>().activeAccent.primary),
                            ],
                          ),
                        ),
                      );
                    },
                  ),
          ),
        ],
      ),
    );
  }
}
