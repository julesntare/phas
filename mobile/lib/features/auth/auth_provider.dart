import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:google_sign_in/google_sign_in.dart';
import '../../core/api_client.dart';
import '../../core/notifications.dart';
import '../../core/storage.dart';
import '../../models/user.dart';

// Web OAuth client ID — used as serverClientId so the ID token aud matches
// GOOGLE_CLIENT_ID on the backend, allowing the server to verify mobile tokens.
const _googleWebClientId = String.fromEnvironment(
  'GOOGLE_WEB_CLIENT_ID',
  defaultValue: '125065064230-v0vpsgkhmb4ueq3qft5b9asv4kniq3ek.apps.googleusercontent.com',
);

final apiClientProvider = Provider((_) => ApiClient());

final authProvider = AsyncNotifierProvider<AuthNotifier, User?>(AuthNotifier.new);

class AuthNotifier extends AsyncNotifier<User?> {
  ApiClient get _api => ref.read(apiClientProvider);

  @override
  Future<User?> build() async {
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
      rethrow;
    }
  }

  Future<void> signInWithGoogle() async {
    state = const AsyncLoading();
    try {
      final googleSignIn = GoogleSignIn(
        serverClientId: _googleWebClientId.isNotEmpty ? _googleWebClientId : null,
      );

      // Sign out first to force the account picker to show.
      await googleSignIn.signOut();
      final googleUser = await googleSignIn.signIn();
      if (googleUser == null) {
        // User cancelled — restore previous state.
        state = const AsyncData(null);
        return;
      }

      final googleAuth = await googleUser.authentication;
      final idToken = googleAuth.idToken;
      if (idToken == null) throw Exception('No ID token received from Google');

      final res = await _api.post(
        '/api/auth/google-mobile',
        {'idToken': idToken},
        auth: false,
      );

      final token = res['token'] as String;
      await SecureStorage.saveToken(token);
      state = AsyncData(User.fromJson(res['user'] as Map<String, dynamic>));
      NotificationService.registerToken(_api).catchError((_) {});
    } catch (e, st) {
      state = AsyncError(e, st);
      rethrow;
    }
  }

  Future<void> signOut() async {
    // Clear local credentials immediately so the router redirects at once.
    await SecureStorage.deleteToken();
    state = const AsyncData(null);
    // Best-effort server cleanup — don't block the UI on network calls.
    _api.delete('/api/devices').catchError((_) => <String, dynamic>{});
    GoogleSignIn().signOut().catchError((_) => null);
  }

  bool get isAuthenticated => state is AsyncData;
}
