import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import 'package:path_provider/path_provider.dart';
import 'dart:io';

import 'package:supabase_flutter/supabase_flutter.dart';

@pragma('vm:entry-point')
Future<void> notificationTapBackground(NotificationResponse notificationResponse) async {
  debugPrint('notificationTapBackground: ${notificationResponse.actionId}');
  if (notificationResponse.actionId == 'reply') {
    final String? input = notificationResponse.input;
    final String? payload = notificationResponse.payload;
    if (input == null || input.isEmpty || payload == null || payload.isEmpty) return;

    debugPrint('User replied: $input to payload: $payload');
    
    final parts = payload.split('|');
    if (parts.length >= 2) {
      final channelId = parts[0];
      final channelType = parts[1];

      try {
        await Supabase.initialize(
          url: 'https://mqhdajaefuyifuqeudyh.supabase.co',
          publishableKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1xaGRhamFlZnV5aWZ1cWV1ZHloIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ4MDIwNjIsImV4cCI6MjEwMDM3ODA2Mn0.-tpkwT18V53IvgqCVa8VghonHjBfTReDsBuPWBnHLEY',
        );
      } catch (e) {
        // already initialized
      }

      final supabase = Supabase.instance.client;
      // Re-hydrate session from local storage (handled by supabase_flutter automatically, but we might need to wait for it)
      // Usually it's fast. Let's just try to get session.
      final session = supabase.auth.currentSession;
      
      if (session != null) {
        final authorName = session.user.userMetadata?['full_name'] ?? 'Сотрудник';
        await supabase.from('chat_messages').insert({
          'channel_id': channelId,
          'channel_type': channelType,
          'content': input,
          'author_id': session.user.id,
          'author_name': authorName,
        });
        debugPrint('Reply sent successfully');
      } else {
        debugPrint('No active session found in isolate');
      }
    }
  } else if (notificationResponse.actionId == 'mark_read') {
    debugPrint('User marked as read');
  }
}

class NotificationService {
  static final FlutterLocalNotificationsPlugin _notificationsPlugin = FlutterLocalNotificationsPlugin();

  static Future<void> initialize() async {
    const AndroidInitializationSettings initializationSettingsAndroid =
        AndroidInitializationSettings('@mipmap/ic_launcher'); // Update this to a monochrome icon if you have one

    const InitializationSettings initializationSettings = InitializationSettings(
      android: initializationSettingsAndroid,
    );

    await _notificationsPlugin.initialize(
      initializationSettings: initializationSettings,
      onDidReceiveNotificationResponse: (NotificationResponse notificationResponse) {
        // App is in foreground or opened from background
        debugPrint('Notification tapped! Action: ${notificationResponse.actionId}');
        // We can navigate to ChatScreen from here via global navigator
        // Handled in main.dart or here
      },
      onDidReceiveBackgroundNotificationResponse: notificationTapBackground,
    );
  }

  static Future<void> showChatNotification({
    required int id,
    required String senderName,
    required String message,
    String? payload,
    String? avatarUrl,
  }) async {
    String? localAvatarPath;
    if (avatarUrl != null && avatarUrl.isNotEmpty) {
      try {
        final response = await http.get(Uri.parse(avatarUrl));
        if (response.statusCode == 200) {
          final directory = await getTemporaryDirectory();
          final filePath = '${directory.path}/avatar_$id.png';
          final file = File(filePath);
          await file.writeAsBytes(response.bodyBytes);
          localAvatarPath = filePath;
        }
      } catch (e) {
        debugPrint('Failed to download avatar: $e');
      }
    }

    final Person person = Person(
      name: senderName,
      icon: localAvatarPath != null ? BitmapFilePathAndroidIcon(localAvatarPath) : null,
    );

    final MessagingStyleInformation messagingStyle = MessagingStyleInformation(
      person,
      messages: [
        Message(message, DateTime.now(), person),
      ],
      groupConversation: false,
    );

    final AndroidNotificationDetails androidDetails = AndroidNotificationDetails(
      'chat_channel',
      'Chat Messages',
      channelDescription: 'Notifications for new chat messages',
      importance: Importance.max,
      priority: Priority.high,
      styleInformation: messagingStyle,
      actions: <AndroidNotificationAction>[
        const AndroidNotificationAction(
          'reply',
          'Ответить',
          inputs: [
            AndroidNotificationActionInput(
              label: 'Ваш ответ...',
            ),
          ],
        ),
        const AndroidNotificationAction(
          'mark_read',
          'Прочитано',
          showsUserInterface: true,
        ),
      ],
    );

    final NotificationDetails platformDetails = NotificationDetails(
      android: androidDetails,
    );

    await _notificationsPlugin.show(
      id: id,
      title: senderName,
      body: message,
      notificationDetails: platformDetails,
      payload: payload ?? 'chat_payload',
    );
  }
}
