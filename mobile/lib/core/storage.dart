import 'package:flutter/foundation.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

class SecureStorage {
  static const _storage = FlutterSecureStorage();
  static const _tokenKey = 'auth_token';

  // GoRouter listens to this — incremented on save/delete so the router
  // re-evaluates its redirect immediately without waiting for a navigation event.
  static final authVersion = ValueNotifier<int>(0);

  static Future<void> saveToken(String token) async {
    await _storage.write(key: _tokenKey, value: token);
    authVersion.value++;
  }

  static Future<String?> getToken() => _storage.read(key: _tokenKey);

  static Future<void> deleteToken() async {
    await _storage.delete(key: _tokenKey);
    authVersion.value++;
  }

  static Future<bool> hasToken() async => (await getToken()) != null;
}
