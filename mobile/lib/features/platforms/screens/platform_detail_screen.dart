import 'dart:io';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:image_picker/image_picker.dart';
import '../../../widgets/loaders.dart';
import '../../../core/api_client.dart';
import '../../../models/incident.dart';
import '../../../models/platform.dart';
import '../../../models/rwanda_locations.dart';
import '../../auth/auth_provider.dart';
import '../../incidents/incident_provider.dart';
import '../../report/widgets/location_picker_widget.dart';
import '../platforms_provider.dart';

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

  Future<void> _openSuggestionSheet() async {
    final submitted = await showModalBottomSheet<bool>(
      context: context,
      isScrollControlled: true,
      useSafeArea: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(16)),
      ),
      builder: (_) => _SuggestionSheet(platformId: widget.platform.id),
    );
    if (submitted == true && mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Suggestion submitted — thank you!')),
      );
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
    final cs = Theme.of(context).colorScheme;
    return Scaffold(
      appBar: AppBar(title: Text(p.name)),
      body: SingleChildScrollView(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // ── Status header ──────────────────────────────────────────
            _StatusHeader(platform: p),

            // ── Maintenance banner ─────────────────────────────────────
            if (p.maintenance != null)
              Padding(
                padding: const EdgeInsets.fromLTRB(16, 8, 16, 0),
                child: Container(
                  padding: const EdgeInsets.all(14),
                  decoration: BoxDecoration(
                    color: const Color(0xFF0055A4).withAlpha(15),
                    borderRadius: BorderRadius.circular(12),
                    border: Border.fromBorderSide(
                        BorderSide(color: const Color(0xFF0055A4).withAlpha(70))),
                  ),
                  child: Row(
                    children: [
                      const Icon(Icons.build_outlined,
                          size: 16, color: Color(0xFF0055A4)),
                      const SizedBox(width: 10),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              p.maintenance!.isActive
                                  ? 'Maintenance in progress'
                                  : 'Scheduled maintenance',
                              style: const TextStyle(
                                fontSize: 13,
                                color: Color(0xFF0055A4),
                                fontWeight: FontWeight.w700,
                              ),
                            ),
                            Text(
                              p.maintenance!.title,
                              style: TextStyle(
                                  fontSize: 12,
                                  color: cs.onSurface,
                                  fontWeight: FontWeight.w500),
                            ),
                            if (p.maintenance!.description != null &&
                                p.maintenance!.description!.isNotEmpty) ...[
                              const SizedBox(height: 4),
                              Text(
                                p.maintenance!.description!,
                                style: TextStyle(
                                    fontSize: 12,
                                    color: cs.onSurfaceVariant,
                                    height: 1.45),
                              ),
                            ],
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
              ),

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
                      color: const Color(0xFFF97316).withAlpha(18),
                      borderRadius: BorderRadius.circular(12),
                      border: Border.fromBorderSide(
                          BorderSide(color: const Color(0xFFF97316).withAlpha(80))),
                    ),
                    child: Row(
                      children: [
                        const Icon(Icons.forum_outlined,
                            size: 18, color: Color(0xFFF97316)),
                        const SizedBox(width: 10),
                        Expanded(
                          child: Text(
                            'Active incident — tap to view thread',
                            style: TextStyle(
                              fontSize: 13,
                              color: cs.onSurface,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                        ),
                        const Icon(Icons.chevron_right,
                            size: 18, color: Color(0xFFF97316)),
                      ],
                    ),
                  ),
                ),
              ),

            // ── Report section ─────────────────────────────────────────
            Container(
              color: cs.surface,
              margin: const EdgeInsets.only(top: 8),
              padding: const EdgeInsets.fromLTRB(16, 16, 16, 16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'How is it working for you right now?',
                    style: TextStyle(
                      fontSize: 14,
                      fontWeight: FontWeight.w600,
                      color: cs.onSurface,
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
                        style: TextStyle(
                            color: cs.onSurfaceVariant, fontSize: 13)),
                  ],
                  const SizedBox(height: 12),
                  TextButton.icon(
                    onPressed: _openSuggestionSheet,
                    icon: const Icon(Icons.lightbulb_outline, size: 16),
                    label: const Text('Suggest an improvement'),
                    style: TextButton.styleFrom(
                      foregroundColor: cs.onSurfaceVariant,
                      textStyle: const TextStyle(fontSize: 13),
                    ),
                  ),
                ],
              ),
            ),

            // ── Citizen reports ────────────────────────────────────────
            _ReportsSection(platformId: p.id),

            // ── Community suggestions ──────────────────────────────────
            _PublicSuggestionsSection(platformId: p.id),

            // ── Incident history ───────────────────────────────────────
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 24, 16, 24),
              child: _IncidentHistorySection(platformId: p.id),
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
                  ? const DotsLoader(color: Colors.white, dotSize: 6)
                  : const Text('Submit report'),
            ),
          ],
        ),
      ),
    );
  }
}

