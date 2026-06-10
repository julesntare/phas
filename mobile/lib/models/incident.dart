class Incident {
  final String id;
  final String platformId;
  final String platformName;
  final String authorityName;
  final String state;
  final DateTime openedAt;
  final double? confidence;
  final int recurrenceCount;
  final int cosignCount;
  final bool userHasCosigned;
  final List<IncidentEvent> events;

  const Incident({
    required this.id,
    required this.platformId,
    required this.platformName,
    required this.authorityName,
    required this.state,
    required this.openedAt,
    this.confidence,
    required this.recurrenceCount,
    required this.cosignCount,
    required this.userHasCosigned,
    required this.events,
  });

  factory Incident.fromJson(Map<String, dynamic> j) {
    final inc = j['incident'] as Map<String, dynamic>;
    return Incident(
      id: inc['id'] as String,
      platformId: inc['platform_id'] as String,
      platformName: inc['platform_name'] as String,
      authorityName: inc['authority_name'] as String,
      state: inc['state'] as String,
      openedAt: DateTime.parse(inc['opened_at'] as String),
      confidence: inc['confidence'] != null
          ? double.tryParse(inc['confidence'].toString())
          : null,
      recurrenceCount: (inc['recurrence_count'] as int?) ?? 0,
      cosignCount: (j['cosignCount'] as int?) ?? 0,
      userHasCosigned: (j['userHasCosigned'] as bool?) ?? false,
      events: (j['events'] as List<dynamic>? ?? [])
          .map((e) => IncidentEvent.fromJson(e as Map<String, dynamic>))
          .toList(),
    );
  }

  String get stateLabel => switch (state) {
        'detected'           => 'Investigating',
        'confirmed'          => 'Confirmed',
        'acknowledged'       => 'Acknowledged',
        'partially_resolved' => 'Partially resolved',
        'resolved'           => 'Resolved',
        'recurred'           => 'Recurred',
        _                    => state,
      };
}

class PlatformIncident {
  final String id;
  final String state;
  final DateTime openedAt;
  final DateTime? closedAt;
  final int recurrenceCount;

  const PlatformIncident({
    required this.id,
    required this.state,
    required this.openedAt,
    this.closedAt,
    required this.recurrenceCount,
  });

  factory PlatformIncident.fromJson(Map<String, dynamic> j) => PlatformIncident(
        id: j['id'] as String,
        state: j['state'] as String,
        openedAt: DateTime.parse(j['opened_at'] as String),
        closedAt: switch (j['closed_at']) {
        final String s => DateTime.parse(s),
        _ => null,
      },
        recurrenceCount: (j['recurrence_count'] as int?) ?? 0,
      );

  bool get isResolved => state == 'resolved';

  Duration? get duration => closedAt?.difference(openedAt);

  String get stateLabel => switch (state) {
        'detected'           => 'Investigating',
        'confirmed'          => 'Confirmed',
        'acknowledged'       => 'Acknowledged',
        'partially_resolved' => 'Partially resolved',
        'resolved'           => 'Resolved',
        'recurred'           => 'Recurred',
        _                    => state,
      };

  String get durationLabel {
    final d = duration;
    if (d == null) return 'ongoing';
    if (d.inMinutes < 60) return '${d.inMinutes}m';
    if (d.inHours < 24) return '${d.inHours}h ${d.inMinutes.remainder(60)}m';
    return '${d.inDays}d ${d.inHours.remainder(24)}h';
  }
}

class IncidentEvent {
  final String? fromState;
  final String toState;
  final String source;
  final String? note;
  final DateTime at;

  const IncidentEvent({
    this.fromState,
    required this.toState,
    required this.source,
    this.note,
    required this.at,
  });

  factory IncidentEvent.fromJson(Map<String, dynamic> j) => IncidentEvent(
        fromState: j['from_state'] as String?,
        toState: j['to_state'] as String,
        source: j['source'] as String,
        note: j['note'] as String?,
        at: DateTime.parse(j['at'] as String),
      );
}

class Comment {
  final String id;
  final String content;
  final String? district;
  final DateTime createdAt;

  const Comment({
    required this.id,
    required this.content,
    this.district,
    required this.createdAt,
  });

  factory Comment.fromJson(Map<String, dynamic> j) => Comment(
        id: j['id'] as String,
        content: j['content'] as String,
        district: j['district'] as String?,
        createdAt: DateTime.parse(j['created_at'] as String),
      );
}
