import 'dart:io';

void main() {
  var file = File('lib/screens/chat_screen.dart');
  var content = file.readAsStringSync();
  content = content.replaceAll(
    'class ChatScreen extends StatefulWidget {\r\n  const ChatScreen({super.key});',
    'class ChatScreen extends StatefulWidget {\r\n  final String? initialChannelType;\r\n  final String? initialChannelId;\r\n\r\n  const ChatScreen({\r\n    super.key,\r\n    this.initialChannelType,\r\n    this.initialChannelId,\r\n  });'
  );
  content = content.replaceAll(
    '  bool _isShowingChannelsList = true;\r\n  String _activeChannelType = \'general\';\r\n  String _activeChannelId = \'general\';',
    '  late bool _isShowingChannelsList;\r\n  late String _activeChannelType;\r\n  late String _activeChannelId;'
  );
  content = content.replaceAll(
    '  void initState() {\r\n    super.initState();\r\n    _loadData();\r\n  }',
    '  void initState() {\r\n    super.initState();\r\n    _isShowingChannelsList = widget.initialChannelType == null;\r\n    _activeChannelType = widget.initialChannelType ?? \'general\';\r\n    _activeChannelId = widget.initialChannelId ?? \'general\';\r\n    _loadData();\r\n  }'
  );
  content = content.replaceAll(
    '    if (mounted) {\r\n      setState(() => _isLoading = false);\r\n    }',
    '    if (mounted) {\r\n      if (!_isShowingChannelsList && widget.initialChannelType != null) {\r\n        if (widget.initialChannelType == \'direct\') {\r\n          final parts = widget.initialChannelId!.split(\'_\');\r\n          if (parts.length == 3) {\r\n            final otherId = parts[1] == user.id ? parts[2] : parts[1];\r\n            final otherUser = _profiles.firstWhere((p) => p[\'id\'] == otherId, orElse: () => {\'full_name\': \'Пользователь\'});\r\n            _activeChannelTitle = otherUser[\'full_name\'] as String;\r\n          }\r\n        } else if (widget.initialChannelType == \'site\') {\r\n          final site = _sites.firstWhere((s) => s[\'id\'] == widget.initialChannelId, orElse: () => {\'name\': \'Объект\'});\r\n          _activeChannelTitle = site[\'name\'] as String;\r\n        } else {\r\n          _activeChannelTitle = \'Общий чат команды\';\r\n        }\r\n      }\r\n      setState(() => _isLoading = false);\r\n    }'
  );
  file.writeAsStringSync(content);

  var notif = File('lib/services/notification_service.dart');
  var notifContent = notif.readAsStringSync();
  notifContent = notifContent.replaceAll(
    '    await _notificationsPlugin.initialize(\r\n      initializationSettings,',
    '    await _notificationsPlugin.initialize(\r\n      initializationSettings: initializationSettings,'
  );
  notifContent = notifContent.replaceAll(
    '    await _notificationsPlugin.show(\r\n      id,\r\n      senderName,\r\n      message,\r\n      platformDetails,\r\n      payload: payload ?? \'chat_payload\',\r\n    );',
    '    await _notificationsPlugin.show(\r\n      id,\r\n      title: senderName,\r\n      body: message,\r\n      notificationDetails: platformDetails,\r\n      payload: payload ?? \'chat_payload\',\r\n    );'
  );
  notif.writeAsStringSync(notifContent);
}
