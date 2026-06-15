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
      body: SingleChildScrollView(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // ── Status header ──────────────────────────────────────────
            _StatusHeader(platform: p),

            // ── Active incident banner ─────────────────────────────────
            if (p.incidentId != null)
              Padding(
                padding: const EdgeInsets.fromLTRB(16, 8, 16, 0),
                child: InkWell(
                  onTap: () => context.push(
                    '/incidents/${p.incidentId}',
                    extra: {
                      'incidentId': p.incidentId!,
                      'platformName': p.name,
                    },
                  ),
                  borderRadius: BorderRadius.circular(12),
                  child: Container(
                    padding: const EdgeInsets.all(14),
                    decoration: BoxDecoration(
                      color: const Color(0xFFFFF7ED),
                      borderRadius: BorderRadius.circular(12),
                      border: const Border.fromBorderSide(
                          BorderSide(color: Color(0xFFFED7AA))),
                    ),
                    child: const Row(
                      children: [
                        Icon(Icons.forum_outlined,
                            size: 18, color: Color(0xFFF97316)),
                        SizedBox(width: 10),
                        Expanded(
                          child: Text(
                            'Active incident — tap to view thread',
                            style: TextStyle(
                              fontSize: 13,
                              color: Color(0xFF92400E),
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                        ),
                        Icon(Icons.chevron_right,
                            size: 18, color: Color(0xFFF97316)),
                      ],
                    ),
                  ),
                ),
              ),

            // ── Report section ─────────────────────────────────────────
            Container(
              color: Colors.white,
              margin: const EdgeInsets.only(top: 8),
              padding: const EdgeInsets.fromLTRB(16, 16, 16, 16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    'How is it working for you right now?',
                    style: TextStyle(
                      fontSize: 14,
                      fontWeight: FontWeight.w600,
                      color: Color(0xFF374151),
                    ),
                  ),
                  const SizedBox(height: 12),
                  Row(
                    children: [
                      Expanded(
                        child: _ReportButton(
                          label: 'Having issues',
                          icon: Icons.error_outline_rounded,
                          color: const Color(0xFFEF4444),
                          onTap: _submitting ? null : _openAffectedSheet,
                        ),
                      ),
                      const SizedBox(width: 10),
                      Expanded(
                        child: _ReportButton(
                          label: "I'm fine",
                          icon: Icons.check_circle_outline_rounded,
                          color: const Color(0xFF16A34A),
                          onTap: _submitting ? null : _reportOk,
                        ),
                      ),
                    ],
                  ),
                  if (_message != null) ...[
                    const SizedBox(height: 10),
                    Text(_message!,
                        textAlign: TextAlign.center,
                        style: const TextStyle(
                            color: Color(0xFF6B7280), fontSize: 13)),
                  ],
                ],
              ),
            ),

            // ── Incident history ───────────────────────────────────────
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 24, 16, 24),
              child: _IncidentHistorySection(platformId: p.id),
            ),

            // ── Debug tools ────────────────────────────────────────────
            if (kDebugMode)
              Container(
                margin: const EdgeInsets.fromLTRB(16, 0, 16, 24),
                padding: const EdgeInsets.symmetric(
                    horizontal: 12, vertical: 6),
                decoration: BoxDecoration(
                  color: const Color(0xFFF9FAFB),
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(color: const Color(0xFFE5E7EB)),
                ),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    const Text('DEV  ',
                        style: TextStyle(
                            fontSize: 9,
                            fontWeight: FontWeight.w700,
                            color: Color(0xFFD1D5DB),
                            letterSpacing: 1)),
                    TextButton(
                      onPressed: _submitting ? null : _seedIncident,
                      style: TextButton.styleFrom(
                        foregroundColor: const Color(0xFF9CA3AF),
                        padding: const EdgeInsets.symmetric(
                            horizontal: 8),
                        minimumSize: Size.zero,
                        tapTargetSize:
                            MaterialTapTargetSize.shrinkWrap,
                        textStyle: const TextStyle(fontSize: 11),
                      ),
                      child: const Text('Seed incident'),
                    ),
                    const Text('·',
                        style: TextStyle(
                            color: Color(0xFFD1D5DB), fontSize: 14)),
                    TextButton(
                      onPressed:
                          _submitting ? null : _testNotification,
                      style: TextButton.styleFrom(
                        foregroundColor: const Color(0xFF9CA3AF),
                        padding: const EdgeInsets.symmetric(
                            horizontal: 8),
                        minimumSize: Size.zero,
                        tapTargetSize:
                            MaterialTapTargetSize.shrinkWrap,
                        textStyle: const TextStyle(fontSize: 11),
                      ),
                      child: const Text('Test notif'),
                    ),
                  ],
                ),
              ),
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

class _StatusHeader extends StatelessWidget {
  final Platform platform;
  const _StatusHeader({required this.platform});

