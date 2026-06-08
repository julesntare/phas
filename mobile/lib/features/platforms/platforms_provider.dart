import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/api_client.dart';
import '../../models/platform.dart';
import '../auth/auth_provider.dart';

export '../../core/api_client.dart' show UnauthenticatedException;

final platformsProvider = FutureProvider<List<Platform>>((ref) async {
  final api = ref.read(apiClientProvider);
  final res = await api.get('/api/platforms');
  final list = res['platforms'] as List<dynamic>;
  return list.map((j) => Platform.fromJson(j as Map<String, dynamic>)).toList();
});

// Loads followed platform IDs from the API on init; syncs follow/unfollow
// back to the server immediately so the notifier knows who to prompt.
final followedPlatformsProvider =
    AsyncNotifierProvider<FollowedPlatformsNotifier, Set<String>>(
  FollowedPlatformsNotifier.new,
);

class FollowedPlatformsNotifier extends AsyncNotifier<Set<String>> {
  ApiClient get _api => ref.read(apiClientProvider);

  @override
  Future<Set<String>> build() async {
    try {
      final res = await _api.get('/api/subscriptions');
      final ids = res['platformIds'] as List<dynamic>;
      return ids.map((e) => e as String).toSet();
    } on UnauthenticatedException {
      // Token was cleared — router will redirect to /auth/phone via authVersion.
      return {};
    }
  }

  Future<void> follow(String platformId) async {
    // Optimistic update.
    final current = state.value ?? {};
    state = AsyncData({...current, platformId});

    try {
      await _api.post('/api/subscriptions', {'platformId': platformId});
    } catch (_) {
      // Roll back on failure.
      state = AsyncData(current);
      rethrow;
    }
  }

  Future<void> unfollow(String platformId) async {
    final current = state.value ?? {};
    state = AsyncData(current.difference({platformId}));

    try {
      await _api.delete('/api/subscriptions/$platformId');
    } catch (_) {
      state = AsyncData(current);
      rethrow;
    }
  }

  Future<void> toggle(String platformId) async {
    final isFollowing = state.value?.contains(platformId) ?? false;
    if (isFollowing) {
      await unfollow(platformId);
    } else {
      await follow(platformId);
    }
  }

  bool isFollowing(String platformId) =>
      state.value?.contains(platformId) ?? false;
}
