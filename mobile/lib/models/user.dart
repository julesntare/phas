class User {
  final String id;
  final String phone;
  final String? district;
  final String? name;

  const User({required this.id, required this.phone, this.district, this.name});

  factory User.fromJson(Map<String, dynamic> j) => User(
        id: j['id'] as String,
        phone: j['phone'] as String,
        district: j['district'] as String?,
        name: j['name'] as String?,
      );
}
