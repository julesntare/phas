import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/api_client.dart';
import '../../models/incident.dart';
import '../../widgets/loaders.dart';
import 'incident_provider.dart';

// ── State colors / labels (shared across widgets) ─────────────────────────────

Color incidentStateColor(String state) => switch (state) {
      'resolved'           => const Color(0xFF16A34A),
      'partially_resolved' => const Color(0xFF8B5CF6),
      'acknowledged'       => const Color(0xFFF97316),
      'confirmed'          => const Color(0xFFEF4444),
      'recurred'           => const Color(0xFFDC2626),
      _                    => const Color(0xFFF59E0B),
    };

// ── Screen ────────────────────────────────────────────────────────────────────

class IncidentDetailScreen extends ConsumerStatefulWidget {
  final String incidentId;
  final String platformName;

  const IncidentDetailScreen({
    super.key,
    required this.incidentId,
    required this.platformName,
  });

  @override
  ConsumerState<IncidentDetailScreen> createState() =>
      _IncidentDetailScreenState();
}

class _IncidentDetailScreenState
    extends ConsumerState<IncidentDetailScreen> {
  bool _cosigning = false;
  Timer? _refreshTimer;

  @override
  void initState() {
    super.initState();
    _refreshTimer = Timer.periodic(const Duration(seconds: 15), (_) {
      ref.invalidate(incidentDetailProvider(widget.incidentId));
      ref.invalidate(incidentCommentsProvider(widget.incidentId));
    });
  }

  @override
  void dispose() {
    _refreshTimer?.cancel();
    super.dispose();
  }

  Future<void> _cosign() async {
    setState(() => _cosigning = true);
    try {
      await ref
          .read(incidentActionsProvider.notifier)
          .cosign(widget.incidentId);
    } on ApiException catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(e.message)),
        );
      }
    } finally {
      if (mounted) setState(() => _cosigning = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    final incidentAsync =
        ref.watch(incidentDetailProvider(widget.incidentId));

    return Scaffold(
      appBar: AppBar(title: Text(widget.platformName)),
      body: incidentAsync.when(
        loading: () => const Center(child: DotsLoader()),
        error: (e, _) => Center(
          child: Padding(
            padding: const EdgeInsets.all(32),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Icon(Icons.cloud_off_outlined,
                    size: 48, color: cs.outlineVariant),
                const SizedBox(height: 12),
                Text('$e',
                    style: TextStyle(color: cs.onSurfaceVariant),
                    textAlign: TextAlign.center),
              ],
            ),
          ),
        ),
        data: (incident) => _IncidentBody(
          incident: incident,
          cosigning: _cosigning,
          onCosign: _cosign,
        ),
      ),
    );
  }
}

// ── Body ──────────────────────────────────────────────────────────────────────

class _IncidentBody extends ConsumerWidget {
  final Incident incident;
  final bool cosigning;
  final VoidCallback onCosign;

  const _IncidentBody({
    required this.incident,
    required this.cosigning,
    required this.onCosign,
  });

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return ListView(
      children: [
        _StateBanner(incident: incident),
        Padding(
          padding: const EdgeInsets.fromLTRB(16, 16, 16, 0),
          child: Column(
            children: [
              _CosignCard(
                incident: incident,
                cosigning: cosigning,
                onCosign: onCosign,
              ),
              const SizedBox(height: 16),
              _TimelineSection(events: incident.events),
              const SizedBox(height: 16),
              _CommentsSection(incidentId: incident.id),
              const SizedBox(height: 24),
            ],
          ),
        ),
      ],
    );
  }
}

// ── State banner ──────────────────────────────────────────────────────────────

class _StateBanner extends StatelessWidget {
  final Incident incident;
  const _StateBanner({required this.incident});

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    final color = incidentStateColor(incident.state);
    final age = _formatAge(incident.openedAt);