// ── Citizen reports ───────────────────────────────────────────────────────────

class _ReportsSection extends ConsumerWidget {
  final String platformId;
  const _ReportsSection({required this.platformId});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final async = ref.watch(platformReportsProvider(platformId));
    return async.when(
      loading: () => const SizedBox.shrink(),
      error: (_, _) => const SizedBox.shrink(),
      data: (reports) {
        if (reports.isEmpty) return const SizedBox.shrink();
        final cs = Theme.of(context).colorScheme;
        final affected = reports.where((r) => r.type == 'affected').length;
        final ok = reports.where((r) => r.type == 'ok').length;
        return Padding(
          padding: const EdgeInsets.fromLTRB(16, 8, 16, 0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Divider(),
              const SizedBox(height: 12),
              Row(
                children: [
                  Expanded(
                    child: Text(
                      'Citizen Reports',
                      style: Theme.of(context)
                          .textTheme
                          .titleSmall
                          ?.copyWith(fontWeight: FontWeight.w600),
                    ),
                  ),
                  if (affected > 0) ...[
                    _ReportCountBadge(
                        label: '$affected affected',
                        color: const Color(0xFFEF4444)),
                    const SizedBox(width: 6),
                  ],
                  if (ok > 0)
                    _ReportCountBadge(
                        label: '$ok ok', color: const Color(0xFF16A34A)),
                ],
              ),
              const SizedBox(height: 10),
              ...reports.map((r) => _ReportCard(report: r, cs: cs)),
            ],
          ),
        );
      },
    );
  }
}

class _ReportCountBadge extends StatelessWidget {
  final String label;
  final Color color;
  const _ReportCountBadge({required this.label, required this.color});

  @override
  Widget build(BuildContext context) => Container(
        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
        decoration: BoxDecoration(
          color: color.withAlpha(20),
          borderRadius: BorderRadius.circular(20),
          border: Border.all(color: color.withAlpha(80)),
        ),
        child: Text(label,
            style: TextStyle(
                fontSize: 11, color: color, fontWeight: FontWeight.w600)),
      );
}

class _ReportCard extends StatelessWidget {
  final PlatformReport report;
  final ColorScheme cs;
  const _ReportCard({required this.report, required this.cs});

