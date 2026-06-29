import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../auth/auth_provider.dart';
import '../../widgets/loaders.dart';

// ── Model ─────────────────────────────────────────────────────────────────────

class MySuggestion {
  final String id;
  final String platformName;
  final String title;
  final String body;
  final String category;
  final String status;
  final int upvotes;
  final String? adminNote;
  final String? operatorNote;
  final DateTime createdAt;

  const MySuggestion({
    required this.id,
    required this.platformName,
    required this.title,
    required this.body,
    required this.category,
    required this.status,
    required this.upvotes,
    this.adminNote,
    this.operatorNote,
    required this.createdAt,
  });

  factory MySuggestion.fromJson(Map<String, dynamic> j) => MySuggestion(
        id:           j['id'] as String,
        platformName: j['platform_name'] as String,
        title:        j['title'] as String,
        body:         j['body'] as String,
        category:     j['category'] as String,
        status:       j['status'] as String,
        upvotes:      (j['upvotes'] as num).toInt(),
        adminNote:    j['admin_note'] as String?,
        operatorNote: j['operator_note'] as String?,
        createdAt:    DateTime.parse(j['created_at'] as String),
      );
}

// ── Provider ──────────────────────────────────────────────────────────────────

final mySuggestionsProvider =
    FutureProvider.autoDispose<List<MySuggestion>>((ref) async {
  final data = await ref.read(apiClientProvider).get('/api/suggestions/mine');
  return (data['suggestions'] as List)
      .map((s) => MySuggestion.fromJson(s as Map<String, dynamic>))
      .toList();
});

// ── Screen ────────────────────────────────────────────────────────────────────

class MySuggestionsScreen extends ConsumerWidget {
  const MySuggestionsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final async = ref.watch(mySuggestionsProvider);
    final cs = Theme.of(context).colorScheme;

    return Scaffold(
      appBar: AppBar(title: const Text('My suggestions')),
      body: async.when(
        loading: () => const Center(child: DotsLoader()),
        error: (e, _) => Center(
          child: Padding(
            padding: const EdgeInsets.all(32),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Icon(Icons.cloud_off_outlined, size: 48, color: cs.outlineVariant),
                const SizedBox(height: 12),
                Text('$e',
                    style: TextStyle(color: cs.onSurfaceVariant, fontSize: 13),
                    textAlign: TextAlign.center),
                const SizedBox(height: 16),
                FilledButton(
                  onPressed: () => ref.invalidate(mySuggestionsProvider),
                  child: const Text('Retry'),
                ),
              ],
            ),
          ),
        ),
        data: (suggestions) {
          if (suggestions.isEmpty) {
            return Center(
              child: Padding(
                padding: const EdgeInsets.all(40),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(Icons.lightbulb_outline,
                        size: 56, color: cs.outlineVariant),
                    const SizedBox(height: 16),
                    Text('No suggestions yet',
                        style: TextStyle(
                            fontSize: 16,
                            fontWeight: FontWeight.w600,
                            color: cs.onSurface)),
                    const SizedBox(height: 6),
                    Text(
                      'Submit an idea from any platform page.',
                      style:
                          TextStyle(fontSize: 13, color: cs.onSurfaceVariant),
                      textAlign: TextAlign.center,
                    ),
                  ],
                ),
              ),
            );
          }

          return RefreshIndicator(
            onRefresh: () async => ref.invalidate(mySuggestionsProvider),
            child: ListView.separated(
              padding: const EdgeInsets.all(16),
              itemCount: suggestions.length,
              separatorBuilder: (_, _) => const SizedBox(height: 10),
              itemBuilder: (ctx, i) => _SuggestionTile(
                suggestion: suggestions[i],
                onTap: () => Navigator.of(ctx).push(MaterialPageRoute(
                  builder: (_) =>
                      _SuggestionDetailScreen(suggestion: suggestions[i]),
                )),
              ),
            ),
          );
        },
      ),
    );
  }
}

// ── List tile ─────────────────────────────────────────────────────────────────

class _SuggestionTile extends StatelessWidget {
  final MySuggestion suggestion;
  final VoidCallback onTap;
  const _SuggestionTile({required this.suggestion, required this.onTap});

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    final s = suggestion;
    final (statusLabel, statusColor) = _statusMeta(s.status);

