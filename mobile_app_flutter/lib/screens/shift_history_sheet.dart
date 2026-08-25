import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../services/auth_service.dart';

class ShiftHistorySheet extends StatefulWidget {
  const ShiftHistorySheet({Key? key}) : super(key: key);

  static void show(BuildContext context) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) => const ShiftHistorySheet(),
    );
  }

  @override
  State<ShiftHistorySheet> createState() => _ShiftHistorySheetState();
}

class _ShiftHistorySheetState extends State<ShiftHistorySheet> {
  bool _isLoading = true;
  List<Map<String, dynamic>> _shifts = [];

  @override
  void initState() {
    super.initState();
    _loadShifts();
  }

  Future<void> _loadShifts() async {
    final user = AuthService.currentUser;
    if (user == null) return;
    
    try {
      final data = await Supabase.instance.client
          .from('shifts')
          .select()
          .eq('user_id', user.id)
          .order('started_at', ascending: false)
          .limit(50);
      
      if (mounted) {
        setState(() {
          _shifts = List<Map<String, dynamic>>.from(data);
          _isLoading = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() => _isLoading = false);
      }
    }
  }

  String _formatDuration(int totalMs, int lunchMs) {
    final workMs = (totalMs - lunchMs).clamp(0, double.infinity).toInt();
    final h = workMs ~/ 3600000;
    final m = (workMs % 3600000) ~/ 60000;
    return '${h}ч ${m.toString().padLeft(2, '0')}м';
  }

  String _formatDate(String isoString) {
    final d = DateTime.parse(isoString).toLocal();
    return '${d.day.toString().padLeft(2, '0')}.${d.month.toString().padLeft(2, '0')}.${d.year} ${d.hour.toString().padLeft(2, '0')}:${d.minute.toString().padLeft(2, '0')}';
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      height: MediaQuery.of(context).size.height * 0.8,
      decoration: const BoxDecoration(
        color: Color(0xFF1E1E1E),
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      child: Column(
        children: [
          const SizedBox(height: 12),
          Container(
            width: 40,
            height: 4,
            decoration: BoxDecoration(
              color: Colors.white24,
              borderRadius: BorderRadius.circular(2),
            ),
          ),
          const SizedBox(height: 16),
          Text(
            'Мои смены',
            style: GoogleFonts.inter(
              color: Colors.white,
              fontSize: 18,
              fontWeight: FontWeight.bold,
            ),
          ),
          const SizedBox(height: 16),
          Expanded(
            child: _isLoading
                ? const Center(child: CircularProgressIndicator())
                : _shifts.isEmpty
                    ? Center(
                        child: Text(
                          'Нет данных о сменах',
                          style: GoogleFonts.inter(color: Colors.white54),
                        ),
                      )
                    : ListView.separated(
                        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                        itemCount: _shifts.length,
                        separatorBuilder: (ctx, i) => const Divider(color: Colors.white12),
                        itemBuilder: (context, index) {
                          final shift = _shifts[index];
                          final status = shift['status'] as String;
                          final siteName = shift['site_name'] as String? ?? 'Неизвестный объект';
                          final startStr = shift['started_at'] as String?;
                          final endStr = shift['ended_at'] as String?;
                          final lunchMs = shift['lunch_total_ms'] as int? ?? 0;
                          
                          int totalMs = 0;
                          if (startStr != null && endStr != null) {
                            final start = DateTime.parse(startStr);
                            final end = DateTime.parse(endStr);
                            totalMs = end.difference(start).inMilliseconds;
                          }

                          return ListTile(
                            contentPadding: EdgeInsets.zero,
                            title: Text(
                              siteName,
                              style: GoogleFonts.inter(color: Colors.white, fontWeight: FontWeight.w600),
                            ),
                            subtitle: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                const SizedBox(height: 4),
                                if (startStr != null)
                                  Text(
                                    'Начало: ${_formatDate(startStr)}',
                                    style: GoogleFonts.inter(color: Colors.white70, fontSize: 12),
                                  ),
                                if (endStr != null)
                                  Text(
                                    'Конец: ${_formatDate(endStr)}',
                                    style: GoogleFonts.inter(color: Colors.white70, fontSize: 12),
                                  ),
                              ],
                            ),
                            trailing: Column(
                              mainAxisAlignment: MainAxisAlignment.center,
                              crossAxisAlignment: CrossAxisAlignment.end,
                              children: [
                                Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                                  decoration: BoxDecoration(
                                    color: status == 'finished' ? Colors.blue.withOpacity(0.2) : Colors.green.withOpacity(0.2),
                                    borderRadius: BorderRadius.circular(8),
                                  ),
                                  child: Text(
                                    status == 'finished' ? 'Завершена' : 'Активна',
                                    style: GoogleFonts.inter(
                                      color: status == 'finished' ? Colors.blue : Colors.green,
                                      fontSize: 10,
                                      fontWeight: FontWeight.bold,
                                    ),
                                  ),
                                ),
                                const SizedBox(height: 4),
                                if (endStr != null)
                                  Text(
                                    _formatDuration(totalMs, lunchMs),
                                    style: GoogleFonts.inter(color: Colors.white, fontWeight: FontWeight.bold),
                                  ),
                              ],
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
