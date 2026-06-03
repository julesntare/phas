import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../models/platform.dart';
import '../auth/auth_provider.dart';

final platformsProvider = FutureProvider<List<Platform>>((ref) async {
  final api = ref.read(apiClientProvider);
  final res = await api.get('/api/platforms');
  final list = res['platforms'] as List<dynamic>;
  return list.map((j) => Platform.fromJson(j as Map<String, dynamic>)).toList();
});

// Tracks which platform IDs the user follows (local state for Phase 1).
// Phase 2 will sync this with the subscriptions table via the API.
final followedPlatformsProvider =
    NotifierProvider<FollowedPlatformsNotifier, Set<String>>(
  FollowedPlatformsNotifier.new,
);

class FollowedPlatformsNotifier extends Notifier<Set<String>> {
  @override
  Set<String> build() => {};

  void toggle(String platformId) {
    state = state.contains(platformId)
        ? Set.unmodifiable(state.difference({platformId}))
        : Set.unmodifiable({...state, platformId});
  }

  bool isFollowing(String platformId) => state.contains(platformId);
}
