import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:provider/provider.dart';
import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'theme/app_theme.dart';
import 'screens/login_screen.dart';
import 'screens/dashboard_screen.dart';
import 'screens/admin/admin_dashboard_screen.dart';
import 'providers/shift_provider.dart';
import 'providers/theme_provider.dart';
import 'providers/locale_provider.dart';
import 'providers/settings_provider.dart';
import 'providers/admin_state_provider.dart';
import 'providers/translation_provider.dart';
import 'screens/chat_screen.dart';
import 'utils/fade_page_route.dart';
import 'services/notification_service.dart';

final GlobalKey<NavigatorState> navigatorKey = GlobalKey<NavigatorState>();

@pragma('vm:entry-point')
Future<void> _firebaseMessagingBackgroundHandler(RemoteMessage message) async {
  await Firebase.initializeApp();
  debugPrint("Handling a background message: ${message.messageId}");
  
  if (message.data.isNotEmpty && message.notification == null) {
    // Handling data-only message in background
    final title = message.data['title'] ?? 'Новое сообщение';
    final body = message.data['body'] ?? '';
    final senderName = message.data['sender_name'] ?? 'АЛЛО'; // fallback
    final senderAvatar = message.data['sender_avatar'];
    
    final payload = '${message.data['channel_id']}|${message.data['channel_type']}';
    
    await NotificationService.showChatNotification(
      id: message.hashCode, 
      senderName: senderName, 
      message: body,
      payload: payload,
      avatarUrl: senderAvatar,
    );
  }
}

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  
  await NotificationService.initialize();
  
  try {
    await Firebase.initializeApp();
    FirebaseMessaging.onBackgroundMessage(_firebaseMessagingBackgroundHandler);
  } catch (e) {
    debugPrint('Firebase init failed: $e');
  }
  
  await Supabase.initialize(
    url: 'https://mqhdajaefuyifuqeudyh.supabase.co',
    publishableKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1xaGRhamFlZnV5aWZ1cWV1ZHloIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ4MDIwNjIsImV4cCI6MjEwMDM3ODA2Mn0.-tpkwT18V53IvgqCVa8VghonHjBfTReDsBuPWBnHLEY',
  );

  await SystemChrome.setPreferredOrientations([
    DeviceOrientation.portraitUp,
    DeviceOrientation.portraitDown,
  ]);

  runApp(
    MultiProvider(
      providers: [
        ChangeNotifierProvider(create: (_) => ShiftProvider()),
        ChangeNotifierProvider(create: (_) => ThemeProvider()),
        ChangeNotifierProvider(create: (_) => LocaleProvider()),
        ChangeNotifierProvider(create: (_) => SettingsProvider()),
        ChangeNotifierProvider(create: (_) => AdminStateProvider()),
        ChangeNotifierProvider(create: (_) => TranslationProvider()),
      ],
      child: const DMAGApp(),
    ),
  );
}

class DMAGApp extends StatelessWidget {
  const DMAGApp({super.key});

  @override
  Widget build(BuildContext context) {
    final themeProvider = Provider.of<ThemeProvider>(context);
    return MaterialApp(
      navigatorKey: navigatorKey,
      title: 'DMAG Mobile',
      theme: AppTheme.getTheme(themeProvider),
      home: const AuthWrapper(),
      debugShowCheckedModeBanner: false,
      builder: (context, child) {
        return MediaQuery(
          data: MediaQuery.of(context).copyWith(
            textScaler: TextScaler.linear(themeProvider.textSizeScale),
          ),
          child: child!,
        );
      },
    );
  }
}

class AuthWrapper extends StatefulWidget {
  const AuthWrapper({super.key});

  @override
  State<AuthWrapper> createState() => _AuthWrapperState();
}

class _AuthWrapperState extends State<AuthWrapper> {
  bool _isLoading = true;
  bool _isAuthenticated = false;

  @override
  void initState() {
    super.initState();
    _checkAuth();
    _setupPushNotifications();
  }
  
