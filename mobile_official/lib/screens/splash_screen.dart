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

    _docSlide = Tween<Offset>(begin: const Offset(-0.42, 0.08), end: Offset.zero).animate(
      CurvedAnimation(parent: _controller, curve: const Interval(0.0, 0.36, curve: Curves.easeOutCubic)),
    );
    _docFade = CurvedAnimation(parent: _controller, curve: const Interval(0.0, 0.28, curve: Curves.easeOut));

    _megaSlide = Tween<Offset>(begin: const Offset(-0.22, 0.38), end: Offset.zero).animate(
      CurvedAnimation(parent: _controller, curve: const Interval(0.12, 0.48, curve: Curves.easeOutBack)),
    );
    _megaScale = Tween<double>(begin: 0.72, end: 1.0).animate(
      CurvedAnimation(parent: _controller, curve: const Interval(0.12, 0.48, curve: Curves.easeOutBack)),
    );
    _megaFade = CurvedAnimation(parent: _controller, curve: const Interval(0.12, 0.36, curve: Curves.easeOut));

    _dArcSlide = Tween<Offset>(begin: const Offset(0.32, -0.32), end: Offset.zero).animate(
      CurvedAnimation(parent: _controller, curve: const Interval(0.20, 0.58, curve: Curves.easeOutCubic)),
    );
    _dArcFade = CurvedAnimation(parent: _controller, curve: const Interval(0.20, 0.46, curve: Curves.easeOut));

    _pixelsSlide = Tween<Offset>(begin: const Offset(-0.36, -0.45), end: Offset.zero).animate(
      CurvedAnimation(parent: _controller, curve: const Interval(0.34, 0.68, curve: Curves.easeOutBack)),
    );
    _pixelsFade = CurvedAnimation(parent: _controller, curve: const Interval(0.34, 0.56, curve: Curves.easeOut));

    _digitalSlide = Tween<Offset>(begin: const Offset(0.36, 0.0), end: Offset.zero).animate(
      CurvedAnimation(parent: _controller, curve: const Interval(0.42, 0.74, curve: Curves.easeOutCubic)),
    );
    _digitalFade = CurvedAnimation(parent: _controller, curve: const Interval(0.42, 0.64, curve: Curves.easeOut));

    _complaintsSlide = Tween<Offset>(begin: const Offset(0.0, 0.34), end: Offset.zero).animate(
      CurvedAnimation(parent: _controller, curve: const Interval(0.50, 0.82, curve: Curves.easeOutCubic)),
    );
    _complaintsFade = CurvedAnimation(parent: _controller, curve: const Interval(0.50, 0.72, curve: Curves.easeOut));

    _swooshReveal = Tween<double>(begin: 0.0, end: 1.0).animate(
      CurvedAnimation(parent: _controller, curve: const Interval(0.60, 0.90, curve: Curves.easeInOutCubic)),
    );
    _swooshFade = CurvedAnimation(parent: _controller, curve: const Interval(0.60, 0.76, curve: Curves.easeOut));

    _settleScale = TweenSequence<double>([
      TweenSequenceItem(tween: ConstantTween(1.0), weight: 82),
      TweenSequenceItem(tween: Tween(begin: 1.0, end: 1.035).chain(CurveTween(curve: Curves.easeOut)), weight: 9),
      TweenSequenceItem(tween: Tween(begin: 1.035, end: 1.0).chain(CurveTween(curve: Curves.easeInOut)), weight: 9),
    ]).animate(_controller);

    _taglineFade = CurvedAnimation(parent: _controller, curve: const Interval(0.76, 1.0, curve: Curves.easeOut));

    _controller.forward();
    _bootstrap();
  }

  Future<void> _bootstrap() async {
    await ApiService.instance.init();

    if (ApiService.instance.isAuthenticated) {
      if (!ApiService.instance.isOfficial) {
        await ApiService.instance.logout();
      } else {
        try {
          await ApiService.instance.refreshMe();
        } catch (_) {}
      }
    }

    await Future.delayed(const Duration(milliseconds: 2600));
    if (!mounted) return;

    final next = (ApiService.instance.isAuthenticated && ApiService.instance.isOfficial)
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
    return Image.asset(asset, fit: BoxFit.contain, filterQuality: FilterQuality.high);
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
                          FadeTransition(
                            opacity: _docFade,
                            child: SlideTransition(position: _docSlide, child: _layer('assets/images/splash_doc.png')),
                          ),
                          FadeTransition(
                            opacity: _megaFade,
                            child: SlideTransition(
                              position: _megaSlide,
                              child: ScaleTransition(scale: _megaScale, child: _layer('assets/images/splash_megaphone.png')),
                            ),
                          ),
                          FadeTransition(
                            opacity: _dArcFade,
                            child: SlideTransition(position: _dArcSlide, child: _layer('assets/images/splash_d_arc.png')),
                          ),
                          FadeTransition(
                            opacity: _pixelsFade,
                            child: SlideTransition(position: _pixelsSlide, child: _layer('assets/images/splash_pixels.png')),
                          ),
                          FadeTransition(
                            opacity: _digitalFade,
                            child: SlideTransition(position: _digitalSlide, child: _layer('assets/images/splash_digital.png')),
                          ),
                          FadeTransition(
                            opacity: _complaintsFade,
                            child: SlideTransition(position: _complaintsSlide, child: _layer('assets/images/splash_complaints.png')),
                          ),
                          FadeTransition(
                            opacity: _swooshFade,
                            child: AnimatedBuilder(
                              animation: _swooshReveal,
                              builder: (context, child) => ClipRect(
                                child: Align(
                                  alignment: Alignment.centerLeft,
                                  widthFactor: _swooshReveal.value.clamp(0.001, 1.0),
                                  child: child,
                                ),
                              ),
                              child: _layer('assets/images/splash_swoosh.png'),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                ),
                const SizedBox(height: 22),
                FadeTransition(
                  opacity: _taglineFade,
                  child: Column(
                    children: [
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
                        decoration: BoxDecoration(
                          color: AppColors.primarySoft,
                          borderRadius: BorderRadius.circular(999),
                        ),
                        child: const Text(
                          'Staff & Admin Portal',
                          style: TextStyle(
                            color: AppColors.navy,
                            fontSize: 12.5,
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                      ),
                      const SizedBox(height: 20),
                      SizedBox(
                        width: 112,
                        child: ClipRRect(
                          borderRadius: BorderRadius.circular(99),
                          child: const LinearProgressIndicator(
                            minHeight: 3,
                            backgroundColor: AppColors.surfaceAlt,
                            valueColor: AlwaysStoppedAnimation<Color>(AppColors.navy),
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
