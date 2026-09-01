import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:flutter_lucide/flutter_lucide.dart';
import '../utils/translation.dart';

class TranslatedMessageContent extends StatefulWidget {
  final String id;
  final String content;
  final String? sourceLang;
  final String targetLang;
  final bool isMine;
  final bool isPhotoReport;
  final String translatingText;

  const TranslatedMessageContent({
    Key? key,
    required this.id,
    required this.content,
    this.sourceLang,
    required this.targetLang,
    required this.isMine,
    required this.translatingText,
    this.isPhotoReport = false,
  }) : super(key: key);

  @override
  State<TranslatedMessageContent> createState() => _TranslatedMessageContentState();
}

class _TranslatedMessageContentState extends State<TranslatedMessageContent> {
  String? _translatedText;
  bool _isLoading = false;

  @override
  void initState() {
    super.initState();
    _translate();
  }

  @override
  void didUpdateWidget(TranslatedMessageContent oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.targetLang != widget.targetLang || oldWidget.content != widget.content) {
      _translate();
    }
  }

  Future<void> _translate() async {
    final sLang = widget.sourceLang ?? 'auto';
    if (sLang != 'auto' && sLang == widget.targetLang) {
      if (_translatedText != null) {
        setState(() => _translatedText = null);
      }
      return;
    }

    setState(() => _isLoading = true);
    final result = await TranslationService.translate(
      text: widget.content,
      sourceLang: sLang,
      targetLang: widget.targetLang,
    );

    if (mounted) {
      setState(() {
        _translatedText = result;
        _isLoading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_isLoading) {
      return Container(
        margin: const EdgeInsets.only(top: 6),
        padding: const EdgeInsets.only(top: 6),
        decoration: BoxDecoration(
          border: Border(top: BorderSide(color: Colors.grey.withValues(alpha: 0.2))),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(LucideIcons.languages, size: 12, color: Colors.grey),
            const SizedBox(width: 4),
            Text(
              widget.translatingText,
              style: GoogleFonts.inter(fontStyle: FontStyle.italic, fontSize: 12, color: Colors.grey),
            ),
          ],
        ),
      );
    }
    
    if (_translatedText != null && _translatedText != widget.content) {
      return Container(
        margin: const EdgeInsets.only(top: 6),
        padding: const EdgeInsets.only(top: 6),
        decoration: BoxDecoration(
          border: Border(top: BorderSide(color: Colors.grey.withValues(alpha: 0.2))),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                const Icon(LucideIcons.languages, size: 12, color: Colors.grey),
                const SizedBox(width: 4),
                Text(
                  widget.targetLang.toUpperCase(),
                  style: GoogleFonts.inter(fontWeight: FontWeight.bold, fontSize: 10, color: Colors.grey, letterSpacing: 1),
                ),
              ],
            ),
            const SizedBox(height: 4),
            Text(
              _translatedText!,
              style: GoogleFonts.inter(fontSize: 14, color: Colors.grey.shade400),
            ),
          ],
        ),
      );
    }
    
    return const SizedBox.shrink();
  }
}
