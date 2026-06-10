import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../core/api_client.dart';
import '../auth_provider.dart';

class OtpVerifyScreen extends ConsumerStatefulWidget {
  final String phone;
  const OtpVerifyScreen({super.key, required this.phone});

  @override
  ConsumerState<OtpVerifyScreen> createState() => _OtpVerifyScreenState();
}

class _OtpVerifyScreenState extends ConsumerState<OtpVerifyScreen> {
  final _codeCtrl = TextEditingController();
  bool _loading = false;
  String? _error;

  @override
  void dispose() {
    _codeCtrl.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    final code = _codeCtrl.text.trim();
    if (code.length < 6) return;
    setState(() { _loading = true; _error = null; });
    try {
      await ref.read(authProvider.notifier).verifyOtp(widget.phone, code);
      if (mounted) context.go('/platforms');
    } on ApiException catch (e) {
      setState(() => _error = e.message);
    } catch (_) {
      setState(() => _error = 'Something went wrong. Please try again.');
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Stack(
        fit: StackFit.expand,
        children: [
          // Gradient fills entire screen
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
              padding: const EdgeInsets.fromLTRB(28, 24, 28, 28),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  // ── Back ──────────────────────────────────────────────
                  GestureDetector(
                    onTap: () => context.pop(),
                    child: Container(
                      width: 42,
                      height: 42,
                      decoration: BoxDecoration(
                        color: Colors.white.withAlpha(20),
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: const Icon(Icons.arrow_back_rounded,
                          color: Colors.white, size: 20),
                    ),
                  ),
                  const SizedBox(height: 32),

                  // ── Headline ─────────────────────────────────────────
                  const Text(
                    'Check your\nmessages.',
                    style: TextStyle(
                      color: Colors.white,
                      fontSize: 30,
                      fontWeight: FontWeight.w800,
                      height: 1.2,
                      letterSpacing: -0.5,
                    ),
                  ),
                  const SizedBox(height: 12),
                  Text.rich(
                    TextSpan(
                      style: TextStyle(
                          color: Colors.white.withAlpha(180),
                          fontSize: 14,
                          height: 1.5),
                      children: [
                        const TextSpan(text: 'We sent a 6-digit code to '),
                        TextSpan(
                          text: widget.phone,
                          style: const TextStyle(
                              color: Colors.white,
                              fontWeight: FontWeight.w700),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 40),

                  // ── OTP input ─────────────────────────────────────────
                  Container(
                    decoration: BoxDecoration(
                      color: Colors.white.withAlpha(18),
                      borderRadius: BorderRadius.circular(14),
                      border: Border.all(
                        color: Colors.white
                            .withAlpha(_error != null ? 120 : 60),
                      ),
                    ),
                    child: TextField(
                      controller: _codeCtrl,
                      keyboardType: TextInputType.number,
                      maxLength: 6,
                      textAlign: TextAlign.center,
                      autofocus: true,
                      inputFormatters: [
                        FilteringTextInputFormatter.digitsOnly,
                      ],
                      style: const TextStyle(
                        color: Colors.white,
                        fontSize: 26,
                        fontWeight: FontWeight.w700,
                        letterSpacing: 12,
                      ),
                      decoration: InputDecoration(
                        hintText: '000000',
                        hintStyle: TextStyle(
                          color: Colors.white.withAlpha(70),
                          letterSpacing: 12,
                          fontSize: 26,
                          fontWeight: FontWeight.w700,
                        ),
                        counterText: '',
                        border: InputBorder.none,
                        enabledBorder: InputBorder.none,
                        focusedBorder: InputBorder.none,
                        filled: false,
                        contentPadding:
                            const EdgeInsets.symmetric(vertical: 20),
                      ),
                      onChanged: (v) {
                        if (v.length == 6) _submit();
                      },
                    ),
                  ),

                  // ── Error / hint ──────────────────────────────────────
                  if (_error != null) ...[
                    const SizedBox(height: 12),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Icon(Icons.info_outline,
                            size: 14, color: Colors.red.shade200),
                        const SizedBox(width: 6),
                        Text(_error!,
                            style: TextStyle(
                                color: Colors.red.shade200,
                                fontSize: 13)),
                      ],
                    ),
                  ] else ...[
                    const SizedBox(height: 14),
                    Text(
                      'The code expires in 10 minutes.',
                      style: TextStyle(
                          color: Colors.white.withAlpha(110),
                          fontSize: 12),
                      textAlign: TextAlign.center,
                    ),
                  ],
                  const SizedBox(height: 40),

                  // ── CTA ───────────────────────────────────────────────
                  SizedBox(
                    height: 56,
                    child: ElevatedButton(
                      onPressed: _loading ? null : _submit,
                      style: ElevatedButton.styleFrom(
                        backgroundColor: Colors.white,
                        foregroundColor: const Color(0xFF003A7A),
                        disabledBackgroundColor:
                            Colors.white.withAlpha(120),
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
                              'Verify & sign in',
                              style: TextStyle(
                                  fontSize: 16,
                                  fontWeight: FontWeight.w700),
                            ),
                    ),
                  ),
                  const SizedBox(height: 16),
                  TextButton(
                    onPressed: () => context.pop(),
                    style: TextButton.styleFrom(
                      foregroundColor: Colors.white.withAlpha(160),
                    ),
                    child: const Text('Wrong number? Go back'),
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