    return Container(
      width: double.infinity,
      color: cs.surface,
      padding: const EdgeInsets.fromLTRB(16, 16, 16, 16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                padding: const EdgeInsets.symmetric(
                    horizontal: 10, vertical: 4),
                decoration: BoxDecoration(
                  color: color.withAlpha(20),
                  borderRadius: BorderRadius.circular(20),
                  border: Border.all(color: color.withAlpha(80)),
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Container(
                      width: 7,
                      height: 7,
                      decoration: BoxDecoration(
                          color: color, shape: BoxShape.circle),
                    ),
                    const SizedBox(width: 6),
                    Text(
                      incident.stateLabel,
                      style: TextStyle(
                        color: color,
                        fontWeight: FontWeight.w700,
                        fontSize: 13,
                      ),
                    ),
                  ],
                ),
              ),
              if (incident.recurrenceCount > 0) ...[
                const SizedBox(width: 8),
                Container(
                  padding: const EdgeInsets.symmetric(
                      horizontal: 8, vertical: 4),
                  decoration: BoxDecoration(
                    color: const Color(0xFFDC2626).withAlpha(25),
                    borderRadius: BorderRadius.circular(20),
                  ),
                  child: Text(
                    'Recurrence #${incident.recurrenceCount}',
                    style: const TextStyle(
                        fontSize: 11,
                        color: Color(0xFFDC2626),
                        fontWeight: FontWeight.w600),
                  ),
                ),
              ],
            ],
          ),
          const SizedBox(height: 10),
          Text(
            incident.authorityName,
            style: TextStyle(fontSize: 13, color: cs.onSurfaceVariant),
          ),
          const SizedBox(height: 2),
          Row(
            children: [
              Icon(Icons.schedule_outlined,
                  size: 13, color: cs.outline),
              const SizedBox(width: 4),
              Text(
                'Open for $age',
                style: TextStyle(fontSize: 12, color: cs.outline),
              ),
              if (incident.confidence != null) ...[
                const SizedBox(width: 12),
                Icon(Icons.bar_chart_outlined,
                    size: 13, color: cs.outline),
                const SizedBox(width: 4),
                Text(
                  '${((incident.confidence ?? 0) * 100).round()}% confidence',
                  style: TextStyle(fontSize: 12, color: cs.outline),
                ),
              ],
            ],
          ),
        ],
      ),
    );
  }

  String _formatAge(DateTime openedAt) {
    final diff = DateTime.now().difference(openedAt);
    if (diff.inMinutes < 60) return '${diff.inMinutes}m';
    if (diff.inHours < 24) return '${diff.inHours}h ${diff.inMinutes.remainder(60)}m';
    return '${diff.inDays}d ${diff.inHours.remainder(24)}h';
  }
}

// ── Cosign card ───────────────────────────────────────────────────────────────

class _CosignCard extends StatelessWidget {
  final Incident incident;
  final bool cosigning;
  final VoidCallback onCosign;

  const _CosignCard({
    required this.incident,
    required this.cosigning,
    required this.onCosign,
  });

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    final count = incident.cosignCount;
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Row(
          children: [
            Stack(
              children: [
                Container(
                  width: 44,
                  height: 44,
                  decoration: BoxDecoration(
                    color: cs.surfaceContainerHigh,
                    borderRadius: BorderRadius.circular(22),
                  ),
                  child: Icon(Icons.people_alt_outlined,
                      size: 22, color: cs.onSurfaceVariant),
                ),
                if (count > 0)
                  Positioned(
                    right: 0,
                    bottom: 0,
                    child: Container(
                      padding: const EdgeInsets.symmetric(
                          horizontal: 4, vertical: 1),
                      decoration: BoxDecoration(
                        color: const Color(0xFFEF4444),
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: Text(
                        '$count',
                        style: const TextStyle(
                            fontSize: 9,
                            color: Colors.white,
                            fontWeight: FontWeight.w800),
                      ),
                    ),
                  ),
              ],
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    count == 0
                        ? 'Be the first to co-sign'
                        : '$count ${count == 1 ? 'person' : 'people'} affected',
                    style: const TextStyle(
                        fontWeight: FontWeight.w600, fontSize: 14),
                  ),
                  if (incident.userHasCosigned)
                    const Padding(
                      padding: EdgeInsets.only(top: 2),
                      child: Row(
                        children: [
                          Icon(Icons.check_circle,
                              size: 12, color: Color(0xFF16A34A)),
                          SizedBox(width: 4),
                          Text('You co-signed',
                              style: TextStyle(
                                  fontSize: 12,
                                  color: Color(0xFF16A34A),
                                  fontWeight: FontWeight.w500)),
                        ],
                      ),
                    )
                  else
                    Padding(
                      padding: const EdgeInsets.only(top: 2),
                      child: Text(
                        'Tap to confirm you\'re affected too',
                        style: TextStyle(fontSize: 12, color: cs.outline),
                      ),
                    ),
                ],
              ),
            ),
            if (!incident.userHasCosigned)
              FilledButton(
                onPressed: cosigning ? null : onCosign,
                style: FilledButton.styleFrom(
                  padding: const EdgeInsets.symmetric(
                      horizontal: 14, vertical: 8),
                  minimumSize: Size.zero,
                  tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                ),
                child: cosigning
                    ? const DotsLoader(color: Colors.white, dotSize: 5)
                    : const Text('Co-sign',
                        style: TextStyle(fontSize: 13)),
              ),
          ],
        ),
      ),
    );
  }
}

