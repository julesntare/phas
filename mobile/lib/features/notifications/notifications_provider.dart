import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/notification_history.dart';

/// Number of notifications received since the user last opened the list.
/// Invalidate after visiting `/notifications` or when a new push arrives.
final unreadNotificationsProvider = FutureProvider<int>(
  (ref) => NotificationHistory.unreadCount(),
);
