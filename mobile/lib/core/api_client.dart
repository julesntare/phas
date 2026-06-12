import 'dart:convert';
import 'package:http/http.dart' as http;
import 'storage.dart';

class ApiClient {
  // Update to your Vercel deployment URL for production.
  static const String _baseUrl = String.fromEnvironment(
    'API_BASE_URL',
    defaultValue: 'https://phas-three.vercel.app',
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

  // Uploads a file as multipart/form-data and returns the stored URL.
  Future<String> uploadFile(String path, List<int> bytes, String filename) async {
    final token = await SecureStorage.getToken();
    final uri = Uri.parse('$_baseUrl$path');
    final request = http.MultipartRequest('POST', uri);
    if (token != null) request.headers['Authorization'] = 'Bearer $token';
    request.files.add(http.MultipartFile.fromBytes('file', bytes, filename: filename));
    final streamed = await _client.send(request);
    final res = await http.Response.fromStream(streamed);
    final body = _parse(res);
    return body['url'] as String;
  }

  Future<Map<String, dynamic>> patch(
    String path,
    Map<String, dynamic> body,
  ) async {
    final token = await SecureStorage.getToken();
    final res = await _client.patch(
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
    if (res.statusCode == 401) {
      SecureStorage.deleteToken();
      throw const UnauthenticatedException();
    }

    // Vercel (and other hosts) return HTML error pages on 5xx.
    // Guard before attempting JSON decode.
    final contentType = res.headers['content-type'] ?? '';
    if (!contentType.contains('application/json')) {
      throw ApiException(res.statusCode, 'Server error (${res.statusCode})');
    }

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

class UnauthenticatedException implements Exception {
  const UnauthenticatedException();
  @override
  String toString() => 'UnauthenticatedException';
}

class ApiException implements Exception {
  final int statusCode;
  final String message;
  const ApiException(this.statusCode, this.message);

  @override
  String toString() => 'ApiException($statusCode): $message';
}
