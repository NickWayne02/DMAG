import 'package:provider/provider.dart';
import 'package:mobile_app_flutter/providers/locale_provider.dart';
import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:flutter_lucide/flutter_lucide.dart';
import 'package:geolocator/geolocator.dart';

class AddSiteDialog extends StatefulWidget {
  final Map<String, dynamic>? site; // if null, creating new

  const AddSiteDialog({super.key, this.site});

  static Future<bool?> show(BuildContext context, [Map<String, dynamic>? site]) {
    return showDialog<bool>(
      context: context,
      builder: (ctx) => AddSiteDialog(site: site),
    );
  }

  @override
  State<AddSiteDialog> createState() => _AddSiteDialogState();
}

class _AddSiteDialogState extends State<AddSiteDialog> {
  final _formKey = GlobalKey<FormState>();
  
  late TextEditingController _nameCtrl;
  late TextEditingController _addressCtrl;
  late TextEditingController _customerCtrl;
  late TextEditingController _commentCtrl;
  
  bool _isLoading = false;
  bool _isGpsLoading = false;

  @override
  void initState() {
    super.initState();
    _nameCtrl = TextEditingController(text: widget.site?['name'] ?? '');
    _addressCtrl = TextEditingController(text: widget.site?['address'] ?? '');
    _customerCtrl = TextEditingController(text: widget.site?['customer'] ?? '');
    _commentCtrl = TextEditingController(text: widget.site?['comment'] ?? '');
  }

  @override
  void dispose() {
    _nameCtrl.dispose();
    _addressCtrl.dispose();
    _customerCtrl.dispose();
    _commentCtrl.dispose();
    super.dispose();
  }

