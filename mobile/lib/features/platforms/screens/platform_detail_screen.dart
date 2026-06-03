import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/api_client.dart';
import '../../../models/platform.dart';
import '../../auth/auth_provider.dart';

class PlatformDetailScreen extends ConsumerStatefulWidget {
  final Platform platform;
  const PlatformDetailScreen({super.key, required this.platform});

  @override
  ConsumerState<PlatformDetailScreen> createState() => _PlatformDetailScreenState();
}

class _PlatformDetailScreenState extends ConsumerState<PlatformDetailScreen> {
  bool _submitting = false;
  String? _message;

  Future<void> _report(String type) async {
    setState(() { _submitting = true; _message = null; });
    try {
      final api = ref.read(apiClientProvider);
      await api.post('/api/reports', {
        'platformId': widget.platform.id,
        'type': type,
      });
      setState(() => _message = type == 'affected'
          ? 'Report submitted — thank you.'
          : 'Thanks, noted as working for you.');
    } on ApiException catch (e) {
      setState(() => _message = 'Error: ${e.message}');
    } finally {
      if (mounted) setState(() => _submitting = false);
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
            Text(p.authorityName, style: const TextStyle(color: Colors.black54)),
            const SizedBox(height: 8),
            _StatusCard(platform: p),
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
                    onPressed: _submitting ? null : () => _report('affected'),
                    icon: const Icon(Icons.error_outline, color: Colors.red),
                    label: const Text('Having issues', style: TextStyle(color: Colors.red)),
                    style: OutlinedButton.styleFrom(
                      side: const BorderSide(color: Colors.red),
                    ),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: OutlinedButton.icon(
                    onPressed: _submitting ? null : () => _report('ok'),
                    icon: const Icon(Icons.check_circle_outline, color: Colors.green),
                    label: const Text("I'm fine", style: TextStyle(color: Colors.green)),
                    style: OutlinedButton.styleFrom(
                      side: const BorderSide(color: Colors.green),
                    ),
                  ),
                ),
              ],
            ),
            if (_message != null) ...[
              const SizedBox(height: 12),
              Text(_message!, textAlign: TextAlign.center),
            ],
          ],
        ),
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
          Icon(hasIssue ? Icons.warning_amber_rounded : Icons.check_circle, color: color),
          const SizedBox(width: 12),
          Expanded(
            child: Text(
              platform.statusLabel,
              style: TextStyle(color: color, fontWeight: FontWeight.w600),
            ),
          ),
        ],
      ),
    );
  }
}
