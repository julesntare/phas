import 'package:firebase_messaging/firebase_messaging.dart';
import 'api_client.dart';

// Stores the route to navigate to when the app was opened from a
// terminated-state notification tap. Consumed after the first frame.
(String path, Map<String, String> extra)? _pendingRoute;

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
  // Called once in main() before runApp.
  // Sets up permission request and stores any initial tap route.
  static Future<void> setup() async {
    await FirebaseMessaging.instance.requestPermission(
      alert: true,
      badge: true,
      sound: true,
    );

    // App was terminated; user tapped a notification to open it.
    final initial = await FirebaseMessaging.instance.getInitialMessage();
    if (initial != null) _pendingRoute = _routeFromMessage(initial);
  }

  // Called right after login to register the current device token.
  // Also wires up the token-refresh listener for the lifetime of the session.
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

  // Wires up the foreground tap listener. Call once when the router is ready.
  static void listenForTaps(void Function(String path, Map<String, String> extra) onTap) {
    FirebaseMessaging.onMessageOpenedApp.listen((msg) {
      final route = _routeFromMessage(msg);
      if (route != null) onTap(route.$1, route.$2);
    });
  }

  // Navigates to any notification tap that arrived while the app was terminated.
  // Call this after the first frame (router is ready).
  static void consumePending(void Function(String path, Map<String, String> extra) onTap) {
    if (_pendingRoute != null) {
      onTap(_pendingRoute!.$1, _pendingRoute!.$2);
      _pendingRoute = null;
    }
  }
}
