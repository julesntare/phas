import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/api_client.dart';
import '../../core/notifications.dart';
import '../../core/storage.dart';
import '../../models/user.dart';

final apiClientProvider = Provider((_) => ApiClient());

final authProvider = AsyncNotifierProvider<AuthNotifier, User?>(AuthNotifier.new);

class AuthNotifier extends AsyncNotifier<User?> {
  ApiClient get _api => ref.read(apiClientProvider);

  @override
  Future<User?> build() async {
    // If a token is stored, treat session as active (server validates per-request).
    if (await SecureStorage.hasToken()) return null;
    return null;
  }

  Future<void> requestOtp(String phone) async {
    await _api.post('/api/auth/request-otp', {'phone': phone}, auth: false);
  }

  Future<void> verifyOtp(String phone, String code) async {
    state = const AsyncLoading();
    try {
      final res = await _api.post(
        '/api/auth/verify-otp',
        {'phone': phone, 'code': code},
        auth: false,
      );
      final token = res['token'] as String;
      await SecureStorage.saveToken(token);
      state = AsyncData(User.fromJson(res['user'] as Map<String, dynamic>));
      NotificationService.registerToken(_api).catchError((_) {});
    } catch (e, st) {
      state = AsyncError(e, st);
    }
  }

  Future<void> signOut() async {
    await _api.delete('/api/devices').catchError((_) => <String, dynamic>{});
    await SecureStorage.deleteToken();
    state = const AsyncData(null);
  }

  bool get isAuthenticated => state is AsyncData;
}
