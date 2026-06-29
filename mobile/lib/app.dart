import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'core/notifications.dart';
import 'core/storage.dart';
import 'core/theme.dart';
import 'features/auth/screens/phone_entry_screen.dart';
import 'features/auth/screens/otp_verify_screen.dart';
import 'features/incidents/incident_detail_screen.dart';
import 'features/notifications/notification_history_screen.dart';
import 'features/platforms/screens/platform_detail_screen.dart';
import 'features/platforms/screens/platforms_screen.dart';
import 'features/profile/profile_screen.dart';
import 'features/suggestions/my_suggestions_screen.dart';
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
    GoRoute(path: '/profile', builder: (_, _) => const ProfileScreen()),
    GoRoute(
      path: '/my-suggestions',
      builder: (_, _) => const MySuggestionsScreen(),
    ),
    GoRoute(
      path: '/notifications',
      builder: (_, _) => const NotificationHistoryScreen(),
    ),
  ],
);

// ── Shared theme builders ─────────────────────────────────────────────────────

ThemeData _buildTheme(Brightness brightness) {
  final isDark = brightness == Brightness.dark;
  return ThemeData(
    colorSchemeSeed: const Color(0xFF0055A4),
    brightness: brightness,
    useMaterial3: true,
    scaffoldBackgroundColor:
        isDark ? const Color(0xFF0D1117) : const Color(0xFFF8F9FB),
    appBarTheme: AppBarTheme(
      backgroundColor: isDark ? const Color(0xFF161B22) : Colors.white,
      foregroundColor: isDark ? Colors.white : const Color(0xFF111827),
      elevation: 0,
      scrolledUnderElevation: 1,
      surfaceTintColor: isDark ? const Color(0xFF161B22) : Colors.white,
      titleTextStyle: TextStyle(
        color: isDark ? Colors.white : const Color(0xFF111827),
        fontSize: 17,
        fontWeight: FontWeight.w600,
      ),
    ),
    cardTheme: CardThemeData(
      elevation: 0,
      color: isDark ? const Color(0xFF161B22) : Colors.white,
      surfaceTintColor: isDark ? const Color(0xFF161B22) : Colors.white,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(12),
        side: BorderSide(
            color: isDark ? const Color(0xFF30363D) : const Color(0xFFE5E7EB)),
      ),
      margin: EdgeInsets.zero,
    ),
    inputDecorationTheme: InputDecorationTheme(
      border: OutlineInputBorder(
        borderRadius: BorderRadius.circular(10),
        borderSide: BorderSide(
            color:
                isDark ? const Color(0xFF30363D) : const Color(0xFFD1D5DB)),
      ),
      enabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(10),
        borderSide: BorderSide(
            color:
                isDark ? const Color(0xFF30363D) : const Color(0xFFD1D5DB)),
      ),
      filled: true,
      fillColor: isDark ? const Color(0xFF161B22) : Colors.white,
      contentPadding:
          const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
    ),
    dividerTheme: DividerThemeData(
      color: isDark ? const Color(0xFF21262D) : const Color(0xFFE5E7EB),
      space: 1,
      thickness: 1,
    ),
  );
}

// ── App ───────────────────────────────────────────────────────────────────────

class PhasApp extends ConsumerStatefulWidget {
  const PhasApp({super.key});

  @override
  ConsumerState<PhasApp> createState() => _PhasAppState();
}

class _PhasAppState extends ConsumerState<PhasApp> {
  @override
  void initState() {
    super.initState();
    void navigate(String path, Map<String, String> extra) =>
        appRouter.push(path, extra: extra);
    NotificationService.setTapCallback(navigate);
    NotificationService.listenForTaps(navigate);
    WidgetsBinding.instance.addPostFrameCallback((_) {
      NotificationService.consumePending(navigate);
    });
  }

  @override
  Widget build(BuildContext context) {
    final themeMode = ref.watch(themeProvider);
    return MaterialApp.router(
      title: 'PHAS',
      routerConfig: appRouter,
      debugShowCheckedModeBanner: false,
      themeMode: themeMode,
      theme: _buildTheme(Brightness.light),
      darkTheme: _buildTheme(Brightness.dark),
    );
  }
}
