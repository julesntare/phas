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
      );

  bool get hasIssue => state != null;

  String get statusLabel => switch (state) {
        'detected'           => 'Investigating',
        'confirmed'          => 'Confirmed issue',
        'acknowledged'       => 'Acknowledged',
        'partially_resolved' => 'Partially resolved',
        'recurred'           => 'Recurred',
        _                    => 'Operational',
      };
}
