import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../core/api_client.dart';
import '../auth_provider.dart';


class PhoneEntryScreen extends ConsumerStatefulWidget {
  const PhoneEntryScreen({super.key});

  @override
  ConsumerState<PhoneEntryScreen> createState() => _PhoneEntryScreenState();
}

class _PhoneEntryScreenState extends ConsumerState<PhoneEntryScreen> {
  final _phoneCtrl = TextEditingController();
  bool _loading = false;
  bool _googleLoading = false;
  String? _error;

  @override
  void dispose() {
    _phoneCtrl.dispose();
    super.dispose();
  }

  String _normalise(String raw) {
    var s = raw.trim();
    if (s.startsWith('0')) s = s.substring(1);
    if (!s.startsWith('+')) s = '+250$s';
    return s;
  }

  Future<void> _submit() async {
    if (_phoneCtrl.text.trim().isEmpty) return;
    final phone = _normalise(_phoneCtrl.text);
    setState(() { _loading = true; _error = null; });
    try {
      await ref.read(authProvider.notifier).requestOtp(phone);
      if (mounted) context.push('/auth/verify', extra: phone);
    } on ApiException catch (e) {
      setState(() => _error = e.message);
    } catch (_) {
      setState(() => _error = 'Something went wrong. Please try again.');
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _signInWithGoogle() async {
    setState(() { _googleLoading = true; _error = null; });
    try {
      await ref.read(authProvider.notifier).signInWithGoogle();
    } on ApiException catch (e) {
      if (mounted) setState(() => _error = e.message);
    } catch (e) {
      if (mounted) setState(() => _error = 'Google sign-in failed. Please try again.');
    } finally {
      if (mounted) setState(() => _googleLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Stack(
        fit: StackFit.expand,
        children: [
          // Gradient fills the entire screen regardless of content height
          const DecoratedBox(
            decoration: BoxDecoration(
              gradient: LinearGradient(
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
                colors: [Color(0xFF1A6ED8), Color(0xFF003A7A)],
              ),
            ),
          ),
          SafeArea(
            child: SingleChildScrollView(
              padding: const EdgeInsets.fromLTRB(28, 48, 28, 28),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  // ── Logo ────────────────────────────────────────────────
                  Container(
                    width: 62,
                    height: 62,
                    decoration: BoxDecoration(
                      color: Colors.white.withAlpha(30),
                      borderRadius: BorderRadius.circular(18),
                      border: Border.all(color: Colors.white.withAlpha(60)),
                    ),
                    child: ClipRRect(
                      borderRadius: BorderRadius.circular(16),
                      child: Image.asset(
                        'assets/icon/phas-icon.png',
                        width: 62,
                        height: 62,
                        fit: BoxFit.cover,
                      ),
                    ),
                  ),
                  const SizedBox(height: 32),

                  // ── Headline ─────────────────────────────────────────────
                  const Text(
                    'Know when your\nplatforms fail.',
                    style: TextStyle(
                      color: Colors.white,
                      fontSize: 30,
                      fontWeight: FontWeight.w800,
                      height: 1.2,
                      letterSpacing: -0.5,
                    ),
                  ),
                  const SizedBox(height: 10),
                  Text(
                    'Enter your Rwanda mobile number to sign in or create an account.',
                    style: TextStyle(
                      color: Colors.white.withAlpha(180),
                      fontSize: 14,
                      height: 1.5,
                    ),
                  ),
                  const SizedBox(height: 40),

                  // ── Phone input ──────────────────────────────────────────
                  Container(
                    decoration: BoxDecoration(
                      color: Colors.white.withAlpha(18),
                      borderRadius: BorderRadius.circular(14),
                      border: Border.all(
                        color: Colors.white
                            .withAlpha(_error != null ? 120 : 60),
                      ),
                    ),
                    child: Row(
                      children: [
                        Container(
                          padding: const EdgeInsets.symmetric(
                              horizontal: 16, vertical: 18),
                          decoration: BoxDecoration(
                            border: Border(
                              right: BorderSide(
                                  color: Colors.white.withAlpha(50)),
                            ),
                          ),
                          child: const Text(
                            '+250',
                            style: TextStyle(
                              color: Colors.white,
                              fontSize: 15,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                        ),
                        Expanded(
                          child: TextField(
                            controller: _phoneCtrl,
                            keyboardType: TextInputType.phone,
                            style: const TextStyle(
                                color: Colors.white, fontSize: 15),
                            onSubmitted: (_) => _submit(),
                            decoration: InputDecoration(
                              hintText: '07X XXX XXXX',
                              hintStyle: TextStyle(
                                  color: Colors.white.withAlpha(90)),
                              border: InputBorder.none,
                              enabledBorder: InputBorder.none,
                              focusedBorder: InputBorder.none,
                              filled: false,
                              contentPadding: const EdgeInsets.symmetric(
                                  horizontal: 14, vertical: 18),
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),

                  // ── Error ────────────────────────────────────────────────
                  if (_error != null) ...[
                    const SizedBox(height: 10),
                    Row(
                      children: [
                        Icon(Icons.info_outline,
                            size: 14, color: Colors.red.shade200),
                        const SizedBox(width: 6),
                        Expanded(
                          child: Text(_error!,
                              style: TextStyle(
                                  color: Colors.red.shade200,
                                  fontSize: 13)),
                        ),
                      ],
                    ),
                  ],
                  const SizedBox(height: 24),

                  // ── Phone CTA ────────────────────────────────────────────
                  SizedBox(
                    height: 56,
                    child: ElevatedButton(
                      onPressed: _loading ? null : _submit,
                      style: ElevatedButton.styleFrom(
                        backgroundColor: Colors.white,
                        foregroundColor: const Color(0xFF003A7A),
                        disabledBackgroundColor: Colors.white.withAlpha(120),
                        shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(16)),
                        elevation: 0,
                      ),
                      child: _loading
                          ? const SizedBox(
                              height: 22,
                              width: 22,
                              child: CircularProgressIndicator(
                                  strokeWidth: 2.5,
                                  color: Color(0xFF003A7A)))
                          : const Text(
                              'Send verification code',
                              style: TextStyle(
                                  fontSize: 16,
                                  fontWeight: FontWeight.w700),
                            ),
                    ),
                  ),

                  // ── Divider ──────────────────────────────────────────────
                  const SizedBox(height: 20),
                  Row(children: [
                    Expanded(child: Divider(color: Colors.white.withAlpha(40), thickness: 1)),
                    Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 12),
                      child: Text('or',
                          style: TextStyle(
                              color: Colors.white.withAlpha(120), fontSize: 13)),
                    ),
                    Expanded(child: Divider(color: Colors.white.withAlpha(40), thickness: 1)),
                  ]),

                  // ── Google sign-in ───────────────────────────────────────
                  const SizedBox(height: 20),
                  SizedBox(
                    height: 56,
                    child: OutlinedButton(
                      onPressed: (_loading || _googleLoading) ? null : _signInWithGoogle,
                      style: OutlinedButton.styleFrom(
                        foregroundColor: Colors.white,
                        side: BorderSide(color: Colors.white.withAlpha(80)),
                        backgroundColor: Colors.white.withAlpha(15),
                        disabledForegroundColor: Colors.white.withAlpha(80),
                        shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(16)),
                      ),
                      child: _googleLoading
                          ? const SizedBox(
                              height: 22,
                              width: 22,
                              child: CircularProgressIndicator(
                                  strokeWidth: 2.5, color: Colors.white))
                          : Row(
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: [
                                const _GoogleIcon(),
                                const SizedBox(width: 10),
                                const Text(
                                  'Continue with Google',
                                  style: TextStyle(
                                      fontSize: 16,
                                      fontWeight: FontWeight.w600),
                                ),
                              ],
                            ),
                    ),
                  ),

                  const SizedBox(height: 16),
                  Text(
                    'By continuing you agree to the PHAS terms of service.',
                    style: TextStyle(
                        color: Colors.white.withAlpha(90), fontSize: 11),
                    textAlign: TextAlign.center,
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _GoogleIcon extends StatelessWidget {
  const _GoogleIcon();

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: 20,
      height: 20,
      child: CustomPaint(painter: _GLogoPainter()),
    );
  }
}

class _GLogoPainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    final r = size.width / 2;
    final c = Offset(r, r);
    final strokeW = r * 0.38;
    final arcR = r - strokeW / 2;

    void arc(Color color, double startAngle, double sweepAngle) {
      canvas.drawArc(
        Rect.fromCircle(center: c, radius: arcR),
        startAngle,
        sweepAngle,
        false,
        Paint()
          ..color = color
          ..style = PaintingStyle.stroke
          ..strokeWidth = strokeW
          ..strokeCap = StrokeCap.butt,
      );
    }

    // Google G logo: four colored arc segments
    arc(const Color(0xFF4285F4), -0.26, 1.57);  // blue  (right)
    arc(const Color(0xFFFBBC05), 1.31, 1.48);   // yellow (bottom)
    arc(const Color(0xFF34A853), 2.79, 0.79);   // green  (bottom-left)
    arc(const Color(0xFFEA4335), -2.09, 1.83);  // red   (top-left + top)

    // Horizontal bar of the "G"
    canvas.drawRect(
      Rect.fromLTWH(r, r - strokeW / 2, r * 0.9, strokeW),
      Paint()..color = const Color(0xFF4285F4),
    );
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}
