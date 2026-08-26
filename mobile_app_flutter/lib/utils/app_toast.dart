import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:flutter_lucide/flutter_lucide.dart';

class AppToast {
  static void show(BuildContext context, String message, {Color color = Colors.green, IconData? icon}) {
    ScaffoldMessenger.of(context).hideCurrentSnackBar();
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Row(
          children: [
            if (icon != null) ...[
              Icon(icon, color: Colors.white, size: 20),
              const SizedBox(width: 12),
            ],
            Expanded(
              child: Text(
                message,
                style: GoogleFonts.inter(color: Colors.white, fontSize: 14, fontWeight: FontWeight.w600),
              ),
            ),
          ],
        ),
        backgroundColor: color.withValues(alpha: 0.95),
        behavior: SnackBarBehavior.floating,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(12),
          side: BorderSide(color: Colors.white.withValues(alpha: 0.1)),
        ),
        margin: const EdgeInsets.only(bottom: 24, left: 16, right: 16),
        duration: const Duration(seconds: 3),
        elevation: 8,
      ),
    );
  }

  static void showSuccess(BuildContext context, String message) {
    show(context, message, color: const Color(0xFF10b981), icon: Icons.check_circle);
  }

  static void showWarning(BuildContext context, String message) {
    show(context, message, color: const Color(0xFFf59e0b), icon: Icons.warning_rounded);
  }

  static void showInfo(BuildContext context, String message) {
    show(context, message, color: const Color(0xFF3b82f6), icon: LucideIcons.info);
  }
}
