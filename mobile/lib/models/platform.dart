class MaintenanceWindow {
  final String id;
  final String title;
  final String? description;
  final DateTime startsAt;
  final DateTime endsAt;

  const MaintenanceWindow({
    required this.id,
    required this.title,
    this.description,
    required this.startsAt,
    required this.endsAt,
  });

  bool get isActive => DateTime.now().isAfter(startsAt) && DateTime.now().isBefore(endsAt);
  bool get isUpcoming => DateTime.now().isBefore(startsAt);
}

class Platform {
  final String id;
  final String name;
  final String category;
  final String authorityName;
  final String? operatorAvatarUrl;
  final String? incidentId;
  final String? state;
  final DateTime? openedAt;
  final double? uptime7d;
  final MaintenanceWindow? maintenance;

  const Platform({
    required this.id,
    required this.name,
    required this.category,
    required this.authorityName,
    this.operatorAvatarUrl,
    this.incidentId,
    this.state,
    this.openedAt,
    this.uptime7d,
    this.maintenance,
  });

  factory Platform.fromJson(Map<String, dynamic> j) => Platform(
        id: j['id'] as String,
        name: j['name'] as String,
        category: j['category'] as String,
        authorityName: j['authority_name'] as String,
        operatorAvatarUrl: j['operator_avatar_url'] as String?,
        incidentId: j['incident_id'] as String?,
        state: j['state'] as String?,
        openedAt: switch (j['opened_at']) {
          final String s => DateTime.parse(s),
          _ => null,
        },
        uptime7d: switch (j['uptime_7d']) {
          final num n => n.toDouble(),
          _ => null,
        },
        maintenance: switch (j['maintenance_id']) {
          final String id => MaintenanceWindow(
              id: id,
              title: j['maintenance_title'] as String,
              description: j['maintenance_description'] as String?,
              startsAt: DateTime.parse(j['maintenance_starts_at'] as String),
              endsAt: DateTime.parse(j['maintenance_ends_at'] as String),
            ),
          _ => null,
        },
      );

  bool get hasIssue => state != null;

  String get statusLabel {
    final mw = maintenance;
    if (mw != null && mw.isActive) return 'Maintenance';
    return switch (state) {
      'detected'           => 'Investigating',
      'confirmed'          => 'Confirmed issue',
      'acknowledged'       => 'Acknowledged',
      'partially_resolved' => 'Partially resolved',
      'recurred'           => 'Recurred',
      _                    => 'Operational',
    };
  }
}
