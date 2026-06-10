import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../models/platform.dart';
import '../platforms_provider.dart';

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
    return all.where((p) {
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
            icon: const Icon(Icons.refresh),
            onPressed: () => ref.invalidate(platformsProvider),
          ),
          IconButton(
            icon: const Icon(Icons.person_outline),
            onPressed: () => context.push('/profile'),
          ),
        ],
      ),
      body: Column(
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(12, 8, 12, 4),
            child: TextField(
              controller: _searchCtrl,
              onChanged: (v) => setState(() => _query = v),
              decoration: InputDecoration(
                hintText: 'Search platforms…',
                prefixIcon: const Icon(Icons.search, size: 20),
                suffixIcon: _query.isNotEmpty
                    ? IconButton(
                        icon: const Icon(Icons.close, size: 18),
                        onPressed: () {
                          _searchCtrl.clear();
                          setState(() => _query = '');
                        },
                      )
                    : null,
                isDense: true,
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
                contentPadding: const EdgeInsets.symmetric(vertical: 8),
              ),
            ),
          ),
          platforms.when(
            loading: () => const SizedBox.shrink(),
            error: (_, _) => const SizedBox.shrink(),
            data: (list) {
              final categories = list.map((p) => p.category).toSet().toList()..sort();
              return SingleChildScrollView(
                scrollDirection: Axis.horizontal,
                padding: const EdgeInsets.fromLTRB(12, 4, 12, 4),
                child: Row(
                  children: [
                    _FilterChip(
                      label: 'Issues',
                      icon: Icons.warning_amber_rounded,
                      selected: _issuesOnly,
                      color: Colors.red,
                      onTap: () => setState(() => _issuesOnly = !_issuesOnly),
                    ),
                    const SizedBox(width: 6),
                    ...categories.map((cat) => Padding(
                          padding: const EdgeInsets.only(right: 6),
                          child: _FilterChip(
                            label: cat,
                            selected: _category == cat,
                            onTap: () => setState(
                              () => _category = _category == cat ? null : cat,
                            ),
                          ),
                        )),
                  ],
                ),
              );
            },
          ),
          Expanded(
            child: platforms.when(
              loading: () => const Center(child: CircularProgressIndicator()),
              error: (e, _) => Center(child: Text('Error: $e')),
              data: (list) {
                final filtered = _filter(list);
                if (filtered.isEmpty) {
                  return Center(
                    child: Text(
                      _query.isNotEmpty || _category != null || _issuesOnly
                          ? 'No platforms match your filters.'
                          : 'No platforms found.',
                      style: const TextStyle(color: Colors.black54),
                    ),
                  );
                }
                return ListView.separated(
                  itemCount: filtered.length,
                  separatorBuilder: (_, i) => const Divider(height: 1),
                  itemBuilder: (context, i) => _PlatformTile(platform: filtered[i]),
                );
              },
            ),
          ),
        ],
      ),
    );
  }
}

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
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
        decoration: BoxDecoration(
          color: selected ? c.withAlpha(30) : Colors.transparent,
          border: Border.all(color: selected ? c : Colors.black26),
          borderRadius: BorderRadius.circular(20),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            if (icon != null) ...[
              Icon(icon, size: 14, color: selected ? c : Colors.black54),
              const SizedBox(width: 4),
            ],
            Text(
              label,
              style: TextStyle(
                fontSize: 12,
                color: selected ? c : Colors.black54,
                fontWeight: selected ? FontWeight.w600 : FontWeight.normal,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _PlatformTile extends ConsumerWidget {
  final Platform platform;
  const _PlatformTile({required this.platform});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final followed = ref.watch(followedPlatformsProvider).value;
    final isFollowing = followed?.contains(platform.id) ?? false;
    final isLoading = followed == null;

    return ListTile(
      title: Text(platform.name),
      subtitle: Text('${platform.authorityName} · ${platform.category}'),
      trailing: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          _StatusChip(platform: platform),
          const SizedBox(width: 8),
          isLoading
              ? const SizedBox(
                  width: 24,
                  height: 24,
                  child: CircularProgressIndicator(strokeWidth: 2),
                )
              : GestureDetector(
                  onTap: () => ref
                      .read(followedPlatformsProvider.notifier)
                      .toggle(platform.id),
                  child: Icon(
                    isFollowing
                        ? Icons.notifications_active
                        : Icons.notifications_none,
                    color: isFollowing
                        ? Theme.of(context).colorScheme.primary
                        : Colors.grey,
                  ),
                ),
        ],
      ),
      onTap: () => context.push('/platforms/${platform.id}', extra: platform),
    );
  }
}

class _StatusChip extends StatelessWidget {
  final Platform platform;
  const _StatusChip({required this.platform});

  @override
  Widget build(BuildContext context) {
    final color = platform.hasIssue ? Colors.red : Colors.green;
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
      decoration: BoxDecoration(
        color: color.withAlpha(26),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: color.withAlpha(77)),
      ),
      child: Text(
        platform.statusLabel,
        style: TextStyle(
            fontSize: 11, color: color, fontWeight: FontWeight.w500),
      ),
    );
  }
}
