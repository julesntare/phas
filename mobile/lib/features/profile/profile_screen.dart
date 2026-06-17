import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/api_client.dart';
import '../../core/theme.dart';
import '../../models/rwanda_locations.dart';
import '../../models/user.dart';
import '../../widgets/loaders.dart';
import '../auth/auth_provider.dart';

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
  String? _name;
  bool _saving = false;
  bool _dirty = false;

  Future<void> _save() async {
    setState(() => _saving = true);
    try {
      await ref.read(apiClientProvider).patch(
        '/api/profile',
        {'district': _selectedDistrict, 'name': _name},
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

  Future<void> _editName(String current) async {
    final controller = TextEditingController(text: current);
    final result = await showDialog<String>(
      context: context,
      builder: (ctx) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: const Text('Your name',
            style: TextStyle(fontWeight: FontWeight.w700)),
        content: TextField(
          controller: controller,
          autofocus: true,
          maxLength: 80,
          decoration: const InputDecoration(
            hintText: 'Enter your name',
            border: OutlineInputBorder(),
            counterText: '',
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text('Cancel'),
          ),
          FilledButton(
            onPressed: () => Navigator.pop(ctx, controller.text.trim()),
            child: const Text('Save'),
          ),
        ],
      ),
    );
    if (result != null && result != current && mounted) {
      setState(() {
        _name = result.isEmpty ? null : result;
        _dirty = true;
      });
    }
  }

  Future<void> _confirmSignOut() async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: const Text('Sign out?',
            style: TextStyle(fontWeight: FontWeight.w700)),
        content: const Text('You will be returned to the sign-in screen.'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: const Text('Cancel'),
          ),
          FilledButton(
            onPressed: () => Navigator.pop(ctx, true),
            style: FilledButton.styleFrom(backgroundColor: Colors.red),
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
    final cs = Theme.of(context).colorScheme;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Profile'),
        actions: [
          if (_dirty)
            Padding(
              padding: const EdgeInsets.only(right: 8),
              child: _saving
                  ? const Center(child: DotsLoader(dotSize: 5))
                  : FilledButton(
                      onPressed: _save,
                      style: FilledButton.styleFrom(
                        visualDensity: VisualDensity.compact,
                        padding: const EdgeInsets.symmetric(horizontal: 16),
                      ),
                      child: const Text('Save'),
                    ),
            ),
        ],
      ),
      body: profileAsync.when(
        loading: () => const Center(child: DotsLoader()),
        error: (e, _) => Center(
          child: Padding(
            padding: const EdgeInsets.all(32),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Icon(Icons.cloud_off_outlined,
                    size: 48, color: cs.outlineVariant),
                const SizedBox(height: 12),
                Text('$e',
                    style: TextStyle(
                        color: cs.onSurfaceVariant, fontSize: 13),
                    textAlign: TextAlign.center),
              ],
            ),
          ),
        ),
        data: (user) {
          _selectedDistrict ??= user.district;
          _name ??= user.name;
          final displayName = _name ?? user.name ?? 'Citizen';

          return ListView(
            children: [
              // ── Avatar header ──────────────────────────────────────────
              Container(
                color: cs.surface,
                padding: const EdgeInsets.fromLTRB(24, 28, 24, 28),
                child: Row(
                  children: [
                    ClipRRect(
                      borderRadius: BorderRadius.circular(20),
                      child: user.avatarUrl != null
                          ? Image.network(
                              user.avatarUrl!,
                              width: 64,
                              height: 64,
                              fit: BoxFit.cover,
                              errorBuilder: (context, error, stack) =>
                                  _InitialAvatar(initial: displayName[0]),
                            )
                          : _InitialAvatar(initial: displayName[0]),
                    ),
                    const SizedBox(width: 16),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            children: [
                              Expanded(
                                child: Text(
                                  displayName,
                                  style: TextStyle(
                                    fontSize: 18,
                                    fontWeight: FontWeight.w700,
                                    color: cs.onSurface,
                                  ),
                                ),
                              ),
                              GestureDetector(
                                onTap: () => _editName(displayName),
                                child: Icon(Icons.edit_outlined,
                                    size: 16, color: cs.onSurfaceVariant),
                              ),
                            ],
                          ),
                          const SizedBox(height: 3),
                          if (user.phone != null)
                            Text(user.phone!,
                                style: TextStyle(
                                    fontSize: 14,
                                    color: cs.onSurfaceVariant))
                          else if (user.email != null)
                            Text(user.email!,
                                style: TextStyle(
                                    fontSize: 14,
                                    color: cs.onSurfaceVariant)),
                          const SizedBox(height: 5),
                          Container(
                            padding: const EdgeInsets.symmetric(
                                horizontal: 7, vertical: 2),
                            decoration: BoxDecoration(
                              color: user.authType == 'google'
                                  ? const Color(0xFFEFF6FF)
                                  : const Color(0xFFF0FDF4),
                              borderRadius: BorderRadius.circular(20),
                            ),
                            child: Row(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                Icon(
                                  user.authType == 'google'
                                      ? Icons.email_outlined
                                      : Icons.phone_outlined,
                                  size: 10,
                                  color: user.authType == 'google'
                                      ? const Color(0xFF3B82F6)
                                      : const Color(0xFF16A34A),
                                ),
                                const SizedBox(width: 3),
                                Text(
                                  user.authType == 'google'
                                      ? 'Google account'
                                      : 'Phone account',
                                  style: TextStyle(
                                    fontSize: 10,
                                    fontWeight: FontWeight.w600,
                                    color: user.authType == 'google'
                                        ? const Color(0xFF3B82F6)
                                        : const Color(0xFF16A34A),
                                  ),
                                ),
                              ],
                            ),
                          ),
                          if (_selectedDistrict != null ||
                              user.district != null) ...[
                            const SizedBox(height: 2),
                            Row(
                              children: [
                                Icon(Icons.location_on_outlined,
                                    size: 12, color: cs.onSurfaceVariant),
                                const SizedBox(width: 3),
                                Text(_selectedDistrict ?? user.district!,
                                    style: TextStyle(
                                        fontSize: 12,
                                        color: cs.onSurfaceVariant)),
                              ],
                            ),
                          ],
                        ],
                      ),
                    ),
                  ],
                ),
              ),
              const Divider(),

              // ── Section: Account ───────────────────────────────────────
              const _SectionHeader(title: 'Account'),
              _SettingsTile(
                icon: Icons.person_outline,
                label: 'Display name',
                value: displayName,
                onTap: () => _editName(displayName),
              ),
              if (user.phone != null)
                _SettingsTile(
                  icon: Icons.phone_outlined,
                  label: 'Phone number',
                  value: user.phone!,
                ),
              if (user.email != null)
                _SettingsTile(
                  icon: Icons.email_outlined,
                  label: 'Email',
                  value: user.email!,
                ),
              const _ThemeToggleTile(),

              if (user.authType != 'google') ...[
                const Divider(),

                // ── Section: Location ────────────────────────────────────
                const _SectionHeader(title: 'Location'),
                Padding(
                  padding: const EdgeInsets.fromLTRB(16, 4, 16, 12),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Your district',
                        style: TextStyle(
                            fontSize: 13,
                            fontWeight: FontWeight.w600,
                            color: cs.onSurface),
                      ),
                      const SizedBox(height: 8),
                      Container(
                        decoration: BoxDecoration(
                          color: cs.surface,
                          borderRadius: BorderRadius.circular(10),
                          border:
                              Border.all(color: cs.outlineVariant),
                        ),
                        padding: const EdgeInsets.symmetric(
                            horizontal: 12, vertical: 4),
                        child: DropdownButton<String>(
                          value: _selectedDistrict,
                          isExpanded: true,
                          underline: const SizedBox.shrink(),
                          dropdownColor: cs.surface,
                          hint: Text('Select your district',
                              style: TextStyle(
                                  color: cs.onSurfaceVariant)),
                          items: [
                            DropdownMenuItem(
                                value: null,
                                child: Text('— Not set —',
                                    style: TextStyle(
                                        color: cs.onSurfaceVariant))),
                            ..._allDistricts.map(
                              (d) => DropdownMenuItem(
                                  value: d, child: Text(d)),
                            ),
                          ],
                          onChanged: (val) => setState(() {
                            _selectedDistrict = val;
                            _dirty = val != user.district;
                          }),
                        ),
                      ),
                      const SizedBox(height: 6),
                      Text(
                        'Used to show relevant incident reports in your area.',
                        style: TextStyle(
                            fontSize: 12, color: cs.onSurfaceVariant),
                      ),
                    ],
                  ),
                ),
              ], // end location section (phone only)

              const Divider(),
              const SizedBox(height: 8),

              // ── Sign out ───────────────────────────────────────────────
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 16),
                child: OutlinedButton.icon(
                  onPressed: _confirmSignOut,
                  icon: const Icon(Icons.logout_rounded,
                      size: 18, color: Colors.red),
                  label: const Text('Sign out',
                      style: TextStyle(
                          color: Colors.red, fontWeight: FontWeight.w600)),
                  style: OutlinedButton.styleFrom(
                    padding: const EdgeInsets.symmetric(vertical: 14),
                    side: const BorderSide(color: Color(0xFFFECACA)),
                    backgroundColor: const Color(0xFFFFF5F5),
                    shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(12)),
                  ),
                ),
              ),
              const SizedBox(height: 32),
            ],
          );
        },
      ),
    );
  }
}

