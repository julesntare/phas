import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../models/user.dart';
import '../auth/auth_provider.dart';

/// The signed-in user. Watched by the app bar avatar and the account sheet as
/// well as the profile screen. autoDispose is deliberate: on sign-out the
/// signed-in screens leave the tree, the cache drops, and the next session
/// starts clean.
final profileProvider = FutureProvider.autoDispose<User>((ref) async {
  final data = await ref.read(apiClientProvider).get('/api/profile');
  return User.fromJson(data);
});
