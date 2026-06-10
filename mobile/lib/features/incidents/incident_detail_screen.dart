import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/api_client.dart';
import '../../models/incident.dart';
import 'incident_provider.dart';

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

class _IncidentDetailScreenState extends ConsumerState<IncidentDetailScreen> {
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
    final incidentAsync =
        ref.watch(incidentDetailProvider(widget.incidentId));

    return Scaffold(
      appBar: AppBar(title: Text(widget.platformName)),
      body: incidentAsync.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (e, _) => Center(child: Text('$e')),
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
      padding: const EdgeInsets.all(16),
      children: [
        _IncidentHeader(incident: incident),
        const SizedBox(height: 16),
        _CosignCard(
          incident: incident,
          cosigning: cosigning,
          onCosign: onCosign,
        ),
        const SizedBox(height: 16),
        _TimelineSection(events: incident.events),
        const SizedBox(height: 16),
        _CommentsSection(incidentId: incident.id),
      ],
    );
  }
}

// ── Header ────────────────────────────────────────────────────────────────────

class _IncidentHeader extends StatelessWidget {
  final Incident incident;
  const _IncidentHeader({required this.incident});

  Color get _stateColor => switch (incident.state) {
        'resolved'           => Colors.green,
        'partially_resolved' => Colors.orange,
        _                    => Colors.red,
      };

  @override
  Widget build(BuildContext context) {
    final since = _formatAge(incident.openedAt);
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            Container(
              padding:
                  const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
              decoration: BoxDecoration(
                color: _stateColor.withAlpha(30),
                borderRadius: BorderRadius.circular(20),
                border: Border.all(color: _stateColor.withAlpha(100)),
              ),
              child: Text(incident.stateLabel,
                  style: TextStyle(
                      color: _stateColor, fontWeight: FontWeight.w600)),
            ),
            if (incident.recurrenceCount > 0) ...[
              const SizedBox(width: 8),
              Chip(
                label: Text('Recurred ×${incident.recurrenceCount}'),
                padding: EdgeInsets.zero,
                visualDensity: VisualDensity.compact,
              ),
            ],
          ],
        ),
        const SizedBox(height: 8),
        Text(incident.authorityName,
            style: const TextStyle(color: Colors.black54)),
        const SizedBox(height: 4),
        Text('Open for $since',
            style: const TextStyle(fontSize: 13, color: Colors.black45)),
      ],
    );
  }

  String _formatAge(DateTime openedAt) {
    final diff = DateTime.now().difference(openedAt);
    if (diff.inMinutes < 60) return '${diff.inMinutes}m';
    if (diff.inHours < 24) return '${diff.inHours}h';
    return '${diff.inDays}d';
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
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Row(
          children: [
            const Icon(Icons.people_alt_outlined, size: 32),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    '${incident.cosignCount} '
                    '${incident.cosignCount == 1 ? 'person' : 'people'} affected',
                    style: const TextStyle(
                        fontWeight: FontWeight.w600, fontSize: 15),
                  ),
                  if (incident.userHasCosigned)
                    const Text('You co-signed this report',
                        style: TextStyle(
                            fontSize: 12, color: Colors.green)),
                ],
              ),
            ),
            if (!incident.userHasCosigned)
              FilledButton(
                onPressed: cosigning ? null : onCosign,
                child: cosigning
                    ? const SizedBox(
                        height: 16,
                        width: 16,
                        child: CircularProgressIndicator(
                            strokeWidth: 2, color: Colors.white))
                    : const Text('Co-sign'),
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
    if (events.isEmpty) return const SizedBox.shrink();

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text('Timeline',
            style: TextStyle(fontWeight: FontWeight.w600, fontSize: 15)),
        const SizedBox(height: 8),
        ...events.reversed.map((e) => _EventRow(event: e)),
      ],
    );
  }
}

class _EventRow extends StatelessWidget {
  final IncidentEvent event;
  const _EventRow({required this.event});

  @override
  Widget build(BuildContext context) {
    final label = event.toState[0].toUpperCase() + event.toState.substring(1).replaceAll('_', ' ');
    final time = _fmt(event.at);
    return Padding(
      padding: const EdgeInsets.only(bottom: 6),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Icon(Icons.circle, size: 8, color: Colors.black38),
          const SizedBox(width: 8),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(label,
                    style: const TextStyle(fontWeight: FontWeight.w500)),
                if (event.note != null)
                  Text(event.note!,
                      style: const TextStyle(
                          fontSize: 12, color: Colors.black54)),
              ],
            ),
          ),
          Text(time,
              style: const TextStyle(fontSize: 11, color: Colors.black38)),
        ],
      ),
    );
  }

  String _fmt(DateTime t) {
    return '${t.day.toString().padLeft(2, '0')}/'
        '${t.month.toString().padLeft(2, '0')} '
        '${t.hour.toString().padLeft(2, '0')}:'
        '${t.minute.toString().padLeft(2, '0')}';
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
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(e.message)),
        );
      }
    } finally {
      if (mounted) setState(() => _sending = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final commentsAsync =
        ref.watch(incidentCommentsProvider(widget.incidentId));

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text('Discussion',
            style: TextStyle(fontWeight: FontWeight.w600, fontSize: 15)),
        const SizedBox(height: 8),
        commentsAsync.when(
          loading: () =>
              const Center(child: CircularProgressIndicator(strokeWidth: 2)),
          error: (e, _) =>
              Text('Could not load comments', style: TextStyle(color: Colors.red.shade400)),
          data: (comments) => comments.isEmpty
              ? const Padding(
                  padding: EdgeInsets.symmetric(vertical: 12),
                  child: Text('No comments yet — be the first.',
                      style: TextStyle(color: Colors.black45)),
                )
              : Column(
                  children: comments.map((c) => _CommentTile(comment: c)).toList(),
                ),
        ),
        const SizedBox(height: 12),
        Row(
          children: [
            Expanded(
              child: TextField(
                controller: _ctrl,
                maxLength: 500,
                maxLines: null,
                textInputAction: TextInputAction.send,
                onSubmitted: (_) => _send(),
                decoration: const InputDecoration(
                  hintText: 'Add to the discussion…',
                  border: OutlineInputBorder(),
                  isDense: true,
                  counterText: '',
                ),
              ),
            ),
            const SizedBox(width: 8),
            IconButton.filled(
              onPressed: _sending ? null : _send,
              icon: _sending
                  ? const SizedBox(
                      height: 18,
                      width: 18,
                      child: CircularProgressIndicator(
                          strokeWidth: 2, color: Colors.white))
                  : const Icon(Icons.send),
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
    return Padding(
      padding: const EdgeInsets.only(bottom: 10),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          CircleAvatar(
            radius: 14,
            backgroundColor: Colors.blueGrey.shade100,
            child: const Icon(Icons.person, size: 16, color: Colors.blueGrey),
          ),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    if (comment.district != null)
                      Text(comment.district!,
                          style: const TextStyle(
                              fontWeight: FontWeight.w500, fontSize: 12)),
                    const Spacer(),
                    Text(_fmtTime(comment.createdAt),
                        style: const TextStyle(
                            fontSize: 11, color: Colors.black38)),
                  ],
                ),
                const SizedBox(height: 2),
                Text(comment.content),
              ],
            ),
          ),
        ],
      ),
    );
  }

  String _fmtTime(DateTime t) {
    final diff = DateTime.now().difference(t);
    if (diff.inMinutes < 1) return 'just now';
    if (diff.inMinutes < 60) return '${diff.inMinutes}m ago';
    if (diff.inHours < 24) return '${diff.inHours}h ago';
    return '${diff.inDays}d ago';
  }
}
