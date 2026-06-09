import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../models/platform.dart';
import '../platforms_provider.dart';

class PlatformsScreen extends ConsumerWidget {
  const PlatformsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
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
      body: platforms.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (e, _) => Center(child: Text('Error: $e')),
        data: (list) => ListView.separated(
          itemCount: list.length,
          separatorBuilder: (_, _) => const Divider(height: 1),
          itemBuilder: (context, i) => _PlatformTile(platform: list[i]),
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
    // Use .value so the tile stays responsive while the async state loads.
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
                  onTap: () =>
                      ref.read(followedPlatformsProvider.notifier).toggle(platform.id),
                  child: Icon(
                    isFollowing ? Icons.notifications_active : Icons.notifications_none,
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
        style: TextStyle(fontSize: 11, color: color, fontWeight: FontWeight.w500),
      ),
    );
  }
}
