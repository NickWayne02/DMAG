import 'package:flutter/material.dart';
import 'dart:html' as html;
import 'dart:ui_web' as ui_web;

Widget buildMapIframe(String url, bool isSatellite) {
  final String viewType = 'map-iframe-${url.hashCode}-$isSatellite';
  
  ui_web.platformViewRegistry.registerViewFactory(viewType, (int viewId) {
    final iframe = html.IFrameElement()
      ..src = url
      ..style.border = 'none'
      ..style.width = '100%'
      ..style.height = '100%';
      
    if (isSatellite) {
      // Basic CSS filter invert if needed for dark mode, though Google Maps satellite is already dark
    } else {
      // For standard map in dark mode, invert colors like React does
      iframe.style.filter = 'invert(100%) hue-rotate(180deg) brightness(80%) contrast(120%)';
    }
      
    return iframe;
  });

  return HtmlElementView(viewType: viewType);
}
