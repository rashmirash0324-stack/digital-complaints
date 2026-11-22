import 'dart:async';
import 'package:flutter/material.dart';
import '../services/api_service.dart';
import '../theme/app_theme.dart';
import 'auth_screens.dart';
import 'home_shell.dart';

class SplashScreen extends StatefulWidget {
  const SplashScreen({super.key});

  @override
  State<SplashScreen> createState() => _SplashScreenState();
}

class _SplashScreenState extends State<SplashScreen> with SingleTickerProviderStateMixin {
  late final AnimationController _controller;

  // Individual piece animations that combine into the exact logo
  late final Animation<Offset> _docSlide;
  late final Animation<double> _docFade;

  late final Animation<Offset> _megaSlide;
  late final Animation<double> _megaScale;
  late final Animation<double> _megaFade;

  late final Animation<Offset> _dArcSlide;
  late final Animation<double> _dArcFade;

  late final Animation<Offset> _pixelsSlide;
  late final Animation<double> _pixelsFade;

  late final Animation<Offset> _digitalSlide;
  late final Animation<double> _digitalFade;

  late final Animation<Offset> _complaintsSlide;
  late final Animation<double> _complaintsFade;

  late final Animation<double> _swooshReveal;
  late final Animation<double> _swooshFade;

  late final Animation<double> _settleScale;
  late final Animation<double> _taglineFade;