    return Material(
      color: cs.surface,
      borderRadius: BorderRadius.circular(14),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(14),
        child: Container(
          padding: const EdgeInsets.all(14),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(14),
            border: Border.all(color: cs.outlineVariant.withAlpha(80)),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  _StatusChip(label: statusLabel, color: statusColor),
                  const SizedBox(width: 6),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                    decoration: BoxDecoration(
                      color: cs.surfaceContainerHighest,
                      borderRadius: BorderRadius.circular(20),
                    ),
                    child: Text(s.category,
                        style: TextStyle(
                            fontSize: 11, color: cs.onSurfaceVariant)),
                  ),
                  if (s.upvotes > 0) ...[
                    const SizedBox(width: 6),
                    Icon(Icons.arrow_upward_rounded,
                        size: 12, color: cs.onSurfaceVariant),
                    Text('${s.upvotes}',
                        style: TextStyle(
                            fontSize: 11, color: cs.onSurfaceVariant)),
                  ],
                  const Spacer(),
                  Icon(Icons.chevron_right,
                      size: 18, color: cs.outlineVariant),
                ],
              ),
              const SizedBox(height: 8),
              Text(
                s.title,
                style: TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.w600,
                    color: cs.onSurface),
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
              ),
              const SizedBox(height: 4),
              Text(
                '${s.platformName} · ${_ago(s.createdAt)}',
                style:
                    TextStyle(fontSize: 12, color: cs.onSurfaceVariant),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

// ── Detail screen ─────────────────────────────────────────────────────────────

class _SuggestionDetailScreen extends StatelessWidget {
  final MySuggestion suggestion;
  const _SuggestionDetailScreen({required this.suggestion});

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    final s = suggestion;
    final (statusLabel, statusColor) = _statusMeta(s.status);

    return Scaffold(
      appBar: AppBar(title: const Text('Suggestion')),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Status + meta
            Wrap(
              spacing: 8,
              runSpacing: 6,
              children: [
                _StatusChip(label: statusLabel, color: statusColor),
                Container(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 10, vertical: 3),
                  decoration: BoxDecoration(
                    color: cs.surfaceContainerHighest,
                    borderRadius: BorderRadius.circular(20),
                  ),
                  child: Text(s.category,
                      style: TextStyle(
                          fontSize: 12, color: cs.onSurfaceVariant)),
                ),
                if (s.upvotes > 0)
                  Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(Icons.arrow_upward_rounded,
                          size: 14, color: cs.onSurfaceVariant),
                      const SizedBox(width: 2),
                      Text('${s.upvotes} upvotes',
                          style: TextStyle(
                              fontSize: 12, color: cs.onSurfaceVariant)),
                    ],
                  ),
              ],
            ),
            const SizedBox(height: 14),
            Text(s.title,
                style: TextStyle(
                    fontSize: 19,
                    fontWeight: FontWeight.w700,
                    color: cs.onSurface)),
            const SizedBox(height: 4),
            Text(
              '${s.platformName} · ${_formatDate(s.createdAt)}',
              style: TextStyle(fontSize: 13, color: cs.onSurfaceVariant),
            ),
            const SizedBox(height: 16),
            Text(s.body,
                style: TextStyle(
                    fontSize: 15,
                    color: cs.onSurface,
                    height: 1.55)),

            // Timeline
            const SizedBox(height: 24),
            _TimelineSection(suggestion: s, cs: cs),
          ],
        ),
      ),
    );
  }
}

class _TimelineSection extends StatelessWidget {
  final MySuggestion suggestion;
  final ColorScheme cs;
  const _TimelineSection({required this.suggestion, required this.cs});

  @override
  Widget build(BuildContext context) {
    final s = suggestion;

    final steps = <_TimelineStep>[
      _TimelineStep(
        icon: Icons.send_rounded,
        color: const Color(0xFF0055A4),
        title: 'Submitted',
        subtitle: _formatDate(s.createdAt),
        done: true,
      ),
      _TimelineStep(
        icon: Icons.admin_panel_settings_outlined,
        color: _statusColor(s.status),
        title: _adminStepTitle(s.status),
        subtitle: s.adminNote,
        done: s.status != 'pending',
      ),
      if (['forwarded', 'acknowledged', 'planned', 'declined'].contains(s.status))
        _TimelineStep(
          icon: Icons.business_outlined,
          color: _operatorStepColor(s.status),
          title: _operatorStepTitle(s.status),
          subtitle: s.operatorNote,
          done: s.status != 'forwarded',
        ),
    ];

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text('Status timeline',
            style: TextStyle(
                fontSize: 13,
                fontWeight: FontWeight.w600,
                color: cs.onSurfaceVariant)),
        const SizedBox(height: 12),
        ...steps.asMap().entries.map((e) => _TimelineRow(
              step: e.value,
              isLast: e.key == steps.length - 1,
              cs: cs,
            )),
      ],
    );
  }

  static String _adminStepTitle(String status) => switch (status) {
        'pending'  => 'Awaiting admin review',
        'public'   => 'Admin approved — now public',
        'dismissed'=> 'Admin dismissed',
        _          => 'Admin forwarded to operator',
      };

  static Color _statusColor(String status) => switch (status) {
        'pending'   => const Color(0xFFF59E0B),
        'public'    => const Color(0xFF3B82F6),
        'dismissed' => const Color(0xFFEF4444),
        _           => const Color(0xFF8B5CF6),
      };

  static String _operatorStepTitle(String status) => switch (status) {
        'forwarded'    => 'Waiting for operator',
        'acknowledged' => 'Operator acknowledged',
        'planned'      => 'Operator plans to implement',
        'declined'     => 'Operator declined',
        _              => status,
      };

  static Color _operatorStepColor(String status) => switch (status) {
        'forwarded'    => const Color(0xFFF59E0B),
        'acknowledged' => const Color(0xFF0D9488),
        'planned'      => const Color(0xFF16A34A),
        'declined'     => const Color(0xFFEF4444),
        _              => const Color(0xFF6B7280),
      };
}

