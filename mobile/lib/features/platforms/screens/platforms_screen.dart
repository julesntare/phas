import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../models/platform.dart';
import '../platforms_provider.dart';

// ── Category icon mapping ─────────────────────────────────────────────────────

IconData _categoryIcon(String category) => switch (category.toLowerCase()) {
      'payment' || 'finance' || 'banking'           => Icons.account_balance_wallet_outlined,
      'identity' || 'documents' || 'id'             => Icons.badge_outlined,
      'health' || 'medical' || 'hospital'           => Icons.local_hospital_outlined,
      'education' || 'school'                       => Icons.school_outlined,
      'agriculture' || 'farming'                    => Icons.eco_outlined,
      'transport' || 'transportation'               => Icons.directions_bus_outlined,
      'government' || 'public service'              => Icons.account_balance_outlined,
      'tax' || 'revenue' || 'customs'               => Icons.receipt_long_outlined,
      'social' || 'welfare'                         => Icons.people_outline,
      'energy' || 'electricity' || 'power'          => Icons.bolt_outlined,
      'telecom' || 'telecommunications' || 'mobile' => Icons.cell_tower_outlined,
      'internet' || 'connectivity' || 'broadband'   => Icons.wifi_outlined,
      'water' || 'utilities' || 'sanitation'        => Icons.water_drop_outlined,
      'security' || 'police'                        => Icons.shield_outlined,
      _                                             => Icons.web_outlined,
    };

// ── Screen ────────────────────────────────────────────────────────────────────

class PlatformsScreen extends ConsumerStatefulWidget {
  const PlatformsScreen({super.key});

  @override
  ConsumerState<PlatformsScreen> createState() => _PlatformsScreenState();
}

class _PlatformsScreenState extends ConsumerState<PlatformsScreen> {
  final _searchCtrl = TextEditingController();
  String _query = '';
  String? _category;
  bool _issuesOnly = false;
  Timer? _refreshTimer;

  @override
  void initState() {
    super.initState();
    _refreshTimer = Timer.periodic(
      const Duration(seconds: 30),
      (_) => ref.invalidate(platformsProvider),
    );
  }

  @override
  void dispose() {
    _refreshTimer?.cancel();
    _searchCtrl.dispose();
    super.dispose();
  }

  List<Platform> _filter(List<Platform> all) {
    // Issues bubble to top.
    final sorted = [...all]..sort((a, b) {
        if (a.hasIssue == b.hasIssue) return a.name.compareTo(b.name);
        return a.hasIssue ? -1 : 1;
      });
    return sorted.where((p) {
      if (_issuesOnly && !p.hasIssue) return false;
      if (_category != null && p.category != _category) return false;
      if (_query.isNotEmpty &&
          !p.name.toLowerCase().contains(_query.toLowerCase()) &&
          !p.authorityName.toLowerCase().contains(_query.toLowerCase())) {
        return false;
      }
      return true;
    }).toList();
  }