// ── Reusable sub-widgets ──────────────────────────────────────────────────────

class _SectionHeader extends StatelessWidget {
  final String title;
  const _SectionHeader({required this.title});

  @override
  Widget build(BuildContext context) => Padding(
        padding: const EdgeInsets.fromLTRB(16, 16, 16, 4),
        child: Text(
          title.toUpperCase(),
          style: TextStyle(
            fontSize: 11,
            fontWeight: FontWeight.w700,
            color: Theme.of(context).colorScheme.onSurfaceVariant,
            letterSpacing: 0.8,
          ),
        ),
      );
}

class _InitialAvatar extends StatelessWidget {
  final String initial;
  const _InitialAvatar({required this.initial});

  @override
  Widget build(BuildContext context) {
    return Container(
      width: 64,
      height: 64,
      decoration: BoxDecoration(
        color: const Color(0xFF0055A4).withAlpha(15),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: const Color(0xFF0055A4).withAlpha(40)),
      ),
      child: Center(
        child: Text(
          initial.toUpperCase(),
          style: const TextStyle(
            fontSize: 26,
            fontWeight: FontWeight.w700,
            color: Color(0xFF0055A4),
          ),
        ),
      ),
    );
  }
}

class _SettingsTile extends StatelessWidget {
  final IconData icon;
  final String label;
  final String value;
  final VoidCallback? onTap;

