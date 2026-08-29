import 'package:flutter/material.dart';

import 'google_map_embed_mobile.dart' if (dart.library.html) 'google_map_embed_web.dart';

class GoogleMapEmbed extends StatelessWidget {
  final String query;

  const GoogleMapEmbed({super.key, required this.query});

  @override
  Widget build(BuildContext context) {
    return GoogleMapEmbedImpl(query: query);
  }
}

