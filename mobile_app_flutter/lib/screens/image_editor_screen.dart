import 'package:flutter/material.dart';
import 'package:pro_image_editor/pro_image_editor.dart';
import 'dart:typed_data';

class ImageEditorScreen extends StatefulWidget {
  final Uint8List? imageBytes;
  final String? imageUrl;
  const ImageEditorScreen({super.key, this.imageBytes, this.imageUrl});

  @override
  State<ImageEditorScreen> createState() => _ImageEditorScreenState();
}

class _ImageEditorScreenState extends State<ImageEditorScreen> {
  @override
  Widget build(BuildContext context) {
    return widget.imageBytes != null
        ? ProImageEditor.memory(
            widget.imageBytes!,
            callbacks: ProImageEditorCallbacks(
              onImageEditingComplete: (Uint8List bytes) async {
                if (mounted) Navigator.pop(context, bytes);
              },
              onCloseEditor: (mode) {
                if (mounted) Navigator.pop(context);
              },
            ),
          )
        : ProImageEditor.network(
            widget.imageUrl!,
            callbacks: ProImageEditorCallbacks(
              onImageEditingComplete: (Uint8List bytes) async {
                if (mounted) Navigator.pop(context, bytes);
              },
              onCloseEditor: (mode) {
                if (mounted) Navigator.pop(context);
              },
            ),
          );
  }
}