  const _SettingsTile({
    required this.icon,
    required this.label,
    required this.value,
    this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    return InkWell(
      onTap: onTap,
      child: Container(
        color: cs.surface,
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
        child: Row(
          children: [
            Container(
              width: 36,
              height: 36,
              decoration: BoxDecoration(
                color: cs.surfaceContainerHighest,
                borderRadius: BorderRadius.circular(9),
              ),
              child: Icon(icon, size: 18, color: cs.onSurfaceVariant),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(label,
                      style:
                          TextStyle(fontSize: 12, color: cs.onSurfaceVariant)),
                  const SizedBox(height: 1),
                  Text(value,
                      style: TextStyle(
                          fontSize: 15,
                          fontWeight: FontWeight.w500,
                          color: cs.onSurface)),
                ],
              ),
            ),
            if (onTap != null)
              Icon(Icons.chevron_right, size: 18, color: cs.outlineVariant),
          ],
        ),
      ),
    );
  }
}

class _ThemeToggleTile extends ConsumerWidget {
  const _ThemeToggleTile();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final mode = ref.watch(themeProvider);
    final isDark = mode == ThemeMode.dark ||
        (mode == ThemeMode.system &&
            MediaQuery.platformBrightnessOf(context) == Brightness.dark);
    final cs = Theme.of(context).colorScheme;

    return InkWell(
      onTap: () => ref.read(themeProvider.notifier).toggle(),
      child: Container(
        color: cs.surface,
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
        child: Row(
          children: [
            Container(
              width: 36,
              height: 36,
              decoration: BoxDecoration(
                color: cs.surfaceContainerHighest,
                borderRadius: BorderRadius.circular(9),
              ),
              child: Icon(
                isDark ? Icons.dark_mode_outlined : Icons.light_mode_outlined,
                size: 18,
                color: cs.onSurfaceVariant,
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text('Theme',
                      style:
                          TextStyle(fontSize: 12, color: cs.onSurfaceVariant)),
                  const SizedBox(height: 1),
                  Text(
                    isDark ? 'Dark mode' : 'Light mode',
                    style: TextStyle(
                        fontSize: 15,
                        fontWeight: FontWeight.w500,
                        color: cs.onSurface),
                  ),
                ],
              ),
            ),
            Switch(
              value: isDark,
              onChanged: (_) =>
                  ref.read(themeProvider.notifier).toggle(),
            ),
          ],
        ),
      ),
    );
  }
}
