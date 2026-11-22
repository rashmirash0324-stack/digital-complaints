import 'dart:async';
import 'dart:convert';
import 'dart:io';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';

const List<String> kCategories = [
  'Water',
  'Electricity',
  'Road',
  'Sanitation',
  'Public Services',
  'Other',
];

const List<String> kStatuses = [
  'Pending',
  'In Progress',
  'Resolved',
  'Failed',
  'Rejected',
];

const String kWhatsAppNumber = '919611377970';
const String kWhatsAppDisplay = '+91 96113 77970';

// Auto-tries USB ADB (127.0.0.1) and PC Wi-Fi (192.168.1.3) automatically.
const String kDefaultBaseUrl = 'http://127.0.0.1:5000/api';
const List<String> kFallbackBaseUrls = [
  'http://127.0.0.1:5000/api',
  'http://192.168.1.3:5000/api',
  'http://10.0.2.2:5000/api',
];

class ApiException implements Exception {
  final String message;
  final int? statusCode;
  ApiException(this.message, [this.statusCode]);

  @override
  String toString() => message;
}

class ApiService {
  ApiService._();
  static final ApiService instance = ApiService._();

  static const _tokenKey = 'token';
  static const _userKey = 'user';
  static const _baseUrlKey = 'api_base_url';

  String _baseUrl = kDefaultBaseUrl;
  String? _token;
  Map<String, dynamic>? _user;

  String get baseUrl => _baseUrl;
  String? get token => _token;
  Map<String, dynamic>? get user => _user;
  bool get isAuthenticated => _token != null && _user != null;
  String get role => (_user?['role'] as String?) ?? 'user';
  bool get isAdmin => role == 'admin';
  bool get isStaff => role == 'staff';
  bool get isOfficial => isAdmin || isStaff;

  Future<void> init() async {
    final prefs = await SharedPreferences.getInstance();
    _baseUrl = prefs.getString(_baseUrlKey) ?? kDefaultBaseUrl;
    _token = prefs.getString(_tokenKey);
    final rawUser = prefs.getString(_userKey);
    if (rawUser != null) {
      try {
        _user = jsonDecode(rawUser) as Map<String, dynamic>;
      } catch (_) {
        _user = null;
      }
    }

    // Auto-discover reachable backend (USB ADB vs Wi-Fi) if current URL is unreachable
    if (!await testConnection(_baseUrl)) {
      for (final candidate in kFallbackBaseUrls) {
        if (candidate == _baseUrl) continue;
        if (await testConnection(candidate)) {
          _baseUrl = candidate;
          await prefs.setString(_baseUrlKey, _baseUrl);
          break;
        }
      }
    }
  }