// ── Timeline ──────────────────────────────────────────────────────────────────

class _TimelineSection extends StatelessWidget {
  final List<IncidentEvent> events;
  const _TimelineSection({required this.events});

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    if (events.isEmpty) return const SizedBox.shrink();
    final sorted = events.toList()
      ..sort((a, b) => a.at.compareTo(b.at));
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text('Timeline',
            style: TextStyle(
                fontWeight: FontWeight.w700,
                fontSize: 15,
                color: cs.onSurface)),
        const SizedBox(height: 12),
        ...List.generate(sorted.length, (i) => _TimelineRow(
              event: sorted[i],
              isLast: i == sorted.length - 1,
            )),
      ],
    );
  }
}

class _TimelineRow extends StatelessWidget {
  final IncidentEvent event;
  final bool isLast;
  const _TimelineRow({required this.event, required this.isLast});

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    final color = incidentStateColor(event.toState);
    final label = event.toState[0].toUpperCase() +
        event.toState.substring(1).replaceAll('_', ' ');
    final sourceLabel = switch (event.source) {
      'crowd'    => 'Citizen reports',
      'probe'    => 'Automated probe',
      'helpdesk' => 'Operator',
      _          => event.source,
    };

    return IntrinsicHeight(
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          // Dot + vertical line
          SizedBox(
            width: 24,
            child: Column(
              children: [
                Container(
                  width: 12,
                  height: 12,
                  decoration: BoxDecoration(
                    color: color,
                    shape: BoxShape.circle,
                    border: Border.all(
                        color: cs.surface, width: 2),
                    boxShadow: [
                      BoxShadow(
                          color: color.withAlpha(60),
                          blurRadius: 4,
                          spreadRadius: 1)
                    ],
                  ),
                ),
                if (!isLast)
                  Expanded(
                    child: Container(
                      width: 2,
                      color: cs.outlineVariant,
                    ),
                  ),
              ],
            ),
          ),
          const SizedBox(width: 10),
          // Content
          Expanded(
            child: Padding(
              padding: EdgeInsets.only(bottom: isLast ? 0 : 16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Text(label,
                          style: TextStyle(
                              fontWeight: FontWeight.w600,
                              fontSize: 13,
                              color: cs.onSurface)),
                      const Spacer(),
                      Text(_fmt(event.at),
                          style: TextStyle(
                              fontSize: 11,
                              color: cs.outline)),
                    ],
                  ),
                  const SizedBox(height: 2),
                  Text(sourceLabel,
                      style: TextStyle(
                          fontSize: 11,
                          color: cs.outline)),
                  if (event.note != null) ...[
                    const SizedBox(height: 4),
                    Container(
                      padding: const EdgeInsets.all(8),
                      decoration: BoxDecoration(
                        color: cs.surfaceContainerHighest,
                        borderRadius: BorderRadius.circular(8),
                        border: Border.fromBorderSide(
                            BorderSide(color: cs.outlineVariant)),
                      ),
                      child: Text(event.note!,
                          style: TextStyle(
                              fontSize: 12,
                              color: cs.onSurface)),
                    ),
                  ],
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  String _fmt(DateTime t) {
    final diff = DateTime.now().difference(t);
    if (diff.inMinutes < 1) return 'just now';
    if (diff.inMinutes < 60) return '${diff.inMinutes}m ago';
    if (diff.inHours < 24) return '${diff.inHours}h ago';
    return '${diff.inDays}d ago';
  }
}

// ── Comments ──────────────────────────────────────────────────────────────────

class _CommentsSection extends ConsumerStatefulWidget {
  final String incidentId;
  const _CommentsSection({required this.incidentId});

  @override
  ConsumerState<_CommentsSection> createState() => _CommentsSectionState();
}

class _CommentsSectionState extends ConsumerState<_CommentsSection> {
  final _ctrl = TextEditingController();
  bool _sending = false;

  @override
  void dispose() {
    _ctrl.dispose();
    super.dispose();
  }

  Future<void> _send() async {
    final text = _ctrl.text.trim();
    if (text.isEmpty) return;
    setState(() => _sending = true);
    try {
      await ref
          .read(incidentActionsProvider.notifier)
          .addComment(widget.incidentId, text);
      _ctrl.clear();
    } on ApiException catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context)
            .showSnackBar(SnackBar(content: Text(e.message)));
      }
    } finally {
      if (mounted) setState(() => _sending = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    final commentsAsync =
        ref.watch(incidentCommentsProvider(widget.incidentId));

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text('Discussion',
            style: TextStyle(
                fontWeight: FontWeight.w700,
                fontSize: 15,
                color: cs.onSurface)),
        const SizedBox(height: 12),
        commentsAsync.when(
          loading: () => const Padding(
            padding: EdgeInsets.symmetric(vertical: 12),
            child: Center(child: DotsLoader()),
          ),
          error: (_, st) => Text('Could not load comments',
              style: TextStyle(color: cs.onSurfaceVariant)),
          data: (comments) => comments.isEmpty
              ? Container(
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: cs.surfaceContainerHighest,
                    borderRadius: BorderRadius.circular(12),
                    border: Border.fromBorderSide(
                        BorderSide(color: cs.outlineVariant)),
                  ),
                  child: Row(
                    children: [
                      Icon(Icons.chat_bubble_outline,
                          size: 16, color: cs.outlineVariant),
                      const SizedBox(width: 8),
                      Text('No comments yet — be the first.',
                          style: TextStyle(
                              color: cs.onSurfaceVariant,
                              fontSize: 13)),
                    ],
                  ),
                )
              : Column(
                  children: comments
                      .map((c) => _CommentTile(comment: c))
                      .toList(),
                ),
        ),
        const SizedBox(height: 12),
        Row(
          crossAxisAlignment: CrossAxisAlignment.end,
          children: [
            Expanded(
              child: TextField(
                controller: _ctrl,
                maxLength: 500,
                maxLines: null,
                textInputAction: TextInputAction.send,
                onSubmitted: (_) => _send(),
                style: const TextStyle(fontSize: 14),
                decoration: const InputDecoration(
                  hintText: 'Share what you\'re experiencing…',
                  counterText: '',
                ),
              ),
            ),
            const SizedBox(width: 8),
            IconButton.filled(
              onPressed: _sending ? null : _send,
              icon: _sending
                  ? const DotsLoader(color: Colors.white, dotSize: 5)
                  : const Icon(Icons.send_rounded, size: 18),
            ),
          ],
        ),
      ],
    );
  }
}