class _TimelineStep {
  final IconData icon;
  final Color color;
  final String title;
  final String? subtitle;
  final bool done;
  const _TimelineStep({
    required this.icon,
    required this.color,
    required this.title,
    this.subtitle,
    required this.done,
  });
}

class _TimelineRow extends StatelessWidget {
  final _TimelineStep step;
  final bool isLast;
  final ColorScheme cs;
  const _TimelineRow(
      {required this.step, required this.isLast, required this.cs});

  @override
  Widget build(BuildContext context) {
    final dimColor =
        step.done ? step.color : cs.onSurface.withAlpha(60);

    return IntrinsicHeight(
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 32,
            child: Column(
              children: [
                Container(
                  width: 30,
                  height: 30,
                  decoration: BoxDecoration(
                    color: step.done
                        ? step.color.withAlpha(20)
                        : cs.surfaceContainerHighest,
                    shape: BoxShape.circle,
                    border: Border.all(
                        color: step.done
                            ? step.color.withAlpha(80)
                            : cs.outlineVariant),
                  ),
                  child: Icon(step.icon, size: 15, color: dimColor),
                ),
                if (!isLast)
                  Expanded(
                    child: Container(
                      width: 2,
                      margin: const EdgeInsets.symmetric(vertical: 3),
                      color: cs.outlineVariant.withAlpha(80),
                    ),
                  ),
              ],
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Padding(
              padding: EdgeInsets.only(bottom: isLast ? 0 : 18),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const SizedBox(height: 5),
                  Text(step.title,
                      style: TextStyle(
                          fontSize: 13,
                          fontWeight: FontWeight.w600,
                          color: step.done ? cs.onSurface : cs.onSurfaceVariant)),
                  if (step.subtitle != null && step.subtitle!.isNotEmpty) ...[
                    const SizedBox(height: 4),
                    Container(
                      padding: const EdgeInsets.symmetric(
                          horizontal: 10, vertical: 7),
                      decoration: BoxDecoration(
                        color: step.color.withAlpha(12),
                        borderRadius: BorderRadius.circular(8),
                        border:
                            Border.all(color: step.color.withAlpha(40)),
                      ),
                      child: Text(step.subtitle!,
                          style: TextStyle(
                              fontSize: 13,
                              color: cs.onSurface,
                              height: 1.4)),
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
}

// ── Shared helpers ────────────────────────────────────────────────────────────

class _StatusChip extends StatelessWidget {
  final String label;
  final Color color;
  const _StatusChip({required this.label, required this.color});

  @override
  Widget build(BuildContext context) => Container(
        padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 3),
        decoration: BoxDecoration(
          color: color.withAlpha(20),
          borderRadius: BorderRadius.circular(20),
          border: Border.all(color: color.withAlpha(70)),
        ),
        child: Text(label,
            style: TextStyle(
                fontSize: 11,
                color: color,
                fontWeight: FontWeight.w700)),
      );
}

(String, Color) _statusMeta(String status) => switch (status) {
      'pending'      => ('Under review',  const Color(0xFFF59E0B)),
      'public'       => ('Public',        const Color(0xFF3B82F6)),
      'dismissed'    => ('Dismissed',     const Color(0xFF6B7280)),
      'forwarded'    => ('Forwarded',     const Color(0xFF8B5CF6)),
      'acknowledged' => ('Acknowledged',  const Color(0xFF0D9488)),
      'planned'      => ('Planned',       const Color(0xFF16A34A)),
      'declined'     => ('Declined',      const Color(0xFFEF4444)),
      _              => (status,          const Color(0xFF6B7280)),
    };

String _ago(DateTime t) {
  final diff = DateTime.now().difference(t);
  if (diff.inMinutes < 60) return '${diff.inMinutes}m ago';
  if (diff.inHours < 24) return '${diff.inHours}h ago';
  if (diff.inDays < 30) return '${diff.inDays}d ago';
  return _formatDate(t);
}

String _formatDate(DateTime t) =>
    '${_month(t.month)} ${t.day}, ${t.year}';

String _month(int m) => const [
      '', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
      'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
    ][m];
