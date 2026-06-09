import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import 'api_client.dart';

// Stores the route to navigate to when the app was opened from a
// terminated-state notification tap. Consumed after the first frame.
(String path, Map<String, String> extra)? _pendingRoute;

final _localNotifications = FlutterLocalNotificationsPlugin();

// High-priority Android channel for incident alerts.
const _channel = AndroidNotificationChannel(
  'incidents',
  'Incident Alerts',
  description: 'Notifications about active platform incidents.',
  importance: Importance.high,
);

(String, Map<String, String>)? _routeFromMessage(RemoteMessage msg) {
  final incidentId = msg.data['incidentId'] as String?;
  if (incidentId == null) return null;
  return (
    '/incidents/$incidentId',
    {
      'incidentId': incidentId,
      'platformName': msg.data['platformName'] as String? ?? 'Platform',
    },
  );
}

class NotificationService {
  static Future<void> setup() async {
    // Create the Android notification channel (idempotent).
    await _localNotifications
        .resolvePlatformSpecificImplementation<
          AndroidFlutterLocalNotificationsPlugin
        >()
        ?.createNotificationChannel(_channel);

    // Initialise the local notifications plugin.
    const initSettings = InitializationSettings(
      android: AndroidInitializationSettings('@mipmap/ic_launcher'),
    );
    await _localNotifications.initialize(
      settings: initSettings,
      onDidReceiveNotificationResponse: (response) {
        // Tapping a foreground-shown local notification navigates the same way.
        final payload = response.payload;
        if (payload != null) {
          final parts = payload.split('|');
          if (parts.length == 2) {
            _navigateTo(parts[0], parts[1]);
          }
        }
      },
    );

    await FirebaseMessaging.instance.requestPermission(
      alert: true,
      badge: true,
      sound: true,
    );

    // Tell FCM to always deliver the data payload even when the app is in
    // the foreground — we handle display ourselves via local notifications.
    await FirebaseMessaging.instance
        .setForegroundNotificationPresentationOptions(
          alert: false,
          badge: false,
          sound: false,
        );

    // App was terminated; user tapped a notification to open it.
    final initial = await FirebaseMessaging.instance.getInitialMessage();
    if (initial != null) _pendingRoute = _routeFromMessage(initial);

    // Show a local notification when a message arrives in the foreground.
    FirebaseMessaging.onMessage.listen(_showLocalNotification);
  }

  static Future<void> registerToken(ApiClient api) async {
    try {
      final token = await FirebaseMessaging.instance.getToken();
      if (token != null) await _postToken(api, token);

      FirebaseMessaging.instance.onTokenRefresh.listen((t) {
        _postToken(api, t).catchError((_) {});
      });
    } catch (_) {}
  }

  static Future<void> _postToken(ApiClient api, String token) =>
      api.post('/api/devices', {'token': token, 'platform': 'android'});

  // Registered once by app.dart after the router is ready.
  static void Function(String, Map<String, String>)? _tapCallback;

  static void setTapCallback(
    void Function(String path, Map<String, String> extra) cb,
  ) {
    _tapCallback = cb;
    // Deliver any tap that arrived before the router was ready.
    if (_pendingRoute != null) {
      cb(_pendingRoute!.$1, _pendingRoute!.$2);
      _pendingRoute = null;
    }
  }

  static void listenForTaps(
    void Function(String path, Map<String, String> extra) onTap,
  ) {
    FirebaseMessaging.onMessageOpenedApp.listen((msg) {
      final route = _routeFromMessage(msg);
      if (route != null) onTap(route.$1, route.$2);
    });
  }

  static void consumePending(
    void Function(String path, Map<String, String> extra) onTap,
  ) {
    if (_pendingRoute != null) {
      onTap(_pendingRoute!.$1, _pendingRoute!.$2);
      _pendingRoute = null;
    }
  }

  static Future<void> _showLocalNotification(RemoteMessage msg) async {
    final notification = msg.notification;
    final title = notification?.title ?? msg.data['platformName'] ?? 'PHAS';
    final body = notification?.body ?? 'Tap to view the incident.';
    final incidentId = msg.data['incidentId'] as String?;
    final platformName = msg.data['platformName'] as String? ?? 'Platform';

    await _localNotifications.show(
      id: msg.hashCode,
      title: title,
      body: body,
      notificationDetails: NotificationDetails(
        android: AndroidNotificationDetails(
          _channel.id,
          _channel.name,
          channelDescription: _channel.description,
          importance: Importance.high,
          priority: Priority.high,
          icon: '@mipmap/ic_launcher',
        ),
      ),
      // Encode route info as a simple pipe-delimited payload.
      payload: incidentId != null ? '$incidentId|$platformName' : null,
    );
  }

  static void _navigateTo(String incidentId, String platformName) {
    final path = '/incidents/$incidentId';
    final extra = {'incidentId': incidentId, 'platformName': platformName};
    if (_tapCallback != null) {
      _tapCallback!(path, extra);
    } else {
      // Router not ready yet (app cold-starting from a tap) — store for later.
      _pendingRoute = (path, extra);
    }
  }
}