class _CommentTile extends StatelessWidget {
  final Comment comment;
  const _CommentTile({required this.comment});

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            width: 32,
            height: 32,
            decoration: BoxDecoration(
              color: cs.surfaceContainerHigh,
              borderRadius: BorderRadius.circular(16),
            ),
            child: Icon(Icons.person_outline,
                size: 16, color: cs.outline),
          ),
          const SizedBox(width: 10),
          Expanded(
            child: Container(
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(
                color: cs.surfaceContainerHighest,
                borderRadius: const BorderRadius.only(
                  topRight: Radius.circular(12),
                  bottomLeft: Radius.circular(12),
                  bottomRight: Radius.circular(12),
                ),
                border: Border.fromBorderSide(
                    BorderSide(color: cs.outlineVariant)),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      if (comment.district != null)
                        Text(
                          comment.district!,
                          style: TextStyle(
                              fontWeight: FontWeight.w600,
                              fontSize: 11,
                              color: cs.onSurface),
                        ),
                      const Spacer(),
                      Text(
                        _fmt(comment.createdAt),
                        style: TextStyle(
                            fontSize: 10,
                            color: cs.outline),
                      ),
                    ],
                  ),
                  const SizedBox(height: 4),
                  Text(comment.content,
                      style: TextStyle(
                          fontSize: 13, color: cs.onSurface)),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  String _fmt(DateTime t) {
    final diff = DateTime.now().difference(t);
    if (diff.inMinutes < 1) return 'just now';
    if (diff.inMinutes < 60) return '${diff.inMinutes}m ago';
    if (diff.inHours < 24) return '${diff.inHours}h ago';
    return '${diff.inDays}d ago';
  }
}
