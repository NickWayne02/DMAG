import 'package:provider/provider.dart';
import 'package:mobile_app_flutter/providers/locale_provider.dart';
import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:flutter_lucide/flutter_lucide.dart';

class ReportsTab extends StatefulWidget {
  const ReportsTab({Key? key}) : super(key: key);

  @override
  State<ReportsTab> createState() => _ReportsTabState();
}

class _ReportsTabState extends State<ReportsTab> {
  String _searchQuery = '';
  String? _selectedSite;
  String? _selectedTime;

  
  

  InputDecoration _inputDeco(String hint) {
    return InputDecoration(
      hintText: hint,
      hintStyle: GoogleFonts.inter(color: Colors.white38, fontSize: 14),
      filled: true,
      fillColor: Colors.black,
      contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
      enabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(16),
        borderSide: const BorderSide(color: Colors.white12),
      ),
      focusedBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(16),
        borderSide: const BorderSide(color: Colors.white38),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final List<String> _sites = [context.watch<LocaleProvider>().t('dashboard.all_sites') ?? 'Все объекты', 'Bellershausen', 'Светловодск', 'Giengen', 'Freudenberg'];
    final List<String> _times = [context.watch<LocaleProvider>().t('dashboard.time_all') ?? 'За всё время', context.watch<LocaleProvider>().t('dashboard.time_today') ?? 'За сегодня', context.watch<LocaleProvider>().t('dashboard.time_week') ?? 'За неделю', context.watch<LocaleProvider>().t('dashboard.time_month') ?? 'За месяц'];

    return Padding(
      padding: const EdgeInsets.all(16.0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Text(
                context.watch<LocaleProvider>().t('reports.title') ?? 'Фотоотчёты',
                style: GoogleFonts.inter(color: Colors.white, fontSize: 20, fontWeight: FontWeight.bold),
              ),
            ],
          ),
          const SizedBox(height: 16),
          Expanded(
            child: Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: const Color(0xFF09090b),
                borderRadius: BorderRadius.circular(20),
                border: Border.all(color: Colors.white12),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              context.watch<LocaleProvider>().t('reports.feed_title') ?? 'Лента фотоотчётов',
                              style: GoogleFonts.inter(color: Colors.white, fontSize: 16, fontWeight: FontWeight.bold),
                            ),
                            const SizedBox(height: 4),
                            Text(
                              context.watch<LocaleProvider>().t('reports.feed_subtitle') ?? 'Последние загрузки со всех объектов',
                              style: GoogleFonts.inter(color: Colors.white54, fontSize: 12),
                            ),
                          ],
                        ),
                      ),
                      OutlinedButton.icon(
                        style: OutlinedButton.styleFrom(
                          side: const BorderSide(color: Colors.white12),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
                          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                          foregroundColor: Colors.white,
                        ),
                        icon: const Icon(LucideIcons.download, size: 14),
                        label: Text(context.watch<LocaleProvider>().t('reports.export') ?? 'Экспорт', style: GoogleFonts.inter(fontSize: 12, fontWeight: FontWeight.bold)),
                        onPressed: () {
                          // export logic
                        },
                      ),
                    ],
                  ),
                  const SizedBox(height: 20),
                  
                  // Search
                  TextField(
                    onChanged: (val) => setState(() => _searchQuery = val),
                    style: GoogleFonts.inter(color: Colors.white, fontSize: 14),
                    decoration: _inputDeco(context.watch<LocaleProvider>().t('reports.search') ?? 'Поиск по описанию...'),
                  ),
                  const SizedBox(height: 12),
                  
                  // Dropdown 1
                  Container(
                    width: double.infinity,
                    padding: const EdgeInsets.symmetric(horizontal: 16),
                    decoration: BoxDecoration(
                      color: Colors.black,
                      borderRadius: BorderRadius.circular(16),
                      border: Border.all(color: Colors.white12),
                    ),
                    child: DropdownButtonHideUnderline(
                      child: DropdownButton<String>(
                        value: _sites.contains(_selectedSite) ? _selectedSite : _sites.first,
                        dropdownColor: const Color(0xFF18181b),
                        icon: const Icon(LucideIcons.chevron_down, color: Colors.white54, size: 16),
                        style: GoogleFonts.inter(color: Colors.white, fontSize: 14),
                        items: _sites.map((s) => DropdownMenuItem(value: s, child: Text(s))).toList(),
                        onChanged: (v) {
                          if (v != null) setState(() => _selectedSite = v);
                        },
                      ),
                    ),
                  ),
                  const SizedBox(height: 12),

                  // Dropdown 2
                  Container(
                    width: double.infinity,
                    padding: const EdgeInsets.symmetric(horizontal: 16),
                    decoration: BoxDecoration(
                      color: Colors.black,
                      borderRadius: BorderRadius.circular(16),
                      border: Border.all(color: Colors.white12),
                    ),
                    child: DropdownButtonHideUnderline(
                      child: DropdownButton<String>(
                        value: _times.contains(_selectedTime) ? _selectedTime : _times.first,
                        dropdownColor: const Color(0xFF18181b),
                        icon: const Icon(LucideIcons.chevron_down, color: Colors.white54, size: 16),
                        style: GoogleFonts.inter(color: Colors.white, fontSize: 14),
                        items: _times.map((t) => DropdownMenuItem(value: t, child: Text(t))).toList(),
                        onChanged: (v) {
                          if (v != null) setState(() => _selectedTime = v);
                        },
                      ),
                    ),
                  ),
                  
                  const SizedBox(height: 24),
                  
                  // Empty state
                  Expanded(
                    child: CustomPaint(
                      painter: _DashedRectPainter(color: Colors.white12, strokeWidth: 1.5, gap: 6),
                      child: Container(
                        width: double.infinity,
                        padding: const EdgeInsets.all(24),
                        child: Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Container(
                              padding: const EdgeInsets.all(16),
                              decoration: BoxDecoration(
                                color: Colors.white.withOpacity(0.05),
                                shape: BoxShape.circle,
                              ),
                              child: const Icon(LucideIcons.camera, color: Colors.white38, size: 32),
                            ),
                            const SizedBox(height: 16),
                            Text(
                              context.watch<LocaleProvider>().t('reports.empty') ?? 'Отчётов пока нет',
                              style: GoogleFonts.inter(color: Colors.white54, fontSize: 14),
                            ),
                          ],
                        ),
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _DashedRectPainter extends CustomPainter {
  final Color color;
  final double strokeWidth;
  final double gap;

  _DashedRectPainter({required this.color, required this.strokeWidth, required this.gap});

  @override
  void paint(Canvas canvas, Size size) {
    final Paint paint = Paint()
      ..color = color
      ..strokeWidth = strokeWidth
      ..style = PaintingStyle.stroke;

    final double dashWidth = gap;
    final double dashSpace = gap;

    final Path path = Path();
    
    // Draw top
    double startX = 0;
    while (startX < size.width) {
      path.moveTo(startX, 0);
      path.lineTo(startX + dashWidth, 0);
      startX += dashWidth + dashSpace;
    }
    // Draw right
    double startY = 0;
    while (startY < size.height) {
      path.moveTo(size.width, startY);
      path.lineTo(size.width, startY + dashWidth);
      startY += dashWidth + dashSpace;
    }
    // Draw bottom
    startX = size.width;
    while (startX > 0) {
      path.moveTo(startX, size.height);
      path.lineTo(startX - dashWidth, size.height);
      startX -= dashWidth + dashSpace;
    }
    // Draw left
    startY = size.height;
    while (startY > 0) {
      path.moveTo(0, startY);
      path.lineTo(0, startY - dashWidth);
      startY -= dashWidth + dashSpace;
    }

    // Add rounded corners manually with arcs or just keep it simple rectangle since it's just for empty state
    // Let's draw rounded rectangle with dash
    final RRect rrect = RRect.fromRectAndRadius(Rect.fromLTWH(0, 0, size.width, size.height), const Radius.circular(24));
    
    // To properly dash a RRect, we use PathMetrics
    Path rrectPath = Path()..addRRect(rrect);
    Path dashedPath = Path();
    for (var metric in rrectPath.computeMetrics()) {
      double distance = 0.0;
      while (distance < metric.length) {
        dashedPath.addPath(
          metric.extractPath(distance, distance + dashWidth),
          Offset.zero,
        );
        distance += dashWidth + dashSpace;
      }
    }
    
    canvas.drawPath(dashedPath, paint);
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}
