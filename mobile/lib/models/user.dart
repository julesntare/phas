class User {
  final String id;
  final String? phone;
  final String? district;
  final String? name;
  final String? email;
  final String? avatarUrl;
  final String authType; // 'phone' | 'google'

  const User({
    required this.id,
    this.phone,
    this.district,
    this.name,
    this.email,
    this.avatarUrl,
    this.authType = 'phone',
  });

  String get displayName => name ?? email ?? phone ?? 'Citizen';

  factory User.fromJson(Map<String, dynamic> j) => User(
        id: j['id'] as String,
        phone: j['phone'] as String?,
        district: j['district'] as String?,
        name: j['name'] as String?,
        email: j['email'] as String?,
        avatarUrl: j['avatarUrl'] as String?,
        authType: j['authType'] as String? ?? 'phone',
      );
}
