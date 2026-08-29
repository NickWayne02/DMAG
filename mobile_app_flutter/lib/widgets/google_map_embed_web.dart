import 'package:flutter/material.dart';
// ignore: avoid_web_libraries_in_flutter
import 'dart:html' as html;
import 'dart:ui_web' as ui_web;

class GoogleMapEmbedImpl extends StatefulWidget {
  final String query;
  final String mapType;

  const GoogleMapEmbedImpl({super.key, required this.query, this.mapType = 'm'});

  @override
  State<GoogleMapEmbedImpl> createState() => _GoogleMapEmbedImplState();
}

class _GoogleMapEmbedImplState extends State<GoogleMapEmbedImpl> {
  late String _viewType;

  void _registerView() {
    _viewType = 'google-map-${DateTime.now().microsecondsSinceEpoch}-${widget.query.hashCode}-${widget.mapType}';
    
    // Register the IFrame element for Web
    ui_web.platformViewRegistry.registerViewFactory(_viewType, (int viewId) {
      final iframe = html.IFrameElement()
        ..style.border = 'none'
        ..style.height = '100%'
        ..style.width = '100%'
        ..src = 'https://maps.google.com/maps?q=${Uri.encodeComponent(widget.query)}&t=${widget.mapType}&z=15&ie=UTF8&iwloc=&output=embed';
        
      if (widget.mapType == 'm') {
        iframe.style.filter = 'invert(100%) hue-rotate(180deg) brightness(80%) contrast(120%)';
      }
      
      return iframe;
    });
  }

  @override
  void initState() {
    super.initState();
    _registerView();
  }
  
  @override
  void didUpdateWidget(covariant GoogleMapEmbedImpl oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.query != widget.query || oldWidget.mapType != widget.mapType) {
      _registerView();
      setState(() {});
    }
  }

  @override
  Widget build(BuildContext context) {
    // Need a unique key when the viewType changes so the HtmlElementView remounts
    return HtmlElementView(key: ValueKey(_viewType), viewType: _viewType);
  }
}
