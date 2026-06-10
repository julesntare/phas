import 'dart:io';
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:image_picker/image_picker.dart';
import '../../../core/api_client.dart';
import '../../../models/incident.dart';
import '../../../models/platform.dart';
import '../../../models/rwanda_locations.dart';
import '../../auth/auth_provider.dart';
import '../../incidents/incident_provider.dart';
import '../../report/widgets/location_picker_widget.dart';

class PlatformDetailScreen extends ConsumerStatefulWidget {
  final Platform platform;
  const PlatformDetailScreen({super.key, required this.platform});

  @override
  ConsumerState<PlatformDetailScreen> createState() =>
      _PlatformDetailScreenState();
}

class _PlatformDetailScreenState
    extends ConsumerState<PlatformDetailScreen> {
  bool _submitting = false;
  String? _message;

  Future<void> _reportOk() async {
    setState(() { _submitting = true; _message = null; });
    try {
      await ref.read(apiClientProvider).post('/api/reports', {
        'platformId': widget.platform.id,
        'type': 'ok',
      });
      setState(() => _message = "Thanks — noted as working for you.");
    } on ApiException catch (e) {
      setState(() => _message = 'Error: ${e.message}');
    } finally {
      if (mounted) setState(() => _submitting = false);
    }
  }

  Future<void> _seedIncident() async {
    setState(() { _submitting = true; _message = null; });
    try {
      final result = await ref.read(apiClientProvider).post(
        '/api/dev/seed-incident',
        {'platformId': widget.platform.id},
        auth: false,
      );
      final incidentId = result['incidentId'] as String;
      if (mounted) {
        context.push('/incidents/$incidentId', extra: {
          'incidentId': incidentId,
          'platformName': widget.platform.name,
        });
      }
    } on ApiException catch (e) {
      setState(() => _message = 'Seed error: ${e.message}');
    } finally {
      if (mounted) setState(() => _submitting = false);
    }
  }

  Future<void> _testNotification() async {
    setState(() { _submitting = true; _message = null; });
    try {
      await ref.read(apiClientProvider).post(
        '/api/dev/test-notification',
        {'platformId': widget.platform.id},
      );
      if (mounted) {
        setState(() => _message = 'Notification sent — background the app and check your tray.');
      }
    } on ApiException catch (e) {
      setState(() => _message = 'Notify error: ${e.message}');
    } finally {
      if (mounted) setState(() => _submitting = false);
    }
  }

  Future<void> _openAffectedSheet() async {
    final result = await showModalBottomSheet<Map<String, dynamic>?>(
      context: context,
      isScrollControlled: true,
      useSafeArea: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(16)),
      ),
      builder: (_) => _AffectedReportSheet(platformId: widget.platform.id),
    );
    if (result?['submitted'] != true || !mounted) return;

    final incidentId = result?['incidentId'] as String?;
    if (incidentId != null) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: const Text('Report submitted. Others are affected too.'),
          action: SnackBarAction(
            label: 'View thread',
            onPressed: () => context.push(
              '/incidents/$incidentId',
              extra: {'incidentId': incidentId, 'platformName': widget.platform.name},
            ),
          ),
          duration: const Duration(seconds: 6),
        ),
      );
    } else {
      setState(() => _message = 'Report submitted — thank you.');
    }
  }

  @override
  Widget build(BuildContext context) {
    final p = widget.platform;
    return Scaffold(
      appBar: AppBar(title: Text(p.name)),
      body: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Text(p.authorityName,
                style: const TextStyle(color: Colors.black54)),
            const SizedBox(height: 8),
            _StatusCard(platform: p),
            if (p.incidentId != null) ...[
              const SizedBox(height: 12),
              OutlinedButton.icon(
                onPressed: () => context.push(
                  '/incidents/${p.incidentId}',
                  extra: {
                    'incidentId': p.incidentId!,
                    'platformName': p.name,
                  },
                ),
                icon: const Icon(Icons.forum_outlined),
                label: const Text('View incident thread'),
              ),
            ],
            const SizedBox(height: 32),
            const Text(
              'How is it working for you right now?',
              style: TextStyle(fontSize: 16, fontWeight: FontWeight.w600),
            ),
            const SizedBox(height: 16),
            Row(
              children: [
                Expanded(
                  child: OutlinedButton.icon(
                    onPressed: _submitting ? null : _openAffectedSheet,
                    icon: const Icon(Icons.error_outline, color: Colors.red),
                    label: const Text('Having issues',
                        style: TextStyle(color: Colors.red)),
                    style: OutlinedButton.styleFrom(
                        side: const BorderSide(color: Colors.red)),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: OutlinedButton.icon(
                    onPressed: _submitting ? null : _reportOk,
                    icon: const Icon(Icons.check_circle_outline,
                        color: Colors.green),
                    label: const Text("I'm fine",
                        style: TextStyle(color: Colors.green)),
                    style: OutlinedButton.styleFrom(
                        side: const BorderSide(color: Colors.green)),
                  ),
                ),
              ],
            ),
            if (kDebugMode) ...[
              const SizedBox(height: 24),
              const Divider(),
              Row(
                children: [
                  Expanded(
                    child: TextButton.icon(
                      onPressed: _submitting ? null : _seedIncident,
                      icon: const Icon(Icons.science_outlined, size: 16),
                      label: const Text('Seed incident',
                          style: TextStyle(fontSize: 12)),
                      style: TextButton.styleFrom(foregroundColor: Colors.grey),
                    ),
                  ),
                  Expanded(
                    child: TextButton.icon(
                      onPressed: _submitting ? null : _testNotification,
                      icon: const Icon(Icons.notifications_outlined, size: 16),
                      label: const Text('Test notification',
                          style: TextStyle(fontSize: 12)),
                      style: TextButton.styleFrom(foregroundColor: Colors.grey),
                    ),
                  ),
                ],
              ),
            ],
            if (_message != null) ...[
              const SizedBox(height: 12),
              Text(_message!, textAlign: TextAlign.center),
            ],
            const SizedBox(height: 24),
            _IncidentHistorySection(platformId: p.id),
          ],
        ),
      ),
    );
  }
}