  Future<void> setBaseUrl(String url) async {
    var clean = url.trim();
    if (clean.endsWith('/')) {
      clean = clean.substring(0, clean.length - 1);
    }
    if (!clean.endsWith('/api')) {
      clean = '$clean/api';
    }
    _baseUrl = clean;
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_baseUrlKey, _baseUrl);
  }

  Future<void> saveSession(String token, Map<String, dynamic> user) async {
    _token = token;
    _user = user;
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_tokenKey, token);
    await prefs.setString(_userKey, jsonEncode(user));
  }

  Future<void> logout() async {
    _token = null;
    _user = null;
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(_tokenKey);
    await prefs.remove(_userKey);
  }

  Map<String, String> _headers() {
    final h = <String, String>{'Content-Type': 'application/json'};
    if (_token != null && _token!.isNotEmpty) {
      h['Authorization'] = 'Bearer $_token';
    }
    return h;
  }

  Future<dynamic> _request(
    String method,
    String path, {
    Map<String, dynamic>? body,
  }) async {
    final uri = Uri.parse('$_baseUrl$path');
    http.Response res;

    try {
      final future = switch (method) {
        'GET' => http.get(uri, headers: _headers()),
        'POST' => http.post(uri, headers: _headers(), body: jsonEncode(body ?? {})),
        'PUT' => http.put(uri, headers: _headers(), body: jsonEncode(body ?? {})),
        'DELETE' => http.delete(uri, headers: _headers()),
        _ => throw ApiException('Unsupported HTTP method'),
      };
      res = await future.timeout(const Duration(seconds: 20));
    } on SocketException {
      throw ApiException('Cannot reach server at $_baseUrl. Check Wi-Fi or Server Settings.');
    } on TimeoutException {
      throw ApiException('Request timed out. Check your connection to the server.');
    } catch (e) {
      throw ApiException('Network error: $e');
    }

    dynamic decoded;
    try {
      decoded = res.body.isNotEmpty ? jsonDecode(res.body) : {};
    } catch (_) {
      decoded = {'message': res.body};
    }

    if (res.statusCode == 401 &&
        !path.contains('/auth/login') &&
        !path.contains('/auth/register')) {
      await logout();
      throw ApiException('Session expired. Please login again.', 401);
    }

    if (res.statusCode < 200 || res.statusCode >= 300) {
      final msg = (decoded is Map && decoded['message'] is String)
          ? decoded['message'] as String
          : 'Request failed (${res.statusCode})';
      throw ApiException(msg, res.statusCode);
    }

    return decoded;
  }

  // Test root server reachability (strips /api)
  Future<bool> testConnection([String? customApiUrl]) async {
    final target = (customApiUrl ?? _baseUrl).replaceFirst(RegExp(r'/api/?$'), '');
    try {
      final res = await http.get(Uri.parse('$target/')).timeout(const Duration(seconds: 6));
      return res.statusCode == 200;
    } catch (_) {
      return false;
    }
  }

  // ---------- Auth ----------
  Future<Map<String, dynamic>> login(String identifier, String password) async {
    final data = await _request('POST', '/auth/login', body: {
      'identifier': identifier.trim(),
      'password': password,
    }) as Map<String, dynamic>;
    await saveSession(data['token'] as String, data['user'] as Map<String, dynamic>);
    return data;
  }

  Future<Map<String, dynamic>> register({
    required String name,
    required String email,
    required String phone,
    required String password,
  }) async {
    final data = await _request('POST', '/auth/register', body: {
      'name': name.trim(),
      'email': email.trim(),
      'phone': phone.trim(),
      'password': password,
    }) as Map<String, dynamic>;
    if (data['token'] != null && data['user'] != null) {
      await saveSession(data['token'] as String, data['user'] as Map<String, dynamic>);
    }
    return data;
  }

  Future<Map<String, dynamic>> sendResetOtp(String identifier) async {
    return (await _request('POST', '/auth/forgot-password/send-otp', body: {
      'identifier': identifier.trim(),
    })) as Map<String, dynamic>;
  }

  Future<String> verifyOtpAndReset({
    required String identifier,
    required String otp,
    required String newPassword,
  }) async {
    final data = await _request('POST', '/auth/forgot-password/verify-reset', body: {
      'identifier': identifier.trim(),
      'otp': otp.trim(),
      'newPassword': newPassword,
    }) as Map<String, dynamic>;
    return (data['message'] as String?) ?? 'Password reset successful.';
  }

  Future<Map<String, dynamic>?> refreshMe() async {
    if (_token == null) return null;
    final data = await _request('GET', '/auth/me') as Map<String, dynamic>;
    _user = data;
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_userKey, jsonEncode(data));
    return data;
  }

  // ---------- Complaints ----------
  Future<List<Map<String, dynamic>>> getComplaints() async {
    final data = await _request('GET', '/complaints');
    if (data is List) {
      return data.cast<Map<String, dynamic>>();
    }
    return [];
  }

  Future<Map<String, dynamic>> getComplaint(String id) async {
    return (await _request('GET', '/complaints/$id')) as Map<String, dynamic>;
  }

  Future<Map<String, dynamic>> submitComplaint({
    required String title,
    required String category,
    required String location,
    required String description,
    Map<String, dynamic>? photo,
  }) async {
    final body = <String, dynamic>{
      'title': title.trim(),
      'category': category,
      'location': location.trim(),
      'description': description.trim(),
    };
    if (photo != null) body['photo'] = photo;
    return (await _request('POST', '/complaints', body: body)) as Map<String, dynamic>;
  }

  Future<Map<String, dynamic>> updateComplaintStatus(String id, String status) async {
    final data = await _request('PUT', '/complaints/$id', body: {'status': status})
        as Map<String, dynamic>;
    return data['complaint'] as Map<String, dynamic>;
  }

  Future<Map<String, dynamic>> assignComplaint(String id, String? staffId) async {
    final data = await _request('PUT', '/complaints/$id/assign', body: {'staffId': staffId})
        as Map<String, dynamic>;
    return data['complaint'] as Map<String, dynamic>;
  }

  Future<Map<String, dynamic>> reviewComplaint({
    required String id,
    required String outcome,
    required String note,
    required String reason,
    Map<String, dynamic>? photo,
  }) async {
    final body = <String, dynamic>{
      'outcome': outcome,
      'note': note.trim(),
      'reason': reason.trim(),
    };
    if (photo != null) body['photo'] = photo;
    final data = await _request('PUT', '/complaints/$id/review', body: body)
        as Map<String, dynamic>;
    return data['complaint'] as Map<String, dynamic>;
  }

  Future<void> deleteComplaint(String id) async {
    await _request('DELETE', '/complaints/$id');
  }

  Future<Map<String, dynamic>> getComplaintPhoto(String id, String kind) async {
    return (await _request('GET', '/complaints/$id/photo/$kind')) as Map<String, dynamic>;
  }

  // ---------- Users & Staff (Admin) ----------
  Future<List<Map<String, dynamic>>> getUsers() async {
    final data = await _request('GET', '/users');
    return data is List ? data.cast<Map<String, dynamic>>() : [];
  }

  Future<List<Map<String, dynamic>>> getStaff() async {
    final data = await _request('GET', '/users/staff');
    return data is List ? data.cast<Map<String, dynamic>>() : [];
  }

  Future<Map<String, dynamic>> createStaff({
    String? userId,
    required String name,
    required String email,
    required String phone,
    required String password,
    required List<String> categories,
  }) async {
    final data = await _request('POST', '/users/staff', body: {
      if (userId != null && userId.trim().isNotEmpty) 'userId': userId.trim().toUpperCase(),
      'name': name.trim(),
      'email': email.trim(),
      'phone': phone.trim(),
      'password': password,
      'categories': categories,
    }) as Map<String, dynamic>;
    return data['user'] as Map<String, dynamic>;
  }

  Future<void> deleteStaff(String staffId) async {
    await _request('DELETE', '/users/staff/$staffId');
  }

  Future<Map<String, dynamic>> updateUserRole({
    required String userId,
    required String role,
    required List<String> categories,
  }) async {
    final data = await _request('PUT', '/users/$userId/role', body: {
      'role': role,
      'categories': categories,
    }) as Map<String, dynamic>;
    return data['user'] as Map<String, dynamic>;
  }

  // ---------- Feedback ----------
  Future<void> submitFeedback({required String message, required int rating}) async {
    await _request('POST', '/feedback', body: {
      'message': message.trim(),
      'rating': rating,
    });
  }

  Future<List<Map<String, dynamic>>> getFeedback() async {
    final data = await _request('GET', '/feedback');
    return data is List ? data.cast<Map<String, dynamic>>() : [];
  }
}
