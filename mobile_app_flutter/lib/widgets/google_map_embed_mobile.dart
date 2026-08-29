import 'package:flutter/material.dart';
import 'package:webview_flutter/webview_flutter.dart';

class GoogleMapEmbedImpl extends StatefulWidget {
  final String query;
  final String mapType;

  const GoogleMapEmbedImpl({super.key, required this.query, this.mapType = 'm'});

  @override
  State<GoogleMapEmbedImpl> createState() => _GoogleMapEmbedImplState();
}

class _GoogleMapEmbedImplState extends State<GoogleMapEmbedImpl> {
  late final WebViewController _controller;

  void _loadMap() {
    final filterCss = widget.mapType == 'm' 
        ? "invert(100%) hue-rotate(180deg) brightness(80%) contrast(120%)" 
        : "none";
        
    final htmlString = '''
      <!DOCTYPE html>
      <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
        <style>body, html { margin: 0; padding: 0; height: 100%; overflow: hidden; background: transparent; }</style>
      </head>
      <body>
        <iframe 
          width="100%" 
          height="100%" 
          frameborder="0" 
          style="border:0; filter: $filterCss;" 
          src="https://maps.google.com/maps?q=${Uri.encodeComponent(widget.query)}&t=${widget.mapType}&z=15&ie=UTF8&iwloc=&output=embed" 
          allowfullscreen>
        </iframe>
      </body>
      </html>
    ''';
    _controller.loadHtmlString(htmlString);
  }

  @override
  void initState() {
    super.initState();
    _controller = WebViewController();
    _controller.setJavaScriptMode(JavaScriptMode.unrestricted);
    _controller.setBackgroundColor(Colors.transparent);
    _loadMap();
  }

  @override
  void didUpdateWidget(covariant GoogleMapEmbedImpl oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.query != widget.query || oldWidget.mapType != widget.mapType) {
      _loadMap();
    }
  }

  @override
  Widget build(BuildContext context) {
    return WebViewWidget(controller: _controller);
  }
}
