import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../models/incident.dart';
import '../auth/auth_provider.dart';

// ── Incident detail (read) ────────────────────────────────────────────────────

final incidentDetailProvider =
    FutureProvider.autoDispose.family<Incident, String>((ref, incidentId) async {
  final data = await ref.read(apiClientProvider).get('/api/incidents/$incidentId');
  return Incident.fromJson(data);
});

// ── Comments (read) ───────────────────────────────────────────────────────────

final incidentCommentsProvider =
    FutureProvider.autoDispose.family<List<Comment>, String>((ref, incidentId) async {
  final data = await ref
      .read(apiClientProvider)
      .get('/api/incidents/$incidentId/comments');
  return (data['comments'] as List<dynamic>)
      .map((c) => Comment.fromJson(c as Map<String, dynamic>))
      .toList();
});

// ── Mutations ─────────────────────────────────────────────────────────────────

final incidentActionsProvider =
    NotifierProvider<IncidentActionsNotifier, void>(IncidentActionsNotifier.new);

class IncidentActionsNotifier extends Notifier<void> {
  @override
  void build() {}

  Future<void> cosign(String incidentId) async {
    await ref
        .read(apiClientProvider)
        .post('/api/incidents/$incidentId/cosign', {});
    // Reload incident so cosignCount + userHasCosigned update.
    ref.invalidate(incidentDetailProvider(incidentId));
  }

  Future<Comment> addComment(String incidentId, String content) async {
    final data = await ref
        .read(apiClientProvider)
        .post('/api/incidents/$incidentId/comments', {'content': content});
    ref.invalidate(incidentCommentsProvider(incidentId));
    return Comment.fromJson(data);
  }
}
