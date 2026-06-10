import 'dart:convert';
import 'package:shared_preferences/shared_preferences.dart';

class NotificationEntry {
  final String id;
  final String title;
  final String body;
  final String? incidentId;
  final String? platformName;
  final DateTime receivedAt;

  const NotificationEntry({
    required this.id,
    required this.title,
    required this.body,
    this.incidentId,
    this.platformName,
    required this.receivedAt,
  });

  factory NotificationEntry.fromJson(Map<String, dynamic> j) => NotificationEntry(
    id: j['id'] as String,
    title: j['title'] as String,
    body: j['body'] as String,
    incidentId: j['incidentId'] as String?,
    platformName: j['platformName'] as String?,
    receivedAt: DateTime.parse(j['receivedAt'] as String),
  );

  Map<String, dynamic> toJson() => {
    'id': id,
    'title': title,
    'body': body,
    'incidentId': incidentId,
    'platformName': platformName,
    'receivedAt': receivedAt.toIso8601String(),
  };
}

class NotificationHistory {
  static const _key = 'notification_history';
  static const _maxEntries = 50;

  static Future<List<NotificationEntry>> load() async {
    final prefs = await SharedPreferences.getInstance();
    final raw = prefs.getStringList(_key) ?? [];
    return raw
        .map((s) {
          try { return NotificationEntry.fromJson(jsonDecode(s) as Map<String, dynamic>); }
          catch (_) { return null; }
        })
        .whereType<NotificationEntry>()
        .toList()
      ..sort((a, b) => b.receivedAt.compareTo(a.receivedAt));
  }

  static Future<void> add(NotificationEntry entry) async {
    final prefs = await SharedPreferences.getInstance();
    final existing = prefs.getStringList(_key) ?? [];
    // deduplicate by incidentId
    final filtered = entry.incidentId != null
        ? existing.where((s) {
            try {
              final m = jsonDecode(s) as Map<String, dynamic>;
              return m['incidentId'] != entry.incidentId;
            } catch (_) { return true; }
          }).toList()
        : existing;
    final updated = [jsonEncode(entry.toJson()), ...filtered]
        .take(_maxEntries)
        .toList();
    await prefs.setStringList(_key, updated);
  }

  static Future<void> clear() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(_key);
  }
}