  void _setupPushNotifications() {
    FirebaseMessaging.onMessage.listen((RemoteMessage message) {
      debugPrint('Got a message whilst in the foreground!');
      debugPrint('Message data: ${message.data}');
      if (message.notification != null) {
        if (!mounted) return;
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(message.notification?.title ?? 'Уведомление', style: const TextStyle(fontWeight: FontWeight.bold)),
                Text(message.notification?.body ?? ''),
              ],
            ),
            duration: const Duration(seconds: 4),
            behavior: SnackBarBehavior.floating,
            margin: const EdgeInsets.only(top: 50, left: 16, right: 16),
            dismissDirection: DismissDirection.up,
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
          )
        );
      } else if (message.data.isNotEmpty) {
        // Foreground data message handling
        final body = message.data['body'] ?? '';
        final senderName = message.data['sender_name'] ?? 'Уведомление';
        final senderAvatar = message.data['sender_avatar'];
        
        final payload = '${message.data['channel_id']}|${message.data['channel_type']}';
        
        NotificationService.showChatNotification(
          id: message.hashCode,
          senderName: senderName,
          message: body,
          payload: payload,
          avatarUrl: senderAvatar,
        );
      }
    });

    FirebaseMessaging.onMessageOpenedApp.listen((RemoteMessage message) {
      debugPrint('A new onMessageOpenedApp event was published!');
      _handleNotificationTap(message);
    });

    FirebaseMessaging.instance.getInitialMessage().then((RemoteMessage? message) {
      if (message != null) {
        Future.delayed(const Duration(milliseconds: 500), () {
          _handleNotificationTap(message);
        });
      }
    });
  }

  void _handleNotificationTap(RemoteMessage message) {
    if (navigatorKey.currentState != null) {
      final channelId = message.data['channel_id'];
      final channelType = message.data['channel_type'];
      navigatorKey.currentState!.push(FadePageRoute(
        page: ChatScreen(
          initialChannelId: channelId,
          initialChannelType: channelType,
        )
      ));
    }
  }
  
  Future<void> _registerFcmToken() async {
    try {
      final messaging = FirebaseMessaging.instance;
      NotificationSettings settings = await messaging.requestPermission(
        alert: true, badge: true, sound: true,
      );
      if (settings.authorizationStatus == AuthorizationStatus.authorized) {
        final token = await messaging.getToken();
        if (token != null) {
          final session = Supabase.instance.client.auth.currentSession;
          if (session != null) {
            await Supabase.instance.client.from('profiles').update({'fcm_token': token}).eq('id', session.user.id);
          }
        }
      }
    } catch(e) {
      debugPrint('FCM Token error: $e');
    }
  }

  void _checkAuth() {
    final session = Supabase.instance.client.auth.currentSession;
    setState(() {
      _isAuthenticated = session != null;
      _isLoading = false;
    });
    
    if (session != null) {
      _registerFcmToken();
    }

    // Listen for auth changes
    Supabase.instance.client.auth.onAuthStateChange.listen((data) {
      final AuthChangeEvent event = data.event;
      if (event == AuthChangeEvent.signedIn) {
        if (mounted) setState(() => _isAuthenticated = true);
        _registerFcmToken();
      } else if (event == AuthChangeEvent.signedOut) {
        if (mounted) {
          context.read<ShiftProvider>().resetShift();
          setState(() => _isAuthenticated = false);
        }
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    if (_isLoading) {
      return Scaffold(
        backgroundColor: Theme.of(context).scaffoldBackgroundColor,
        body: Center(
          child: CircularProgressIndicator(color: Theme.of(context).primaryColor),
        ),
      );
    }
    
    return _isAuthenticated ? const RootRouter() : const LoginScreen();
  }
}

class RootRouter extends StatefulWidget {
  const RootRouter({super.key});

  @override
  State<RootRouter> createState() => _RootRouterState();
}

class _RootRouterState extends State<RootRouter> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      final shift = context.read<ShiftProvider>();
      if (shift.userProfile == null) {
        shift.reloadProfile();
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    final shift = context.watch<ShiftProvider>();
    if (shift.isProfileLoading || shift.userProfile == null) {
      return Scaffold(
        backgroundColor: Theme.of(context).scaffoldBackgroundColor,
        body: Center(child: CircularProgressIndicator(color: Theme.of(context).primaryColor)),
      );
    }
    final role = shift.userProfile!['role'] as String?;
    final isAdmin = (role == 'super_admin' || role == 'admin');
    
    if (isAdmin && shift.isAdminView) {
      return const AdminDashboardScreen();
    }
    return const DashboardScreen();
  }
}
