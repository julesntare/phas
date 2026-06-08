import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'app.dart';
import 'core/notifications.dart';

// Must be a top-level function for background message handling.
@pragma('vm:entry-point')
Future<void> _backgroundMessageHandler(RemoteMessage _) async {
  await Firebase.initializeApp();
  // System tray notification is shown automatically by firebase_messaging.
}

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await Firebase.initializeApp();
  FirebaseMessaging.onBackgroundMessage(_backgroundMessageHandler);
  await NotificationService.setup();
  runApp(const ProviderScope(child: PhasApp()));
}
