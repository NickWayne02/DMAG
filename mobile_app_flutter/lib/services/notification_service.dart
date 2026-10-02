import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import 'package:path_provider/path_provider.dart';
import 'dart:io';

import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:provider/provider.dart';
import '../providers/shift_provider.dart';
import '../main.dart' as import_main;
import '../screens/chat_screen.dart' as import_chat;

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
  static Future<void> showWorkNotification(String statusText, String elapsedTime, ShiftStatus status) async {
    // Determine which actions to show based on status to save space
    List<AndroidNotificationAction> actions = [];
    
    actions.add(const AndroidNotificationAction('action_start_work', 'НАЧАТЬ РАБОТУ', showsUserInterface: true));
    actions.add(const AndroidNotificationAction('action_start_pause', 'НАЧАТЬ ПАУЗУ', showsUserInterface: true));
    actions.add(const AndroidNotificationAction('action_end_pause', 'ЗАКОНЧИТЬ ПАУЗУ', showsUserInterface: true));
    actions.add(const AndroidNotificationAction('action_end_work', 'ЗАКОНЧИТЬ СМЕНУ', showsUserInterface: true));

    final AndroidNotificationDetails androidPlatformChannelSpecifics =
        AndroidNotificationDetails(
      'work_channel',
      'Текущая смена',
      channelDescription: 'Уведомление о текущем статусе смены',
      importance: Importance.low,
      priority: Priority.low,
      ongoing: true,
      autoCancel: false,
      showWhen: false,
      enableVibration: false,
      playSound: false,
      onlyAlertOnce: true,
      actions: actions,
    );
    final NotificationDetails platformChannelSpecifics =
        NotificationDetails(android: androidPlatformChannelSpecifics);
        
    final androidPlugin = _notificationsPlugin.resolvePlatformSpecificImplementation<AndroidFlutterLocalNotificationsPlugin>();
    
    if (androidPlugin != null) {
      if (status == ShiftStatus.idle || status == ShiftStatus.finished) {
        await androidPlugin.stopForegroundService();
        await _notificationsPlugin.show(
          id: 888,
          title: statusText,
          body: elapsedTime,
          notificationDetails: platformChannelSpecifics,
        );
      } else {
        await androidPlugin.startForegroundService(
          id: 888,
          title: statusText,
          body: elapsedTime,
          notificationDetails: androidPlatformChannelSpecifics,
        );
      }
    } else {
      await _notificationsPlugin.show(
        id: 888,
        title: statusText,
        body: elapsedTime,
        notificationDetails: platformChannelSpecifics,
      );
    }
  }

  static Future<void> cancelWorkNotification() async {
    final androidPlugin = _notificationsPlugin.resolvePlatformSpecificImplementation<AndroidFlutterLocalNotificationsPlugin>();
    if (androidPlugin != null) {
      await androidPlugin.stopForegroundService();
    }
    await _notificationsPlugin.cancel(id: 888);
  }

  static String? activeChatChannelId;
  static final FlutterLocalNotificationsPlugin _notificationsPlugin = FlutterLocalNotificationsPlugin();

  static Future<void> initialize() async {
    const AndroidInitializationSettings initializationSettingsAndroid =
        AndroidInitializationSettings('@mipmap/ic_launcher'); // Update this to a monochrome icon if you have one

    const InitializationSettings initializationSettings = InitializationSettings(
      android: initializationSettingsAndroid,
    );

    await _notificationsPlugin.initialize(
      settings: initializationSettings,
      onDidReceiveNotificationResponse: (NotificationResponse notificationResponse) async {
        debugPrint('Notification tapped! Action: ${notificationResponse.actionId}');
        
        final context = import_main.navigatorKey.currentContext;
        if (context != null) {
          final shiftProvider = Provider.of<ShiftProvider>(context, listen: false);
          
          try {
            if (notificationResponse.actionId == 'action_start_work') {
              await shiftProvider.startShift(forceExact: false);
            } else if (notificationResponse.actionId == 'action_start_pause') {
              await shiftProvider.startLunch();
            } else if (notificationResponse.actionId == 'action_end_pause') {
              await shiftProvider.endLunch();
            } else if (notificationResponse.actionId == 'action_end_work') {
              await shiftProvider.endShift();
            }
          } catch (e) {
            if (context.mounted) {
              ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.toString().replaceAll('Exception: ', ''))));
            }
          }
        }

        final payload = notificationResponse.payload;
        if (payload != null && notificationResponse.actionId != 'reply' && notificationResponse.actionId != 'mark_read' && !notificationResponse.actionId!.startsWith('action_')) {
          final parts = payload.split('|');
          if (parts.length >= 2) {
            final channelId = parts[0];
            final channelType = parts[1];
            // Post event to navigate
            WidgetsBinding.instance.addPostFrameCallback((_) {
              import_main.navigatorKey.currentState?.push(
                PageRouteBuilder(
                  pageBuilder: (context, animation, secondaryAnimation) => import_chat.ChatScreen(
                    initialChannelId: channelId,
                    initialChannelType: channelType,
                  ),
                  transitionsBuilder: (context, animation, secondaryAnimation, child) {
                    return FadeTransition(opacity: animation, child: child);
                  },
                )
              );
            });
          }
        }
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
    String? photoUrl,
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

    String? localPhotoPath;
    if (photoUrl != null && photoUrl.isNotEmpty) {
      try {
        final response = await http.get(Uri.parse(photoUrl));
        if (response.statusCode == 200) {
          final directory = await getTemporaryDirectory();
          final filePath = '${directory.path}/photo_$id.png';
          final file = File(filePath);
          await file.writeAsBytes(response.bodyBytes);
          localPhotoPath = filePath;
        }
      } catch (e) {
        debugPrint('Failed to download photo report: $e');
      }
    }

    StyleInformation? styleInformation;
    if (localPhotoPath != null) {
      styleInformation = BigPictureStyleInformation(
        FilePathAndroidBitmap(localPhotoPath),
        largeIcon: localAvatarPath != null ? FilePathAndroidBitmap(localAvatarPath) : null,
        contentTitle: senderName,
        summaryText: message,
      );
    }

    final AndroidNotificationDetails androidDetails = AndroidNotificationDetails(
      'chat_channel',
      'Chat Messages',
      channelDescription: 'Notifications for new chat messages',
      importance: Importance.max,
      priority: Priority.high,
      styleInformation: styleInformation,
      largeIcon: styleInformation == null && localAvatarPath != null ? FilePathAndroidBitmap(localAvatarPath) : null,
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
          showsUserInterface: false,
          cancelNotification: true,
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
