import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'core/notifications.dart';
import 'core/storage.dart';
import 'features/auth/screens/phone_entry_screen.dart';
import 'features/auth/screens/otp_verify_screen.dart';
import 'features/incidents/incident_detail_screen.dart';
import 'features/platforms/screens/platforms_screen.dart';
import 'features/profile/profile_screen.dart';
import 'features/platforms/screens/platform_detail_screen.dart';
import 'models/platform.dart';

// Top-level so NotificationService can push routes into it.
final appRouter = GoRouter(
  initialLocation: '/platforms',
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
    GoRoute(
      path: '/profile',
      builder: (_, _) => const ProfileScreen(),
    ),
  ],
);

class PhasApp extends StatefulWidget {
  const PhasApp({super.key});

  @override
  State<PhasApp> createState() => _PhasAppState();
}

class _PhasAppState extends State<PhasApp> {
  @override
  void initState() {
    super.initState();

    void navigate(String path, Map<String, String> extra) =>
        appRouter.push(path, extra: extra);

    // Register callback — also flushes any local-notification tap that arrived
    // before the router was ready.
    NotificationService.setTapCallback(navigate);
    // Handle background→foreground taps (onMessageOpenedApp).
    NotificationService.listenForTaps(navigate);
    // Deliver any tap that arrived while the app was fully terminated.
    WidgetsBinding.instance.addPostFrameCallback((_) {
      NotificationService.consumePending(navigate);
    });
  }

  @override
  Widget build(BuildContext context) {
    return MaterialApp.router(
      title: 'PHAS',
      routerConfig: appRouter,
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        colorSchemeSeed: const Color(0xFF0055A4),
        useMaterial3: true,
        scaffoldBackgroundColor: const Color(0xFFF8F9FB),
        appBarTheme: const AppBarTheme(
          backgroundColor: Colors.white,
          foregroundColor: Color(0xFF111827),
          elevation: 0,
          scrolledUnderElevation: 1,
          surfaceTintColor: Colors.white,
          titleTextStyle: TextStyle(
            color: Color(0xFF111827),
            fontSize: 17,
            fontWeight: FontWeight.w600,
          ),
        ),
        cardTheme: CardThemeData(
          elevation: 0,
          color: Colors.white,
          surfaceTintColor: Colors.white,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(12),
            side: const BorderSide(color: Color(0xFFE5E7EB)),
          ),
          margin: EdgeInsets.zero,
        ),
        inputDecorationTheme: InputDecorationTheme(
          border: OutlineInputBorder(
            borderRadius: BorderRadius.circular(10),
            borderSide: const BorderSide(color: Color(0xFFD1D5DB)),
          ),
          enabledBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(10),
            borderSide: const BorderSide(color: Color(0xFFD1D5DB)),
          ),
          filled: true,
          fillColor: Colors.white,
          contentPadding:
              const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
        ),
        dividerTheme: const DividerThemeData(
          color: Color(0xFFE5E7EB),
          space: 1,
          thickness: 1,
        ),
      ),
    );
  }
}