  Future<void> _fillFromGps() async {
    setState(() => _isGpsLoading = true);
    try {
      bool serviceEnabled = await Geolocator.isLocationServiceEnabled();
      if (!serviceEnabled) {
        throw Exception(context.read<LocaleProvider>().t('location.error_disabled') ?? 'Службы геолокации отключены.');
      }

      LocationPermission permission = await Geolocator.checkPermission();
      if (permission == LocationPermission.denied) {
        permission = await Geolocator.requestPermission();
        if (permission == LocationPermission.denied) {
          throw Exception(context.read<LocaleProvider>().t('location.error_denied') ?? 'Доступ к геолокации запрещен.');
        }
      }

      if (permission == LocationPermission.deniedForever) {
        throw Exception(context.read<LocaleProvider>().t('location.error_denied_forever') ?? 'Доступ к геолокации запрещен навсегда.');
      }

      Position position = await Geolocator.getCurrentPosition(desiredAccuracy: LocationAccuracy.high);
      
      setState(() {
        _addressCtrl.text = 'GPS: ${position.latitude.toStringAsFixed(5)}, ${position.longitude.toStringAsFixed(5)}';
        if (_nameCtrl.text.isEmpty) {
          _nameCtrl.text = context.read<LocaleProvider>().t('add_site.new') ?? 'Новый объект';
        }
      });
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Ошибка GPS: $e')));
      }
    } finally {
      setState(() => _isGpsLoading = false);
    }
  }

  Future<void> _save() async {
    if (!_formKey.currentState!.validate()) return;
    
    setState(() => _isLoading = true);
    
    try {
      final user = Supabase.instance.client.auth.currentUser;
      if (user == null) throw Exception(context.read<LocaleProvider>().t('auth.error_unauthorized') ?? 'Пользователь не авторизован');

      final data = {
        'name': _nameCtrl.text.trim(),
        'address': _addressCtrl.text.trim().isEmpty ? null : _addressCtrl.text.trim(),
        'customer': _customerCtrl.text.trim().isEmpty ? null : _customerCtrl.text.trim(),
      };

      if (widget.site == null) {
        data['created_by'] = user.id;
        await Supabase.instance.client.from('sites').insert(data);
      } else {
        await Supabase.instance.client.from('sites').update(data).eq('id', widget.site!['id']);
      }
      
      if (mounted) {
        Navigator.pop(context, true); // Return true on success
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Ошибка сохранения: $e')));
      }
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  InputDecoration _inputDeco(String hint) {
    return InputDecoration(
      hintText: hint,
      hintStyle: GoogleFonts.inter(color: Colors.white38, fontSize: 16),
      filled: true,
      fillColor: Colors.black, // Dark input background
      enabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: const BorderSide(color: Colors.white12),
      ),
      focusedBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: const BorderSide(color: Colors.white38),
      ),
      contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Dialog(
      backgroundColor: Colors.black,
      insetPadding: const EdgeInsets.all(16),
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(20),
        side: const BorderSide(color: Colors.white12),
      ),
      child: Container(
        width: double.infinity,
        padding: const EdgeInsets.all(24),
        child: SingleChildScrollView(
          child: Form(
            key: _formKey,
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Stack(
                  alignment: Alignment.topRight,
                  children: [
                    Container(
                      width: double.infinity,
                      padding: const EdgeInsets.only(top: 8, bottom: 24),
                      child: Column(
                        children: [
                          Text(
                            widget.site == null ? context.read<LocaleProvider>().t('add_site.new') ?? 'Новый объект' : context.read<LocaleProvider>().t('add_site.edit') ?? 'Редактировать объект',
                            textAlign: TextAlign.center,
                            style: GoogleFonts.inter(
                              color: Colors.white,
                              fontSize: 20,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                          const SizedBox(height: 8),
                          Text(
                            context.watch<LocaleProvider>().t('add_site.subtitle') ?? 'Заполните данные строительной площадки',
                            textAlign: TextAlign.center,
                            style: GoogleFonts.inter(
                              color: Colors.white70,
                              fontSize: 14,
                            ),
                          ),
                        ],
                      ),
                    ),
                    IconButton(
                      icon: const Icon(LucideIcons.x, color: Colors.white70, size: 20),
                      onPressed: () => Navigator.pop(context),
                      padding: EdgeInsets.zero,
                      constraints: const BoxConstraints(),
                    ),
                  ],
                ),
                
                Padding(
                  padding: const EdgeInsets.only(bottom: 24),
                  child: OutlinedButton.icon(
                    style: OutlinedButton.styleFrom(
                      side: const BorderSide(color: Colors.white24),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                      padding: const EdgeInsets.symmetric(vertical: 16),
                      minimumSize: const Size.fromHeight(56),
                      backgroundColor: Colors.black,
                    ),
                    icon: _isGpsLoading 
                      ? const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                      : const Icon(LucideIcons.map_pin, size: 18, color: Colors.white),
                    label: Text(
                      context.watch<LocaleProvider>().t('add_site.gps') ?? 'Определить по GPS',
                      style: GoogleFonts.inter(color: Colors.white, fontSize: 16, fontWeight: FontWeight.bold),
                    ),
                    onPressed: _isGpsLoading ? null : _fillFromGps,
                  ),
                ),

                Text(context.watch<LocaleProvider>().t('add_site.name_lbl') ?? 'Название *', style: GoogleFonts.inter(color: Colors.white, fontSize: 15, fontWeight: FontWeight.bold)),
                const SizedBox(height: 8),
                TextFormField(
                  controller: _nameCtrl,
                  style: GoogleFonts.inter(color: Colors.white, fontSize: 16),
                  decoration: _inputDeco(context.watch<LocaleProvider>().t('add_site.name_hint') ?? 'Название объекта'),
                  validator: (v) => v == null || v.isEmpty ? context.read<LocaleProvider>().t('add_site.required') ?? 'Обязательное поле' : null,
                ),
                const SizedBox(height: 20),

                Text(context.watch<LocaleProvider>().t('add_site.address_lbl') ?? 'Адрес', style: GoogleFonts.inter(color: Colors.white, fontSize: 15, fontWeight: FontWeight.bold)),
                const SizedBox(height: 8),
                TextFormField(
                  controller: _addressCtrl,
                  style: GoogleFonts.inter(color: Colors.white, fontSize: 16),
                  decoration: _inputDeco(context.watch<LocaleProvider>().t('add_site.address_hint') ?? 'GPS: широта, долгота или адрес'),
                ),
                const SizedBox(height: 20),

                Text(context.watch<LocaleProvider>().t('add_site.client') ?? 'Заказчик', style: GoogleFonts.inter(color: Colors.white, fontSize: 15, fontWeight: FontWeight.bold)),
                const SizedBox(height: 8),
                TextFormField(
                  controller: _customerCtrl,
                  style: GoogleFonts.inter(color: Colors.white, fontSize: 16),
                  decoration: _inputDeco('DMAG'),
                ),
                const SizedBox(height: 32),
                
                Column(
                  children: [
                    ElevatedButton(
                      style: ElevatedButton.styleFrom(
                        backgroundColor: const Color(0xFF334155), // Slate-700 / Grayish blue
                        foregroundColor: Colors.black,
                        padding: const EdgeInsets.symmetric(vertical: 16),
                        minimumSize: const Size.fromHeight(56),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                      ),
                      onPressed: _isLoading ? null : _save,
                      child: _isLoading
                          ? const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.black))
                          : Text(context.watch<LocaleProvider>().t('calendar.save') ?? 'Сохранить', style: GoogleFonts.inter(fontWeight: FontWeight.bold, fontSize: 16, color: Colors.black)),
                    ),
                    const SizedBox(height: 12),
                    TextButton(
                      style: TextButton.styleFrom(
                        minimumSize: const Size.fromHeight(48),
                      ),
                      onPressed: () => Navigator.pop(context),
                      child: Text(context.watch<LocaleProvider>().t('calendar.cancel') ?? 'Отмена', style: GoogleFonts.inter(color: Colors.white, fontSize: 16, fontWeight: FontWeight.bold)),
                    ),
                  ],
                )
              ],
            ),
          ),
        ),
      ),
    );
  }
}