  @override
  void initState() {
    super.initState();

    _controller = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 2200),
    );

    // 1. Document icon glides in from left
    _docSlide = Tween<Offset>(
      begin: const Offset(-0.42, 0.08),
      end: Offset.zero,
    ).animate(CurvedAnimation(
      parent: _controller,
      curve: const Interval(0.0, 0.36, curve: Curves.easeOutCubic),
    ));
    _docFade = CurvedAnimation(
      parent: _controller,
      curve: const Interval(0.0, 0.28, curve: Curves.easeOut),
    );

    // 2. Megaphone + rays pop in from bottom-left into the document
    _megaSlide = Tween<Offset>(
      begin: const Offset(-0.22, 0.38),
      end: Offset.zero,
    ).animate(CurvedAnimation(
      parent: _controller,
      curve: const Interval(0.12, 0.48, curve: Curves.easeOutBack),
    ));
    _megaScale = Tween<double>(begin: 0.72, end: 1.0).animate(CurvedAnimation(
      parent: _controller,
      curve: const Interval(0.12, 0.48, curve: Curves.easeOutBack),
    ));
    _megaFade = CurvedAnimation(
      parent: _controller,
      curve: const Interval(0.12, 0.36, curve: Curves.easeOut),
    );

    // 3. Sweeping "D" arc wraps in from top-right
    _dArcSlide = Tween<Offset>(
      begin: const Offset(0.32, -0.32),
      end: Offset.zero,
    ).animate(CurvedAnimation(
      parent: _controller,
      curve: const Interval(0.20, 0.58, curve: Curves.easeOutCubic),
    ));
    _dArcFade = CurvedAnimation(
      parent: _controller,
      curve: const Interval(0.20, 0.46, curve: Curves.easeOut),
    );

    // 4. Pixel squares snap onto top-left corner
    _pixelsSlide = Tween<Offset>(
      begin: const Offset(-0.36, -0.45),
      end: Offset.zero,
    ).animate(CurvedAnimation(
      parent: _controller,
      curve: const Interval(0.34, 0.68, curve: Curves.easeOutBack),
    ));
    _pixelsFade = CurvedAnimation(
      parent: _controller,
      curve: const Interval(0.34, 0.56, curve: Curves.easeOut),
    );

    // 5. "Digital" slides in from right
    _digitalSlide = Tween<Offset>(
      begin: const Offset(0.36, 0.0),
      end: Offset.zero,
    ).animate(CurvedAnimation(
      parent: _controller,
      curve: const Interval(0.42, 0.74, curve: Curves.easeOutCubic),
    ));
    _digitalFade = CurvedAnimation(
      parent: _controller,
      curve: const Interval(0.42, 0.64, curve: Curves.easeOut),
    );

    // 6. "Complaints" rises smoothly from below
    _complaintsSlide = Tween<Offset>(
      begin: const Offset(0.0, 0.34),
      end: Offset.zero,
    ).animate(CurvedAnimation(
      parent: _controller,
      curve: const Interval(0.50, 0.82, curve: Curves.easeOutCubic),
    ));
    _complaintsFade = CurvedAnimation(
      parent: _controller,
      curve: const Interval(0.50, 0.72, curve: Curves.easeOut),
    );

    // 7. Curved underline swoosh sweeps left-to-right
    _swooshReveal = Tween<double>(begin: 0.0, end: 1.0).animate(CurvedAnimation(
      parent: _controller,
      curve: const Interval(0.60, 0.90, curve: Curves.easeInOutCubic),
    ));
    _swooshFade = CurvedAnimation(
      parent: _controller,
      curve: const Interval(0.60, 0.76, curve: Curves.easeOut),
    );

    // Cohesive final settle pulse once all pieces unite
    _settleScale = TweenSequence<double>([
      TweenSequenceItem(tween: ConstantTween(1.0), weight: 82),
      TweenSequenceItem(
        tween: Tween(begin: 1.0, end: 1.035).chain(CurveTween(curve: Curves.easeOut)),
        weight: 9,
      ),
      TweenSequenceItem(
        tween: Tween(begin: 1.035, end: 1.0).chain(CurveTween(curve: Curves.easeInOut)),
        weight: 9,
      ),
    ]).animate(_controller);

    _taglineFade = CurvedAnimation(
      parent: _controller,
      curve: const Interval(0.76, 1.0, curve: Curves.easeOut),
    );

    _controller.forward();
    _bootstrap();
  }

  Future<void> _bootstrap() async {
    await ApiService.instance.init();

    if (ApiService.instance.isAuthenticated) {
      try {
        await ApiService.instance.refreshMe();
      } catch (_) {}
    }

    await Future.delayed(const Duration(milliseconds: 2800));
    if (!mounted) return;

    final next = ApiService.instance.isAuthenticated
        ? const HomeShell()
        : const LoginScreen();

    Navigator.of(context).pushReplacement(
      PageRouteBuilder(
        transitionDuration: const Duration(milliseconds: 420),
        pageBuilder: (_, _, _) => next,
        transitionsBuilder: (_, animation, _, child) =>
            FadeTransition(opacity: animation, child: child),
      ),
    );
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  Widget _layer(String asset) {
    return Image.asset(
      asset,
      fit: BoxFit.contain,
      filterQuality: FilterQuality.high,
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.white,
      body: SafeArea(
        child: Center(
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 28),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                ScaleTransition(
                  scale: _settleScale,
                  child: ConstrainedBox(
                    constraints: const BoxConstraints(maxWidth: 330),
                    child: AspectRatio(
                      aspectRatio: 868 / 314,
                      child: Stack(
                        fit: StackFit.expand,
                        children: [
                          // 1. Document piece
                          FadeTransition(
                            opacity: _docFade,
                            child: SlideTransition(
                              position: _docSlide,
                              child: _layer('assets/images/splash_doc.png'),
                            ),
                          ),
                          // 2. Megaphone + sound rays
                          FadeTransition(
                            opacity: _megaFade,
                            child: SlideTransition(
                              position: _megaSlide,
                              child: ScaleTransition(
                                scale: _megaScale,
                                child: _layer('assets/images/splash_megaphone.png'),
                              ),
                            ),
                          ),
                          // 3. Sweeping "D" arc
                          FadeTransition(
                            opacity: _dArcFade,
                            child: SlideTransition(
                              position: _dArcSlide,
                              child: _layer('assets/images/splash_d_arc.png'),
                            ),
                          ),
                          // 4. Pixel squares
                          FadeTransition(
                            opacity: _pixelsFade,
                            child: SlideTransition(
                              position: _pixelsSlide,
                              child: _layer('assets/images/splash_pixels.png'),
                            ),
                          ),
                          // 5. "Digital" word
                          FadeTransition(
                            opacity: _digitalFade,
                            child: SlideTransition(
                              position: _digitalSlide,
                              child: _layer('assets/images/splash_digital.png'),
                            ),
                          ),
                          // 6. "Complaints" word
                          FadeTransition(
                            opacity: _complaintsFade,
                            child: SlideTransition(
                              position: _complaintsSlide,
                              child: _layer('assets/images/splash_complaints.png'),
                            ),
                          ),
                          // 7. Curved swoosh sweeping left-to-right
                          FadeTransition(
                            opacity: _swooshFade,
                            child: AnimatedBuilder(
                              animation: _swooshReveal,
                              builder: (context, child) {
                                return ClipRect(
                                  child: Align(
                                    alignment: Alignment.centerLeft,
                                    widthFactor: _swooshReveal.value.clamp(0.001, 1.0),
                                    child: child,
                                  ),
                                );
                              },
                              child: _layer('assets/images/splash_swoosh.png'),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                ),
                const SizedBox(height: 24),
                FadeTransition(
                  opacity: _taglineFade,
                  child: Column(
                    children: [
                      Text(
                        'Civic issue reporting & tracking',
                        style: Theme.of(context).textTheme.bodySmall?.copyWith(
                              color: AppColors.textMuted,
                              fontWeight: FontWeight.w500,
                              letterSpacing: 0.2,
                            ),
                      ),
                      const SizedBox(height: 22),
                      SizedBox(
                        width: 112,
                        child: ClipRRect(
                          borderRadius: BorderRadius.circular(99),
                          child: const LinearProgressIndicator(
                            minHeight: 3,
                            backgroundColor: AppColors.surfaceAlt,
                            valueColor: AlwaysStoppedAnimation<Color>(AppColors.primary),
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
