import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'core/storage.dart';
import 'features/auth/screens/phone_entry_screen.dart';
import 'features/auth/screens/otp_verify_screen.dart';
import 'features/platforms/screens/platforms_screen.dart';
import 'features/platforms/screens/platform_detail_screen.dart';
import 'features/incidents/incident_detail_screen.dart';
import 'models/platform.dart';

final _router = GoRouter(
  initialLocation: '/platforms',
  // Re-evaluates redirect whenever a token is saved or deleted.
  refreshListenable: SecureStorage.authVersion,
  redirect: (context, state) async {
    final hasToken = await SecureStorage.hasToken();
    final onAuth = state.matchedLocation.startsWith('/auth');
    if (!hasToken && !onAuth) return '/auth/phone';
    if (hasToken && onAuth) return '/platforms';
    return null;
  },
  routes: [
    GoRoute(path: '/auth/phone', builder: (_, _) => const PhoneEntryScreen()),
    GoRoute(
      path: '/auth/verify',
      builder: (_, state) => OtpVerifyScreen(phone: state.extra as String),
    ),
    GoRoute(path: '/platforms', builder: (_, _) => const PlatformsScreen()),
    GoRoute(
      path: '/platforms/:id',
      builder: (_, state) =>
          PlatformDetailScreen(platform: state.extra as Platform),
    ),
    GoRoute(
      path: '/incidents/:id',
      builder: (_, state) {
        final extra = state.extra as Map<String, String>;
        return IncidentDetailScreen(
          incidentId: extra['incidentId']!,
          platformName: extra['platformName']!,
        );
      },
    ),
  ],
);

class PhasApp extends StatelessWidget {
  const PhasApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp.router(
      title: 'PHAS',
      routerConfig: _router,
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        colorSchemeSeed: const Color(0xFF0055A4),
        useMaterial3: true,
      ),
    );
  }
}