  @override
  Widget build(BuildContext context) {
    final hasIssue = platform.hasIssue;
    final statusColor =
        hasIssue ? const Color(0xFFEF4444) : const Color(0xFF16A34A);

    return Container(
      color: Colors.white,
      padding: const EdgeInsets.fromLTRB(20, 22, 20, 22),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.center,
        children: [
          // ── Operator logo / uptime ring / status circle ───────────────
          if (platform.operatorAvatarUrl != null)
            _OperatorLogo(
              url: platform.operatorAvatarUrl!,
              uptime: platform.uptime7d,
              color: statusColor,
            )
          else if (platform.uptime7d != null)
            _UptimeRing(uptime: platform.uptime7d!)
          else
            _StatusCircle(hasIssue: hasIssue, color: statusColor),
          const SizedBox(width: 20),

          // ── Info ──────────────────────────────────────────────────────
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // State pill
                Container(
                  padding: const EdgeInsets.symmetric(
                      horizontal: 10, vertical: 4),
                  decoration: BoxDecoration(
                    color: statusColor.withAlpha(15),
                    borderRadius: BorderRadius.circular(20),
                    border:
                        Border.all(color: statusColor.withAlpha(60)),
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Container(
                        width: 6,
                        height: 6,
                        decoration: BoxDecoration(
                            color: statusColor,
                            shape: BoxShape.circle),
                      ),
                      const SizedBox(width: 6),
                      Text(
                        platform.statusLabel,
                        style: TextStyle(
                          color: statusColor,
                          fontWeight: FontWeight.w700,
                          fontSize: 12,
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 8),
                Text(
                  platform.authorityName,
                  style: const TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.w700,
                    color: Color(0xFF111827),
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  platform.category,
                  style: const TextStyle(
                      fontSize: 12, color: Color(0xFF9CA3AF)),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _OperatorLogo extends StatelessWidget {
  final String url;
  final double? uptime;
  final Color color;
  const _OperatorLogo({required this.url, required this.uptime, required this.color});

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: 76,
      height: 76,
      child: Stack(
        alignment: Alignment.center,
        children: [
          if (uptime != null)
            SizedBox(
              width: 76,
              height: 76,
              child: CircularProgressIndicator(
                value: uptime! / 100,
                strokeWidth: 5,
                backgroundColor: color.withAlpha(20),
                color: color,
                strokeCap: StrokeCap.round,
              ),
            ),
          Container(
            width: uptime != null ? 58 : 76,
            height: uptime != null ? 58 : 76,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              border: Border.all(color: color.withAlpha(50), width: 1.5),
            ),
            clipBehavior: Clip.antiAlias,
            child: Image.network(
              url,
              fit: BoxFit.cover,
              errorBuilder: (_, _, _) => Icon(Icons.business_outlined,
                  size: 28, color: color),
            ),
          ),
        ],
      ),
    );
  }
}

class _UptimeRing extends StatelessWidget {
  final double uptime;
  const _UptimeRing({required this.uptime});

  @override
  Widget build(BuildContext context) {
    final color = uptime >= 99
        ? const Color(0xFF16A34A)
        : uptime >= 95
            ? const Color(0xFFF97316)
            : const Color(0xFFEF4444);
    return SizedBox(
      width: 76,
      height: 76,
      child: Stack(
        alignment: Alignment.center,
        children: [
          SizedBox(
            width: 76,
            height: 76,
            child: CircularProgressIndicator(
              value: uptime / 100,
              strokeWidth: 6,
              backgroundColor: color.withAlpha(20),
              color: color,
              strokeCap: StrokeCap.round,
            ),
          ),
          Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Text(
                '${uptime.toStringAsFixed(0)}%',
                style: TextStyle(
                  fontSize: 15,
                  fontWeight: FontWeight.w800,
                  color: color,
                ),
              ),
              Text(
                'uptime',
                style: TextStyle(
                    fontSize: 9, color: color.withAlpha(160)),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class _StatusCircle extends StatelessWidget {
  final bool hasIssue;
  final Color color;
  const _StatusCircle(
      {required this.hasIssue, required this.color});

  @override
  Widget build(BuildContext context) {
    return Container(
      width: 76,
      height: 76,
      decoration: BoxDecoration(
        color: color.withAlpha(15),
        shape: BoxShape.circle,
        border: Border.all(color: color.withAlpha(60), width: 2),
      ),
      child: Icon(
        hasIssue
            ? Icons.warning_amber_rounded
            : Icons.check_circle_rounded,
        color: color,
        size: 32,
      ),
    );
  }
}

class _ReportButton extends StatelessWidget {
  final String label;
  final IconData icon;
  final Color color;
  final VoidCallback? onTap;

  const _ReportButton({
    required this.label,
    required this.icon,
    required this.color,
    this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return Material(
      color: color.withAlpha(15),
      borderRadius: BorderRadius.circular(12),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(12),
        child: Container(
          padding: const EdgeInsets.symmetric(vertical: 14),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: color.withAlpha(60)),
          ),
          child: Column(
            children: [
              Icon(icon, color: color, size: 24),
              const SizedBox(height: 6),
              Text(
                label,
                style: TextStyle(
                  color: color,
                  fontWeight: FontWeight.w600,
                  fontSize: 13,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