  @override
  Widget build(BuildContext context) {
    final platforms = ref.watch(platformsProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Platforms'),
        actions: [
          IconButton(
            icon: const Icon(Icons.notifications_none_outlined, size: 22),
            onPressed: () => context.push('/notifications'),
            tooltip: 'Notifications',
          ),
          IconButton(
            icon: const Icon(Icons.refresh_outlined, size: 22),
            onPressed: () => ref.invalidate(platformsProvider),
            tooltip: 'Refresh',
          ),
          IconButton(
            icon: const Icon(Icons.person_outline, size: 22),
            onPressed: () => context.push('/profile'),
            tooltip: 'Profile',
          ),
          const SizedBox(width: 4),
        ],
      ),
      body: Column(
        children: [
          // ── Health summary banner ────────────────────────────────────────
          platforms.when(
            loading: () => const SizedBox.shrink(),
            error: (_, _) => const SizedBox.shrink(),
            data: (list) {
              if (list.isEmpty) return const SizedBox.shrink();
              final issueCount = list.where((p) => p.hasIssue).length;
              final total = list.length;
              final allOk = issueCount == 0;
              return Container(
                color: allOk ? const Color(0xFFF0FDF4) : const Color(0xFFFFF7ED),
                padding: const EdgeInsets.fromLTRB(16, 12, 16, 12),
                child: Row(
                  children: [
                    Container(
                      width: 38,
                      height: 38,
                      decoration: BoxDecoration(
                        color: allOk
                            ? const Color(0xFF16A34A).withAlpha(20)
                            : const Color(0xFFF97316).withAlpha(20),
                        borderRadius: BorderRadius.circular(10),
                      ),
                      child: Icon(
                        allOk
                            ? Icons.check_circle_rounded
                            : Icons.warning_amber_rounded,
                        color: allOk
                            ? const Color(0xFF16A34A)
                            : const Color(0xFFF97316),
                        size: 20,
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            allOk
                                ? 'All systems operational'
                                : '$issueCount of $total platforms affected',
                            style: TextStyle(
                              fontSize: 13,
                              fontWeight: FontWeight.w700,
                              color: allOk
                                  ? const Color(0xFF15803D)
                                  : const Color(0xFF92400E),
                            ),
                          ),
                          Text(
                            allOk
                                ? '$total platforms monitored'
                                : 'Some services may be degraded',
                            style: TextStyle(
                              fontSize: 11,
                              color: allOk
                                  ? const Color(0xFF15803D)
                                  : const Color(0xFFFBBF24),
                            ),
                          ),
                        ],
                      ),
                    ),
                    // Small live dot
                    Container(
                      width: 8,
                      height: 8,
                      decoration: BoxDecoration(
                        color: allOk
                            ? const Color(0xFF16A34A)
                            : const Color(0xFFF97316),
                        shape: BoxShape.circle,
                      ),
                    ),
                  ],
                ),
              );
            },
          ),
          // ── Search bar ──────────────────────────────────────────────────
          Container(
            color: Colors.white,
            padding: const EdgeInsets.fromLTRB(12, 8, 12, 0),
            child: TextField(
              controller: _searchCtrl,
              onChanged: (v) => setState(() => _query = v),
              style: const TextStyle(fontSize: 15),
              decoration: InputDecoration(
                hintText: 'Search platforms…',
                hintStyle: const TextStyle(color: Color(0xFF9CA3AF)),
                prefixIcon: const Icon(Icons.search, size: 20,
                    color: Color(0xFF9CA3AF)),
                suffixIcon: _query.isNotEmpty
                    ? IconButton(
                        icon: const Icon(Icons.close, size: 18),
                        onPressed: () {
                          _searchCtrl.clear();
                          setState(() => _query = '');
                        },
                      )
                    : null,
              ),
            ),
          ),
          // ── Filter chips ────────────────────────────────────────────────
          platforms.when(
            loading: () => const SizedBox.shrink(),
            error: (_, st) => const SizedBox.shrink(),
            data: (list) {
              final categories =
                  list.map((p) => p.category).toSet().toList()..sort();
              return Container(
                color: Colors.white,
                child: SingleChildScrollView(
                  scrollDirection: Axis.horizontal,
                  padding: const EdgeInsets.fromLTRB(12, 8, 12, 10),
                  child: Row(
                    children: [
                      _FilterChip(
                        label: 'Issues only',
                        icon: Icons.warning_amber_rounded,
                        selected: _issuesOnly,
                        color: Colors.red,
                        onTap: () =>
                            setState(() => _issuesOnly = !_issuesOnly),
                      ),
                      const SizedBox(width: 6),
                      ...categories.map((cat) => Padding(
                            padding: const EdgeInsets.only(right: 6),
                            child: _FilterChip(
                              label: cat,
                              icon: _categoryIcon(cat),
                              selected: _category == cat,
                              onTap: () => setState(() =>
                                  _category = _category == cat ? null : cat),
                            ),
                          )),
                    ],
                  ),
                ),
              );
            },
          ),
          const Divider(),
          // ── List ────────────────────────────────────────────────────────
          Expanded(
            child: platforms.when(
              loading: () =>
                  const Center(child: CircularProgressIndicator()),
              error: (e, _) => _ErrorState(error: '$e'),
              data: (list) {
                final filtered = _filter(list);
                if (filtered.isEmpty) return _EmptyState(filtered: _query.isNotEmpty || _category != null || _issuesOnly);
                return ListView.separated(
                  padding: const EdgeInsets.symmetric(vertical: 8),
                  itemCount: filtered.length,
                  separatorBuilder: (_, i) => const Divider(indent: 72),
                  itemBuilder: (context, i) =>
                      _PlatformTile(platform: filtered[i]),
                );
              },
            ),
          ),
        ],
      ),
    );
  }
}