// ── Bottom sheet for "Having issues" ─────────────────────────────────────────

class _AffectedReportSheet extends ConsumerStatefulWidget {
  final String platformId;
  const _AffectedReportSheet({required this.platformId});

  @override
  ConsumerState<_AffectedReportSheet> createState() =>
      _AffectedReportSheetState();
}

class _AffectedReportSheetState
    extends ConsumerState<_AffectedReportSheet> {
  final _textCtrl = TextEditingController();
  XFile? _imageFile;
  LocationData _location = const LocationData();
  bool _submitting = false;
  String? _error;

  @override
  void dispose() {
    _textCtrl.dispose();
    super.dispose();
  }

  Future<void> _pickImage(ImageSource source) async {
    final image = await ImagePicker().pickImage(
      source: source,
      maxWidth: 1920,
      maxHeight: 1920,
      imageQuality: 80,
    );
    if (image != null) setState(() => _imageFile = image);
  }

  void _showImageSourceSheet() {
    showModalBottomSheet<void>(
      context: context,
      builder: (_) => SafeArea(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            ListTile(
              leading: const Icon(Icons.camera_alt),
              title: const Text('Camera'),
              onTap: () {
                Navigator.pop(context);
                _pickImage(ImageSource.camera);
              },
            ),
            ListTile(
              leading: const Icon(Icons.photo_library),
              title: const Text('Gallery'),
              onTap: () {
                Navigator.pop(context);
                _pickImage(ImageSource.gallery);
              },
            ),
          ],
        ),
      ),
    );
  }

  Future<void> _submit() async {
    setState(() { _submitting = true; _error = null; });
    try {
      final api = ref.read(apiClientProvider);
      String? proofImageUrl;

      if (_imageFile != null) {
        final bytes = await _imageFile!.readAsBytes();
        proofImageUrl = await api.uploadFile(
          '/api/uploads',
          bytes,
          _imageFile!.name,
        );
      }

      final result = await api.post('/api/reports', {
        'platformId': widget.platformId,
        'type': 'affected',
        if (_textCtrl.text.trim().isNotEmpty) 'freeText': _textCtrl.text.trim(),
        'proofImageUrl': ?proofImageUrl,
        ..._location.toJson(),
      });

      final incidentId = result['incidentId'] as String?;
      if (mounted) Navigator.of(context).pop({'submitted': true, 'incidentId': incidentId});
    } on ApiException catch (e) {
      setState(() => _error = e.message);
    } finally {
      if (mounted) setState(() => _submitting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: EdgeInsets.fromLTRB(
          24, 24, 24, MediaQuery.of(context).viewInsets.bottom + 24),
      child: SingleChildScrollView(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Row(
              children: [
                const Expanded(
                  child: Text('Report an issue',
                      style:
                          TextStyle(fontSize: 18, fontWeight: FontWeight.w600)),
                ),
                IconButton(
                  icon: const Icon(Icons.close),
                  onPressed: () => Navigator.of(context).pop(),
                ),
              ],
            ),
            const SizedBox(height: 16),
            TextField(
              controller: _textCtrl,
              maxLines: 3,
              maxLength: 300,
              decoration: const InputDecoration(
                labelText: 'What\'s happening? (optional)',
                hintText: 'e.g. "Payment page not loading since this morning"',
                border: OutlineInputBorder(),
              ),
            ),
            const SizedBox(height: 12),
            // Image preview or picker button
            if (_imageFile != null)
              Stack(
                children: [
                  ClipRRect(
                    borderRadius: BorderRadius.circular(8),
                    child: Image.file(
                      File(_imageFile!.path),
                      height: 160,
                      width: double.infinity,
                      fit: BoxFit.cover,
                    ),
                  ),
                  Positioned(
                    top: 4,
                    right: 4,
                    child: GestureDetector(
                      onTap: () => setState(() => _imageFile = null),
                      child: Container(
                        decoration: const BoxDecoration(
                          color: Colors.black54,
                          shape: BoxShape.circle,
                        ),
                        child: const Icon(Icons.close,
                            color: Colors.white, size: 20),
                      ),
                    ),
                  ),
                ],
              )
            else
              OutlinedButton.icon(
                onPressed: _showImageSourceSheet,
                icon: const Icon(Icons.add_a_photo_outlined),
                label: const Text('Add proof photo (optional)'),
              ),
            const SizedBox(height: 16),
            const Divider(),
            const SizedBox(height: 8),
            LocationPickerWidget(
              onChanged: (loc) => setState(() => _location = loc),
            ),
            if (_error != null) ...[
              const SizedBox(height: 8),
              Text(_error!, style: const TextStyle(color: Colors.red)),
            ],
            const SizedBox(height: 16),
            FilledButton(
              onPressed: _submitting ? null : _submit,
              child: _submitting
                  ? const SizedBox(
                      height: 20,
                      width: 20,
                      child: CircularProgressIndicator(
                          strokeWidth: 2, color: Colors.white))
                  : const Text('Submit report'),
            ),
          ],
        ),
      ),
    );
  }
}