  @override
  Widget build(BuildContext context) {
    final isAffected = report.type == 'affected';
    final color =
        isAffected ? const Color(0xFFEF4444) : const Color(0xFF16A34A);

    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
        decoration: BoxDecoration(
          color: cs.surfaceContainerHighest,
          borderRadius: BorderRadius.circular(10),
        ),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2),
              decoration: BoxDecoration(
                color: color.withAlpha(20),
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: color.withAlpha(80)),
              ),
              child: Text(
                isAffected ? 'Affected' : 'OK',
                style: TextStyle(
                    fontSize: 11, color: color, fontWeight: FontWeight.w700),
              ),
            ),
            const SizedBox(width: 10),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  if (report.freeText != null) ...[
                    Text(report.freeText!,
                        style: TextStyle(
                            fontSize: 13, color: cs.onSurface, height: 1.4)),
                    const SizedBox(height: 3),
                  ],
                  Text(
                    [
                      _ago(report.createdAt),
                      if (report.district != null) report.district!,
                      if (!report.isAnonymous && report.reporterName != null)
                        report.reporterName!,
                    ].join(' · '),
                    style:
                        TextStyle(fontSize: 11, color: cs.onSurfaceVariant),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  String _ago(DateTime t) {
    final diff = DateTime.now().difference(t);
    if (diff.inMinutes < 60) return '${diff.inMinutes}m ago';
    if (diff.inHours < 24) return '${diff.inHours}h ago';
    return '${diff.inDays}d ago';
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
    final cs = Theme.of(context).colorScheme;
    final color = switch (incident.state) {
      'resolved' => Colors.green,
      'confirmed' || 'recurred' => Colors.red,
      _ => Colors.orange,
    };
    final dimColor = cs.onSurface.withAlpha(100);
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
                style: TextStyle(fontSize: 11, color: dimColor),
              ),
            ),
          Text(
            incident.durationLabel,
            style: TextStyle(fontSize: 12, color: dimColor),
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
    final cs = Theme.of(context).colorScheme;
    final mw = platform.maintenance;
    final hasIssue = platform.hasIssue;
    final statusColor = (mw?.isActive ?? false)
        ? const Color(0xFF0055A4)
        : hasIssue
            ? const Color(0xFFEF4444)
            : const Color(0xFF16A34A);

    return Container(
      color: cs.surface,
      padding: const EdgeInsets.fromLTRB(20, 22, 20, 22),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.center,
        children: [
          // ── Platform logo / uptime ring / status circle ───────────────
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
                  platform.category,
                  style: TextStyle(
                      fontSize: 12, color: cs.onSurfaceVariant),
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

// ── Community (public) suggestions ───────────────────────────────────────────

class _PublicSuggestionsSection extends ConsumerStatefulWidget {
  final String platformId;
  const _PublicSuggestionsSection({required this.platformId});

  @override
  ConsumerState<_PublicSuggestionsSection> createState() =>
      _PublicSuggestionsSectionState();
}

class _PublicSuggestionsSectionState
    extends ConsumerState<_PublicSuggestionsSection> {
  String? _votingId;
  // Local override map for optimistic upvote display.
  final Map<String, ({int upvotes, bool hasUpvoted})> _local = {};

  Future<void> _toggleVote(PublicSuggestion s) async {
    if (_votingId != null) return;
    setState(() => _votingId = s.id);
    final wasUpvoted = (_local[s.id]?.hasUpvoted ?? s.hasUpvoted);
    setState(() {
      _local[s.id] = (
        upvotes: (_local[s.id]?.upvotes ?? s.upvotes) + (wasUpvoted ? -1 : 1),
        hasUpvoted: !wasUpvoted,
      );
    });
    try {
      final method = wasUpvoted ? 'DELETE' : 'POST';
      if (method == 'POST') {
        await ref.read(apiClientProvider).post('/api/suggestions/${s.id}/upvote', {});
      } else {
        await ref.read(apiClientProvider).delete('/api/suggestions/${s.id}/upvote');
      }
    } on ApiException {
      // Roll back on error.
      setState(() {
        _local[s.id] = (
          upvotes: (_local[s.id]?.upvotes ?? s.upvotes) + (wasUpvoted ? 1 : -1),
          hasUpvoted: wasUpvoted,
        );
      });
    } finally {
      if (mounted) setState(() => _votingId = null);
    }
  }

  @override
  Widget build(BuildContext context) {
    final async = ref.watch(platformSuggestionsProvider(widget.platformId));
    return async.when(
      loading: () => const SizedBox.shrink(),
      error: (_, _) => const SizedBox.shrink(),
      data: (suggestions) {
        if (suggestions.isEmpty) return const SizedBox.shrink();
        final cs = Theme.of(context).colorScheme;
        return Padding(
          padding: const EdgeInsets.fromLTRB(16, 8, 16, 0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Divider(),
              const SizedBox(height: 12),
              Row(
                children: [
                  Expanded(
                    child: Text(
                      'Community suggestions',
                      style: Theme.of(context)
                          .textTheme
                          .titleSmall
                          ?.copyWith(fontWeight: FontWeight.w600),
                    ),
                  ),
                  Text(
                    '${suggestions.length} idea${suggestions.length != 1 ? 's' : ''}',
                    style: TextStyle(fontSize: 12, color: cs.onSurfaceVariant),
                  ),
                ],
              ),
              const SizedBox(height: 10),
              ...suggestions.map((s) {
                final ov = _local[s.id];
                final upvotes = ov?.upvotes ?? s.upvotes;
                final hasUpvoted = ov?.hasUpvoted ?? s.hasUpvoted;
                final isVoting = _votingId == s.id;
                final (statusLabel, statusColor) = _suggestionStatus(s.status);
                return Padding(
                  padding: const EdgeInsets.only(bottom: 8),
                  child: Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: cs.surfaceContainerHighest,
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        // Upvote button
                        GestureDetector(
                          onTap: isVoting ? null : () => _toggleVote(s),
                          child: Padding(
                            padding: const EdgeInsets.only(right: 12, top: 2),
                            child: Column(
                              children: [
                                Icon(
                                  hasUpvoted
                                      ? Icons.arrow_upward_rounded
                                      : Icons.arrow_upward_outlined,
                                  size: 18,
                                  color: hasUpvoted
                                      ? const Color(0xFF0055A4)
                                      : cs.onSurfaceVariant,
                                ),
                                Text(
                                  '$upvotes',
                                  style: TextStyle(
                                    fontSize: 12,
                                    fontWeight: FontWeight.w700,
                                    color: hasUpvoted
                                        ? const Color(0xFF0055A4)
                                        : cs.onSurfaceVariant,
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ),
                        // Content
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Row(
                                children: [
                                  Container(
                                    padding: const EdgeInsets.symmetric(
                                        horizontal: 7, vertical: 2),
                                    decoration: BoxDecoration(
                                      color: statusColor.withAlpha(20),
                                      borderRadius: BorderRadius.circular(20),
                                      border: Border.all(
                                          color: statusColor.withAlpha(70)),
                                    ),
                                    child: Text(
                                      statusLabel,
                                      style: TextStyle(
                                        fontSize: 10,
                                        fontWeight: FontWeight.w700,
                                        color: statusColor,
                                      ),
                                    ),
                                  ),
                                  const SizedBox(width: 6),
                                  Text(
                                    s.category,
                                    style: TextStyle(
                                        fontSize: 11,
                                        color: cs.onSurfaceVariant),
                                  ),
                                ],
                              ),
                              const SizedBox(height: 5),
                              Text(
                                s.title,
                                style: TextStyle(
                                  fontSize: 13,
                                  fontWeight: FontWeight.w600,
                                  color: cs.onSurface,
                                ),
                              ),
                              const SizedBox(height: 2),
                              Text(
                                s.body,
                                maxLines: 2,
                                overflow: TextOverflow.ellipsis,
                                style: TextStyle(
                                    fontSize: 12,
                                    color: cs.onSurfaceVariant,
                                    height: 1.4),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ),
                );
              }),
            ],
          ),
        );
      },
    );
  }

  static (String, Color) _suggestionStatus(String status) => switch (status) {
        'public'       => ('Community idea',   const Color(0xFF3B82F6)),
        'forwarded'    => ('Sent to operator', const Color(0xFF8B5CF6)),
        'acknowledged' => ('Being considered', const Color(0xFF0D9488)),
        'planned'      => ('In roadmap',       const Color(0xFF16A34A)),
        'declined'     => ('Not planned',      const Color(0xFF6B7280)),
        _              => (status,             const Color(0xFF6B7280)),
      };
}

// ── Bottom sheet for suggestions ─────────────────────────────────────────────

class _SuggestionSheet extends ConsumerStatefulWidget {
  final String platformId;
  const _SuggestionSheet({required this.platformId});

  @override
  ConsumerState<_SuggestionSheet> createState() => _SuggestionSheetState();
}

class _SuggestionSheetState extends ConsumerState<_SuggestionSheet> {
  final _titleCtrl = TextEditingController();
  final _bodyCtrl  = TextEditingController();
  String _category  = 'improvement';
  bool   _submitting = false;
  String? _error;

  static const _categories = [
    ('improvement', 'Improvement'),
    ('feature',     'New feature'),
    ('other',       'Other'),
  ];

  @override
  void dispose() {
    _titleCtrl.dispose();
    _bodyCtrl.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    final title = _titleCtrl.text.trim();
    final body  = _bodyCtrl.text.trim();
    if (title.isEmpty) { setState(() => _error = 'Title is required'); return; }
    if (body.isEmpty)  { setState(() => _error = 'Description is required'); return; }

    setState(() { _submitting = true; _error = null; });
    try {
      await ref.read(apiClientProvider).post('/api/suggestions', {
        'platformId': widget.platformId,
        'title': title,
        'body': body,
        'category': _category,
      });
      if (mounted) Navigator.of(context).pop(true);
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
                  child: Text('Suggest an improvement',
                      style: TextStyle(fontSize: 18, fontWeight: FontWeight.w600)),
                ),
                IconButton(
                  icon: const Icon(Icons.close),
                  onPressed: () => Navigator.of(context).pop(),
                ),
              ],
            ),
            const SizedBox(height: 12),
            // Category chips
            Wrap(
              spacing: 8,
              children: _categories.map((c) {
                final selected = _category == c.$1;
                return ChoiceChip(
                  label: Text(c.$2),
                  selected: selected,
                  onSelected: (_) => setState(() => _category = c.$1),
                );
              }).toList(),
            ),
            const SizedBox(height: 16),
            TextField(
              controller: _titleCtrl,
              maxLength: 120,
              decoration: const InputDecoration(
                labelText: 'Title *',
                hintText: 'e.g. "Add biometric login support"',
                border: OutlineInputBorder(),
              ),
            ),
            const SizedBox(height: 12),
            TextField(
              controller: _bodyCtrl,
              maxLines: 4,
              decoration: const InputDecoration(
                labelText: 'Description *',
                hintText: 'Describe the problem or improvement you\'d like to see…',
                border: OutlineInputBorder(),
              ),
            ),
            if (_error != null) ...[
              const SizedBox(height: 8),
              Text(_error!, style: const TextStyle(color: Colors.red, fontSize: 13)),
            ],
            const SizedBox(height: 16),
            FilledButton(
              onPressed: _submitting ? null : _submit,
              child: _submitting
                  ? const DotsLoader(color: Colors.white, dotSize: 6)
                  : const Text('Submit suggestion'),
            ),
          ],
        ),
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