// ── Filter chip ───────────────────────────────────────────────────────────────

class _FilterChip extends StatelessWidget {
  final String label;
  final IconData? icon;
  final bool selected;
  final Color? color;
  final VoidCallback onTap;

  const _FilterChip({
    required this.label,
    required this.selected,
    required this.onTap,
    this.icon,
    this.color,
  });

  @override
  Widget build(BuildContext context) {
    final c = color ?? Theme.of(context).colorScheme.primary;
    return GestureDetector(
      onTap: onTap,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 150),
        padding:
            const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
        decoration: BoxDecoration(
          color: selected ? c.withAlpha(25) : const Color(0xFFF3F4F6),
          border: Border.all(
              color: selected ? c : Colors.transparent, width: 1.5),
          borderRadius: BorderRadius.circular(20),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            if (icon != null) ...[
              Icon(icon, size: 13,
                  color: selected ? c : const Color(0xFF6B7280)),
              const SizedBox(width: 4),
            ],
            Text(
              label,
              style: TextStyle(
                fontSize: 12,
                color: selected ? c : const Color(0xFF6B7280),
                fontWeight:
                    selected ? FontWeight.w600 : FontWeight.w500,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

// ── Platform tile ─────────────────────────────────────────────────────────────

class _PlatformTile extends ConsumerWidget {
  final Platform platform;
  const _PlatformTile({required this.platform});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final followed = ref.watch(followedPlatformsProvider).value;
    final isFollowing = followed?.contains(platform.id) ?? false;
    final isLoadingFollow = followed == null;
    final hasIssue = platform.hasIssue;
    final statusColor = hasIssue ? const Color(0xFFEF4444) : const Color(0xFF16A34A);

    return InkWell(
      onTap: () =>
          context.push('/platforms/${platform.id}', extra: platform),
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
        child: Row(
          children: [
            // Category icon circle
            Container(
              width: 42,
              height: 42,
              decoration: BoxDecoration(
                color: statusColor.withAlpha(20),
                borderRadius: BorderRadius.circular(10),
              ),
              child: Icon(_categoryIcon(platform.category),
                  size: 20, color: statusColor),
            ),
            const SizedBox(width: 12),
            // Name + authority
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    platform.name,
                    style: const TextStyle(
                        fontSize: 15, fontWeight: FontWeight.w600,
                        color: Color(0xFF111827)),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    platform.authorityName,
                    style: const TextStyle(
                        fontSize: 12, color: Color(0xFF6B7280)),
                  ),
                  if (platform.uptime7d != null) ...[
                    const SizedBox(height: 3),
                    _UptimeBar(uptime: platform.uptime7d!),
                  ],
                ],
              ),
            ),
            const SizedBox(width: 8),
            // Status + follow
            Column(
              crossAxisAlignment: CrossAxisAlignment.end,
              children: [
                _StatusBadge(platform: platform),
                const SizedBox(height: 6),
                isLoadingFollow
                    ? const SizedBox(
                        width: 20, height: 20,
                        child: CircularProgressIndicator(strokeWidth: 2))
                    : GestureDetector(
                        onTap: () => ref
                            .read(followedPlatformsProvider.notifier)
                            .toggle(platform.id),
                        child: Icon(
                          isFollowing
                              ? Icons.notifications_active
                              : Icons.notifications_none_outlined,
                          size: 20,
                          color: isFollowing
                              ? Theme.of(context).colorScheme.primary
                              : const Color(0xFFD1D5DB),
                        ),
                      ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

class _UptimeBar extends StatelessWidget {
  final double uptime;
  const _UptimeBar({required this.uptime});

  @override
  Widget build(BuildContext context) {
    final color = uptime >= 99
        ? const Color(0xFF16A34A)
        : uptime >= 95
            ? const Color(0xFFF97316)
            : const Color(0xFFEF4444);
    return Row(
      children: [
        ClipRRect(
          borderRadius: BorderRadius.circular(2),
          child: SizedBox(
            width: 48,
            height: 3,
            child: LinearProgressIndicator(
              value: uptime / 100,
              backgroundColor: color.withAlpha(30),
              valueColor: AlwaysStoppedAnimation(color),
            ),
          ),
        ),
        const SizedBox(width: 4),
        Text('${uptime.toStringAsFixed(1)}%',
            style: TextStyle(fontSize: 10, color: color,
                fontWeight: FontWeight.w500)),
      ],
    );
  }
}

class _StatusBadge extends StatelessWidget {
  final Platform platform;
  const _StatusBadge({required this.platform});

  @override
  Widget build(BuildContext context) {
    if (!platform.hasIssue) {
      return Container(
        padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2),
        decoration: BoxDecoration(
          color: const Color(0xFFDCFCE7),
          borderRadius: BorderRadius.circular(20),
        ),
        child: const Text('OK',
            style: TextStyle(fontSize: 10, color: Color(0xFF16A34A),
                fontWeight: FontWeight.w700)),
      );
    }
    final (color, label) = switch (platform.state) {
      'confirmed'          => (const Color(0xFFEF4444), 'Issue'),
      'recurred'           => (const Color(0xFFDC2626), 'Recurred'),
      'acknowledged'       => (const Color(0xFFF97316), 'Ack\'d'),
      'partially_resolved' => (const Color(0xFF8B5CF6), 'Partial'),
      _                    => (const Color(0xFFF59E0B), 'Detecting'),
    };
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2),
      decoration: BoxDecoration(
        color: color.withAlpha(25),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: color.withAlpha(100)),
      ),
      child: Text(label,
          style: TextStyle(fontSize: 10, color: color,
              fontWeight: FontWeight.w700)),
    );
  }
}

// ── Empty / error states ──────────────────────────────────────────────────────

class _EmptyState extends StatelessWidget {
  final bool filtered;
  const _EmptyState({required this.filtered});

  @override
  Widget build(BuildContext context) => Center(
        child: Padding(
          padding: const EdgeInsets.all(32),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(filtered ? Icons.search_off : Icons.web_outlined,
                  size: 48, color: const Color(0xFFD1D5DB)),
              const SizedBox(height: 12),
              Text(
                filtered
                    ? 'No platforms match your filters'
                    : 'No platforms yet',
                style: const TextStyle(
                    fontSize: 15, color: Color(0xFF6B7280),
                    fontWeight: FontWeight.w500),
              ),
            ],
          ),
        ),
      );
}

class _ErrorState extends StatelessWidget {
  final String error;
  const _ErrorState({required this.error});

  @override
  Widget build(BuildContext context) => Center(
        child: Padding(
          padding: const EdgeInsets.all(32),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Icon(Icons.cloud_off_outlined,
                  size: 48, color: Color(0xFFD1D5DB)),
              const SizedBox(height: 12),
              const Text('Could not load platforms',
                  style: TextStyle(fontSize: 15,
                      color: Color(0xFF6B7280),
                      fontWeight: FontWeight.w500)),
              const SizedBox(height: 4),
              Text(error,
                  style: const TextStyle(
                      fontSize: 12, color: Color(0xFF9CA3AF)),
                  textAlign: TextAlign.center),
            ],
          ),
        ),
      );
}