// ── Incident history ──────────────────────────────────────────────────────────

class _IncidentHistorySection extends ConsumerWidget {
  final String platformId;
  const _IncidentHistorySection({required this.platformId});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final history = ref.watch(platformIncidentHistoryProvider(platformId));
    return history.when(
      loading: () => const SizedBox.shrink(),
      error: (_, st) => const SizedBox.shrink(),
      data: (incidents) {
        if (incidents.isEmpty) return const SizedBox.shrink();
        return Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Divider(),
            const SizedBox(height: 4),
            Text(
              'Incident history',
              style: Theme.of(context)
                  .textTheme
                  .titleSmall
                  ?.copyWith(fontWeight: FontWeight.w600),
            ),
            const SizedBox(height: 8),
            ...incidents.map((inc) => _IncidentHistoryRow(incident: inc)),
          ],
        );
      },
    );
  }
}

class _IncidentHistoryRow extends StatelessWidget {
  final PlatformIncident incident;
  const _IncidentHistoryRow({required this.incident});

  @override
  Widget build(BuildContext context) {
    final color = switch (incident.state) {
      'resolved' => Colors.green,
      'confirmed' || 'recurred' => Colors.red,
      _ => Colors.orange,
    };
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 5),
      child: Row(
        children: [
          Container(
            width: 8,
            height: 8,
            decoration: BoxDecoration(color: color, shape: BoxShape.circle),
          ),
          const SizedBox(width: 10),
          Expanded(
            child: Text(
              incident.stateLabel,
              style: TextStyle(fontSize: 13, color: color, fontWeight: FontWeight.w500),
            ),
          ),
          if (incident.recurrenceCount > 0)
            Padding(
              padding: const EdgeInsets.only(right: 8),
              child: Text(
                '#${incident.recurrenceCount}',
                style: const TextStyle(fontSize: 11, color: Colors.black45),
              ),
            ),
          Text(
            incident.durationLabel,
            style: const TextStyle(fontSize: 12, color: Colors.black45),
          ),
        ],
      ),
    );
  }
}

class _StatusCard extends StatelessWidget {
  final Platform platform;
  const _StatusCard({required this.platform});

  @override
  Widget build(BuildContext context) {
    final hasIssue = platform.hasIssue;
    final color = hasIssue ? Colors.red : Colors.green;
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: color.withAlpha(13),
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: color.withAlpha(77)),
      ),
      child: Row(
        children: [
          Icon(
              hasIssue ? Icons.warning_amber_rounded : Icons.check_circle,
              color: color),
          const SizedBox(width: 12),
          Expanded(
            child: Text(platform.statusLabel,
                style: TextStyle(
                    color: color, fontWeight: FontWeight.w600)),
          ),
          if (platform.uptime7d != null)
            Text(
              '${platform.uptime7d!.toStringAsFixed(1)}% uptime',
              style: TextStyle(
                fontSize: 12,
                color: platform.uptime7d! >= 99
                    ? Colors.green.shade700
                    : platform.uptime7d! >= 95
                        ? Colors.orange.shade700
                        : Colors.red.shade700,
              ),
            ),
        ],
      ),
    );
  }
}
