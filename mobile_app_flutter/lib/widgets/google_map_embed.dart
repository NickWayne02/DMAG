import 'package:flutter/material.dart';

import 'google_map_embed_mobile.dart' if (dart.library.html) 'google_map_embed_web.dart';

import 'package:flutter_lucide/flutter_lucide.dart';
import 'package:url_launcher/url_launcher.dart';

class GoogleMapEmbed extends StatefulWidget {
  final String query;

  const GoogleMapEmbed({super.key, required this.query});

  @override
  State<GoogleMapEmbed> createState() => _GoogleMapEmbedState();
}

class _GoogleMapEmbedState extends State<GoogleMapEmbed> {
  String _mapType = 'm';

  @override
  Widget build(BuildContext context) {
    return Stack(
      children: [
        Positioned.fill(
          child: GoogleMapEmbedImpl(query: widget.query, mapType: _mapType),
        ),
        Positioned(
          top: 8,
          right: 8,
          child: Column(
            children: [
              _buildOverlayButton(
                icon: LucideIcons.layers,
                onTap: () {
                  setState(() {
                    _mapType = _mapType == 'm' ? 'k' : 'm';
                  });
                },
              ),
              const SizedBox(height: 8),
              _buildOverlayButton(
                icon: LucideIcons.navigation,
                onTap: () {
                  final queryUrl = Uri.encodeComponent(widget.query.replaceAll(RegExp(r'^GPS:\s*', caseSensitive: false), ''));
                  launchUrl(Uri.parse('https://www.google.com/maps/dir/?api=1&destination=$queryUrl'), mode: LaunchMode.externalApplication);
                },
              ),
              const SizedBox(height: 8),
              _buildOverlayButton(
                icon: LucideIcons.external_link,
                onTap: () {
                  final queryUrl = Uri.encodeComponent(widget.query.replaceAll(RegExp(r'^GPS:\s*', caseSensitive: false), ''));
                  launchUrl(Uri.parse('https://www.google.com/maps/search/?api=1&query=$queryUrl'), mode: LaunchMode.externalApplication);
                },
              ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildOverlayButton({required IconData icon, required VoidCallback onTap}) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        width: 32,
        height: 32,
        decoration: BoxDecoration(
          color: Colors.black.withValues(alpha: 0.5),
          shape: BoxShape.circle,
          border: Border.all(color: Colors.white.withValues(alpha: 0.2)),
        ),
        child: Icon(icon, color: Colors.white, size: 16),
      ),
    );
  }
}

