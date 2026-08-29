import 'package:flutter/material.dart';
// ignore: avoid_web_libraries_in_flutter
import 'dart:html' as html;
import 'dart:ui_web' as ui_web;

class GoogleMapEmbedImpl extends StatefulWidget {
  final String query;

  const GoogleMapEmbedImpl({super.key, required this.query});

  @override
  State<GoogleMapEmbedImpl> createState() => _GoogleMapEmbedImplState();
}

class _GoogleMapEmbedImplState extends State<GoogleMapEmbedImpl> {
  late String _viewType;

  @override
  void initState() {
    super.initState();
    _viewType = 'google-map-${DateTime.now().microsecondsSinceEpoch}-${widget.query.hashCode}';
    
    // Register the IFrame element for Web
    ui_web.platformViewRegistry.registerViewFactory(_viewType, (int viewId) {
      final iframe = html.IFrameElement()
        ..style.border = 'none'
        ..style.height = '100%'
        ..style.width = '100%'
        ..src = 'https://maps.google.com/maps?q=${Uri.encodeComponent(widget.query)}&t=m&z=15&ie=UTF8&iwloc=&output=embed';
      return iframe;
    });
  }

  @override
  Widget build(BuildContext context) {
    return HtmlElementView(viewType: _viewType);
  }
}
