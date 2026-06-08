const Map<String, List<String>> rwandaProvinceDistricts = {
  'City of Kigali': ['Gasabo', 'Kicukiro', 'Nyarugenge'],
  'Northern Province': ['Burera', 'Gakenke', 'Gicumbi', 'Musanze', 'Rulindo'],
  'Southern Province': [
    'Gisagara', 'Huye', 'Kamonyi', 'Muhanga',
    'Nyamagabe', 'Nyanza', 'Nyaruguru', 'Ruhango',
  ],
  'Eastern Province': [
    'Bugesera', 'Gatsibo', 'Kayonza', 'Kirehe',
    'Ngoma', 'Nyagatare', 'Rwamagana',
  ],
  'Western Province': [
    'Karongi', 'Ngororero', 'Nyabihu', 'Nyamasheke',
    'Rubavu', 'Rusizi', 'Rutsiro',
  ],
};

class LocationData {
  final String? province;
  final String? district;
  final String? sector;
  final String? cell;
  final String? village;
  final double? latitude;
  final double? longitude;

  const LocationData({
    this.province,
    this.district,
    this.sector,
    this.cell,
    this.village,
    this.latitude,
    this.longitude,
  });

  Map<String, dynamic> toJson() => {
    if (district != null) 'district': district,
    if (sector != null) 'sector': sector,
    if (cell != null) 'cell': cell,
    if (village != null) 'village': village,
    if (latitude != null) 'latitude': latitude,
    if (longitude != null) 'longitude': longitude,
  };
}
