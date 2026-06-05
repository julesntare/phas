import 'dart:convert';
import 'package:http/http.dart' as http;
import 'storage.dart';

class ApiClient {
  // Update to your Vercel deployment URL for production.
  static const String _baseUrl = String.fromEnvironment(
    'API_BASE_URL',
    defaultValue:
        'https://phas-three.vercel.app', // Android emulator → localhost
  );

  final _client = http.Client();

  Future<Map<String, dynamic>> get(String path) async {
    final token = await SecureStorage.getToken();
    final res = await _client.get(
      Uri.parse('$_baseUrl$path'),
      headers: _headers(token),
    );
    return _parse(res);
  }

  Future<Map<String, dynamic>> post(
    String path,
    Map<String, dynamic> body, {
    bool auth = true,
  }) async {
    final token = auth ? await SecureStorage.getToken() : null;
    final res = await _client.post(
      Uri.parse('$_baseUrl$path'),
      headers: _headers(token),
      body: jsonEncode(body),
    );
    return _parse(res);
  }

  Future<Map<String, dynamic>> delete(String path) async {
    final token = await SecureStorage.getToken();
    final res = await _client.delete(
      Uri.parse('$_baseUrl$path'),
      headers: _headers(token),
    );
    return _parse(res);
  }

  Map<String, String> _headers(String? token) => {
    'Content-Type': 'application/json',
    if (token != null) 'Authorization': 'Bearer $token',
  };

  Map<String, dynamic> _parse(http.Response res) {
    final body = jsonDecode(res.body) as Map<String, dynamic>;
    if (res.statusCode >= 400) {
      throw ApiException(
        res.statusCode,
        body['error'] as String? ?? 'Unknown error',
      );
    }
    return body;
  }
}

class ApiException implements Exception {
  final int statusCode;
  final String message;
  const ApiException(this.statusCode, this.message);

  @override
  String toString() => 'ApiException($statusCode): $message';
}
