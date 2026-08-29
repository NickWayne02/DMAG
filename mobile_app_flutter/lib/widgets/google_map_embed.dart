import 'package:flutter/material.dart';
import 'package:webview_flutter/webview_flutter.dart';

class GoogleMapEmbed extends StatefulWidget {
  final String query;

  const GoogleMapEmbed({super.key, required this.query});

  @override
  State<GoogleMapEmbed> createState() => _GoogleMapEmbedState();
}

class _GoogleMapEmbedState extends State<GoogleMapEmbed> {
  late final WebViewController _controller;

  @override
  void initState() {
    super.initState();
    _controller = WebViewController()
      ..setJavaScriptMode(JavaScriptMode.unrestricted)
      ..loadRequest(Uri.parse(
          'https://maps.google.com/maps?q=${Uri.encodeComponent(widget.query)}&t=m&z=15&ie=UTF8&iwloc=&output=embed'));
  }

  @override
  void didUpdateWidget(covariant GoogleMapEmbed oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.query != widget.query) {
      _controller.loadRequest(Uri.parse(
          'https://maps.google.com/maps?q=${Uri.encodeComponent(widget.query)}&t=m&z=15&ie=UTF8&iwloc=&output=embed'));
    }
  }

  @override
  Widget build(BuildContext context) {
    return WebViewWidget(controller: _controller);
  }
}
