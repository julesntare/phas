class Platform {
  final String id;
  final String name;
  final String category;
  final String authorityName;
  final String? incidentId;
  final String? state;
  final DateTime? openedAt;

  const Platform({
    required this.id,
    required this.name,
    required this.category,
    required this.authorityName,
    this.incidentId,
    this.state,
    this.openedAt,
  });

  factory Platform.fromJson(Map<String, dynamic> j) => Platform(
        id: j['id'] as String,
        name: j['name'] as String,
        category: j['category'] as String,
        authorityName: j['authority_name'] as String,
        incidentId: j['incident_id'] as String?,
        state: j['state'] as String?,
        openedAt: j['opened_at'] != null
            ? DateTime.parse(j['opened_at'] as String)
            : null,
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
