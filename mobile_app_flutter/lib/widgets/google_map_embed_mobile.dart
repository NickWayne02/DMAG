import 'package:flutter/material.dart';
import 'package:webview_flutter/webview_flutter.dart';

class GoogleMapEmbedImpl extends StatefulWidget {
  final String query;

  const GoogleMapEmbedImpl({super.key, required this.query});

  @override
  State<GoogleMapEmbedImpl> createState() => _GoogleMapEmbedImplState();
}

class _GoogleMapEmbedImplState extends State<GoogleMapEmbedImpl> {
  late final WebViewController _controller;

  void _loadMap() {
    final htmlString = '''
      <!DOCTYPE html>
      <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
        <style>body, html { margin: 0; padding: 0; height: 100%; overflow: hidden; }</style>
      </head>
      <body>
        <iframe 
          width="100%" 
          height="100%" 
          frameborder="0" 
          style="border:0;" 
          src="https://maps.google.com/maps?q=${Uri.encodeComponent(widget.query)}&t=m&z=15&ie=UTF8&iwloc=&output=embed" 
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
    _loadMap();
  }

  @override
  void didUpdateWidget(covariant GoogleMapEmbedImpl oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.query != widget.query) {
      _loadMap();
    }
  }

  @override
  Widget build(BuildContext context) {
    return WebViewWidget(controller: _controller);
  }
}
