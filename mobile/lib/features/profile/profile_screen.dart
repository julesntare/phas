import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/api_client.dart';
import '../../models/rwanda_locations.dart';
import '../../models/user.dart';
import '../auth/auth_provider.dart';

// All 30 districts as a flat sorted list for the dropdown.
final _allDistricts = rwandaProvinceDistricts.values
    .expand((d) => d)
    .toList()
  ..sort();

final profileProvider = FutureProvider.autoDispose<User>((ref) async {
  final data = await ref.read(apiClientProvider).get('/api/profile');
  return User.fromJson(data);
});

class ProfileScreen extends ConsumerStatefulWidget {
  const ProfileScreen({super.key});

  @override
  ConsumerState<ProfileScreen> createState() => _ProfileScreenState();
}

class _ProfileScreenState extends ConsumerState<ProfileScreen> {
  String? _selectedDistrict;
  bool _saving = false;
  bool _dirty = false;

  Future<void> _save() async {
    setState(() => _saving = true);
    try {
      await ref.read(apiClientProvider).patch(
        '/api/profile',
        {'district': _selectedDistrict},
      );
      ref.invalidate(profileProvider);
      setState(() => _dirty = false);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Profile updated')),
        );
      }
    } on ApiException catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error: ${e.message}')),
        );
      }
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  Future<void> _confirmSignOut() async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Sign out?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: const Text('Cancel'),
          ),
          FilledButton(
            onPressed: () => Navigator.pop(ctx, true),
            child: const Text('Sign out'),
          ),
        ],
      ),
    );
    if (confirmed == true && mounted) {
      await ref.read(authProvider.notifier).signOut();
    }
  }

  @override
  Widget build(BuildContext context) {
    final profileAsync = ref.watch(profileProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Profile'),
        actions: [
          if (_dirty)
            TextButton(
              onPressed: _saving ? null : _save,
              child: _saving
                  ? const SizedBox(
                      height: 16,
                      width: 16,
                      child: CircularProgressIndicator(strokeWidth: 2))
                  : const Text('Save'),
            ),
        ],
      ),
      body: profileAsync.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (e, _) => Center(child: Text('$e')),
        data: (user) {
          // Initialise dropdown on first data load.
          _selectedDistrict ??= user.district;

          return ListView(
            padding: const EdgeInsets.all(24),
            children: [
              // Phone (read-only)
              _InfoRow(label: 'Phone', value: user.phone),
              const SizedBox(height: 24),

              // District
              const Text('Your district',
                  style: TextStyle(fontWeight: FontWeight.w600)),
              const SizedBox(height: 8),
              InputDecorator(
                decoration: const InputDecoration(
                  border: OutlineInputBorder(),
                  isDense: true,
                  contentPadding:
                      EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                ),
                child: DropdownButton<String>(
                  value: _selectedDistrict,
                  isExpanded: true,
                  underline: const SizedBox.shrink(),
                  hint: const Text('Select district'),
                  items: [
                    const DropdownMenuItem(
                        value: null, child: Text('— Not set —')),
                    ..._allDistricts.map(
                      (d) => DropdownMenuItem(value: d, child: Text(d)),
                    ),
                  ],
                  onChanged: (val) => setState(() {
                    _selectedDistrict = val;
                    _dirty = val != user.district;
                  }),
                ),
              ),
              const SizedBox(height: 8),
              const Text(
                'Used to show relevant reports in your area.',
                style: TextStyle(fontSize: 12, color: Colors.black45),
              ),

              const SizedBox(height: 40),
              const Divider(),
              const SizedBox(height: 8),

              OutlinedButton.icon(
                onPressed: _confirmSignOut,
                icon: const Icon(Icons.logout, color: Colors.red),
                label: const Text('Sign out',
                    style: TextStyle(color: Colors.red)),
                style: OutlinedButton.styleFrom(
                  side: const BorderSide(color: Colors.red),
                ),
              ),
            ],
          );
        },
      ),
    );
  }
}

class _InfoRow extends StatelessWidget {
  final String label;
  final String value;
  const _InfoRow({required this.label, required this.value});

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(label,
            style: const TextStyle(fontWeight: FontWeight.w600)),
        const SizedBox(height: 4),
        Container(
          width: double.infinity,
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 14),
          decoration: BoxDecoration(
            color: Colors.grey.shade100,
            borderRadius: BorderRadius.circular(8),
            border: Border.all(color: Colors.grey.shade300),
          ),
          child: Text(value, style: const TextStyle(color: Colors.black54)),
        ),
      ],
    );
  }
}
