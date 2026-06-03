import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'core/storage.dart';
import 'features/auth/screens/phone_entry_screen.dart';
import 'features/auth/screens/otp_verify_screen.dart';
import 'features/platforms/screens/platforms_screen.dart';
import 'features/platforms/screens/platform_detail_screen.dart';
import 'models/platform.dart';

final _router = GoRouter(
  initialLocation: '/platforms',
  redirect: (context, state) async {
    final hasToken = await SecureStorage.hasToken();
    final onAuth = state.matchedLocation.startsWith('/auth');
    if (!hasToken && !onAuth) return '/auth/phone';
    return null;
  },
  routes: [
    GoRoute(path: '/auth/phone', builder: (_, _) => const PhoneEntryScreen()),
    GoRoute(
      path: '/auth/verify',
      builder: (_, state) =>
          OtpVerifyScreen(phone: state.extra as String),
    ),
    GoRoute(path: '/platforms', builder: (_, _) => const PlatformsScreen()),
    GoRoute(
      path: '/platforms/:id',
      builder: (_, state) =>
          PlatformDetailScreen(platform: state.extra as Platform),
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
      theme: ThemeData(
        colorSchemeSeed: const Color(0xFF0055A4), // Rwanda blue
        useMaterial3: true,
      ),
    );
  }
}
