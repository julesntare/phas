import 'package:flutter/material.dart';
import 'package:geolocator/geolocator.dart';
import '../../../models/rwanda_locations.dart';

class LocationPickerWidget extends StatefulWidget {
  final ValueChanged<LocationData> onChanged;

  const LocationPickerWidget({super.key, required this.onChanged});

  @override
  State<LocationPickerWidget> createState() => _LocationPickerWidgetState();
}

class _LocationPickerWidgetState extends State<LocationPickerWidget> {
  String? _province;
  String? _district;
  final _sectorCtrl = TextEditingController();
  final _cellCtrl = TextEditingController();
  final _villageCtrl = TextEditingController();
  bool _gpsActive = false;
  bool _gpsLoading = false;
  double? _lat;
  double? _lng;

  @override
  void dispose() {
    _sectorCtrl.dispose();
    _cellCtrl.dispose();
    _villageCtrl.dispose();
    super.dispose();
  }

  void _notify() {
    widget.onChanged(LocationData(
      province: _province,
      district: _district,
      sector: _sectorCtrl.text.trim().isEmpty ? null : _sectorCtrl.text.trim(),
      cell: _cellCtrl.text.trim().isEmpty ? null : _cellCtrl.text.trim(),
      village: _villageCtrl.text.trim().isEmpty ? null : _villageCtrl.text.trim(),
      latitude: _lat,
      longitude: _lng,
    ));
  }

  Future<void> _useGps() async {
    setState(() => _gpsLoading = true);
    try {
      var permission = await Geolocator.checkPermission();
      if (permission == LocationPermission.denied) {
        permission = await Geolocator.requestPermission();
      }
      if (permission == LocationPermission.deniedForever ||
          permission == LocationPermission.denied) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Location permission denied')),
          );
        }
        return;
      }

      final pos = await Geolocator.getCurrentPosition(
        locationSettings: const LocationSettings(
          accuracy: LocationAccuracy.medium,
          timeLimit: Duration(seconds: 10),
        ),
      );
      setState(() {
        _lat = pos.latitude;
        _lng = pos.longitude;
        _gpsActive = true;
      });
      _notify();
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Could not get location: $e')),
        );
      }
    } finally {
      if (mounted) setState(() => _gpsLoading = false);
    }
  }

  void _clearGps() {
    setState(() { _gpsActive = false; _lat = null; _lng = null; });
    _notify();
  }

  List<String> get _districts =>
      _province != null ? (rwandaProvinceDistricts[_province] ?? []) : [];

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        const Text('Location (optional)',
            style: TextStyle(fontWeight: FontWeight.w600)),
        const SizedBox(height: 8),

        // Province
        DropdownButtonFormField<String>(
          initialValue: _province,
          decoration: const InputDecoration(
            labelText: 'Province',
            border: OutlineInputBorder(),
            isDense: true,
          ),
          items: rwandaProvinceDistricts.keys
              .map((p) => DropdownMenuItem(value: p, child: Text(p)))
              .toList(),
          onChanged: (val) {
            setState(() { _province = val; _district = null; });
            _notify();
          },
        ),
        const SizedBox(height: 8),

        // District (enabled only after province selected)
        DropdownButtonFormField<String>(
          initialValue: _district,
          decoration: InputDecoration(
            labelText: 'District',
            border: const OutlineInputBorder(),
            isDense: true,
            enabled: _province != null,
          ),
          items: _districts
              .map((d) => DropdownMenuItem(value: d, child: Text(d)))
              .toList(),
          onChanged: _province == null
              ? null
              : (val) {
                  setState(() => _district = val);
                  _notify();
                },
        ),
        const SizedBox(height: 8),

        // Sector / Cell / Village (collapsible row)
        Row(
          children: [
            Expanded(
              child: TextField(
                controller: _sectorCtrl,
                decoration: const InputDecoration(
                  labelText: 'Sector',
                  border: OutlineInputBorder(),
                  isDense: true,
                ),
                onChanged: (_) => _notify(),
              ),
            ),
            const SizedBox(width: 8),
            Expanded(
              child: TextField(
                controller: _cellCtrl,
                decoration: const InputDecoration(
                  labelText: 'Cell',
                  border: OutlineInputBorder(),
                  isDense: true,
                ),
                onChanged: (_) => _notify(),
              ),
            ),
          ],
        ),
        const SizedBox(height: 8),
        TextField(
          controller: _villageCtrl,
          decoration: const InputDecoration(
            labelText: 'Village',
            border: OutlineInputBorder(),
            isDense: true,
          ),
          onChanged: (_) => _notify(),
        ),
        const SizedBox(height: 10),

        // GPS button
        if (_gpsActive)
          Row(
            children: [
              const Icon(Icons.gps_fixed, size: 16, color: Colors.green),
              const SizedBox(width: 6),
              Expanded(
                child: Text(
                  'GPS: ${_lat!.toStringAsFixed(4)}, ${_lng!.toStringAsFixed(4)}',
                  style: const TextStyle(fontSize: 12, color: Colors.green),
                ),
              ),
              GestureDetector(
                onTap: _clearGps,
                child: const Icon(Icons.close, size: 16, color: Colors.black45),
              ),
            ],
          )
        else
          OutlinedButton.icon(
            onPressed: _gpsLoading ? null : _useGps,
            icon: _gpsLoading
                ? const SizedBox(
                    height: 14,
                    width: 14,
                    child: CircularProgressIndicator(strokeWidth: 2))
                : const Icon(Icons.my_location, size: 16),
            label: const Text('Use my location (optional)',
                style: TextStyle(fontSize: 13)),
            style: OutlinedButton.styleFrom(
              padding: const EdgeInsets.symmetric(vertical: 8),
              tapTargetSize: MaterialTapTargetSize.shrinkWrap,
            ),
          ),
      ],
    );
  }
}
