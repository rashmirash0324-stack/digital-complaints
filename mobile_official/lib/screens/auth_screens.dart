import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../services/api_service.dart';
import '../theme/app_theme.dart';
import '../widgets/common_widgets.dart';
import 'home_shell.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final _formKey = GlobalKey<FormState>();
  final _userId = TextEditingController();
  final _password = TextEditingController();

  String _selectedRole = 'staff'; // 'staff' or 'admin'
  bool _loading = false;
  String? _error;

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() {
      _loading = true;
      _error = null;
    });

    try {
      final data = await ApiService.instance.login(_userId.text, _password.text);
      final role = (data['user'] as Map?)?['role'] as String?;

      if (role != _selectedRole) {
        await ApiService.instance.logout();
        if (mounted) {
          setState(() {
            _error = role == 'user'
                ? 'Citizen accounts must use the Digital Complaints citizen app.'
                : _selectedRole == 'admin'
                    ? 'This account is not an Admin account. Switch to the Staff tab.'
                    : 'This account is not a Staff account. Switch to the Admin tab.';
          });
        }
        return;
      }

      if (!mounted) return;
      Navigator.of(context).pushReplacement(
        MaterialPageRoute(builder: (_) => const HomeShell()),
      );
    } catch (e) {
      if (mounted) setState(() => _error = e.toString());
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  void dispose() {
    _userId.dispose();
    _password.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final isAdmin = _selectedRole == 'admin';
    final accent = isAdmin ? AppColors.roleAdmin : AppColors.roleStaff;

    return Scaffold(
      appBar: AppBar(
        backgroundColor: AppColors.canvas,
        shape: const Border(),
        actions: [
          IconButton(
            tooltip: 'Server settings',
            onPressed: () => showServerConfigSheet(context),
            icon: const Icon(Icons.dns_outlined, color: AppColors.navy),
          ),
        ],
      ),
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.fromLTRB(20, 4, 20, 28),
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 420),
              child: Card(
                child: Padding(
                  padding: const EdgeInsets.all(24),
                  child: Form(
                    key: _formKey,
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      children: [
                        Center(
                          child: Image.asset(
                            'assets/images/logo_full.png',
                            height: 58,
                            fit: BoxFit.contain,
                          ),
                        ),
                        const SizedBox(height: 16),
                        Text(
                          isAdmin ? 'Admin portal' : 'Staff portal',
                          textAlign: TextAlign.center,
                          style: Theme.of(context).textTheme.headlineSmall,
                        ),
                        const SizedBox(height: 4),
                        Text(
                          isAdmin
                              ? 'Sign in with your predefined Admin User ID.'
                              : 'Sign in with your predefined Staff User ID.',
                          textAlign: TextAlign.center,
                          style: Theme.of(context).textTheme.bodySmall,
                        ),
                        const SizedBox(height: 18),
                        SegmentedButton<String>(
                          segments: const [
                            ButtonSegment(
                              value: 'staff',
                              label: Text('Staff'),
                              icon: Icon(Icons.engineering_outlined, size: 18),
                            ),
                            ButtonSegment(
                              value: 'admin',
                              label: Text('Admin'),
                              icon: Icon(Icons.admin_panel_settings_outlined, size: 18),
                            ),
                          ],
                          selected: {_selectedRole},
                          onSelectionChanged: (s) => setState(() {
                            _selectedRole = s.first;
                            _error = null;
                          }),
                        ),
                        const SizedBox(height: 18),
                        if (_error != null) ...[
                          Container(
                            padding: const EdgeInsets.all(12),
                            decoration: BoxDecoration(
                              color: AppColors.dangerBg,
                              borderRadius: BorderRadius.circular(10),
                            ),
                            child: Text(
                              _error!,
                              style: const TextStyle(color: AppColors.danger, fontSize: 13),
                            ),
                          ),
                          const SizedBox(height: 14),
                        ],
                        TextFormField(
                          controller: _userId,
                          textCapitalization: TextCapitalization.characters,
                          textInputAction: TextInputAction.next,
                          decoration: InputDecoration(
                            labelText: isAdmin ? 'Admin User ID' : 'Staff User ID',
                            hintText: isAdmin ? 'e.g. ADMIN01' : 'e.g. STAFF01',
                          ),
                          validator: (v) =>
                              (v == null || v.trim().isEmpty) ? 'Enter your User ID' : null,
                        ),
                        const SizedBox(height: 14),
                        PasswordField(
                          controller: _password,
                          hint: 'Enter your password',
                          validator: (v) => (v == null || v.isEmpty) ? 'Enter your password' : null,
                        ),
                        Align(
                          alignment: Alignment.centerRight,
                          child: TextButton(
                            onPressed: () => Navigator.push(
                              context,
                              MaterialPageRoute(builder: (_) => const ForgotPasswordScreen()),
                            ),
                            child: const Text('Reset via Email OTP'),
                          ),
                        ),
                        const SizedBox(height: 6),
                        ElevatedButton(
                          style: ElevatedButton.styleFrom(backgroundColor: accent),
                          onPressed: _loading ? null : _submit,
                          child: Text(
                            _loading
                                ? 'Signing in...'
                                : isAdmin
                                    ? 'Admin Login'
                                    : 'Staff Login',
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ),
            ),
          ),
        ),
      ),
      bottomNavigationBar: SafeArea(
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
          decoration: const BoxDecoration(
            color: AppColors.surface,
            border: Border(top: BorderSide(color: AppColors.border)),
          ),
          child: Text(
            '© ${DateTime.now().year} Digital Official · Staff & Admin Operations',
            textAlign: TextAlign.center,
            style: Theme.of(context).textTheme.bodySmall,
          ),
        ),
      ),
    );
  }
}

class ForgotPasswordScreen extends StatefulWidget {
  const ForgotPasswordScreen({super.key});

  @override
  State<ForgotPasswordScreen> createState() => _ForgotPasswordScreenState();
}

class _ForgotPasswordScreenState extends State<ForgotPasswordScreen> {
  final _formKey = GlobalKey<FormState>();
  final _identifier = TextEditingController();
  final _otp = TextEditingController();
  final _newPass = TextEditingController();
  final _confirmPass = TextEditingController();

  int _step = 1;
  bool _loading = false;
  String? _error;
  String? _notice;
  String? _devOtp;

  Future<void> _sendOtp() async {
    if (_identifier.text.trim().isEmpty) {
      setState(() => _error = 'Enter your predefined User ID or email.');
      return;
    }
    setState(() {
      _loading = true;
      _error = null;
      _notice = null;
    });

    try {
      final res = await ApiService.instance.sendResetOtp(_identifier.text);
      if (!mounted) return;
      setState(() {
        _step = 2;
        _notice = (res['message'] as String?) ?? 'OTP sent to registered email.';
        _devOtp = res['devOtp'] as String?;
      });
    } catch (e) {
      if (mounted) setState(() => _error = e.toString());
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _verifyAndReset() async {
    if (!_formKey.currentState!.validate()) return;
    if (_newPass.text != _confirmPass.text) {
      setState(() => _error = 'Passwords do not match.');
      return;
    }

    setState(() {
      _loading = true;
      _error = null;
    });

    try {
      final msg = await ApiService.instance.verifyOtpAndReset(
        identifier: _identifier.text,
        otp: _otp.text,
        newPassword: _newPass.text,
      );
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(msg)));
      Navigator.pop(context);
    } catch (e) {
      if (mounted) setState(() => _error = e.toString());
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  void dispose() {
    _identifier.dispose();
    _otp.dispose();
    _newPass.dispose();
    _confirmPass.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Reset password')),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(20),
          child: Card(
            child: Padding(
              padding: const EdgeInsets.all(20),
              child: Form(
                key: _formKey,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    Text(
                      'Email OTP verification for Staff and Admin accounts.',
                      style: Theme.of(context).textTheme.bodySmall,
                    ),
                    const SizedBox(height: 16),
                    if (_error != null) ...[
                      Container(
                        padding: const EdgeInsets.all(12),
                        decoration: BoxDecoration(
                          color: AppColors.dangerBg,
                          borderRadius: BorderRadius.circular(10),
                        ),
                        child: Text(
                          _error!,
                          style: const TextStyle(color: AppColors.danger, fontSize: 13),
                        ),
                      ),
                      const SizedBox(height: 12),
                    ],
                    if (_notice != null) ...[
                      Container(
                        padding: const EdgeInsets.all(12),
                        decoration: BoxDecoration(
                          color: AppColors.successBg,
                          borderRadius: BorderRadius.circular(10),
                        ),
                        child: Text(
                          _notice!,
                          style: const TextStyle(color: AppColors.success, fontSize: 13),
                        ),
                      ),
                      const SizedBox(height: 12),
                    ],
                    if (_devOtp != null && _step == 2) ...[
                      Container(
                        padding: const EdgeInsets.all(12),
                        decoration: BoxDecoration(
                          color: AppColors.infoBg,
                          borderRadius: BorderRadius.circular(10),
                        ),
                        child: Text(
                          'Dev Mode OTP: $_devOtp',
                          style: const TextStyle(
                            color: AppColors.info,
                            fontWeight: FontWeight.w700,
                            fontSize: 13,
                          ),
                        ),
                      ),
                      const SizedBox(height: 12),
                    ],
                    if (_step == 1) ...[
                      TextFormField(
                        controller: _identifier,
                        textCapitalization: TextCapitalization.characters,
                        decoration: const InputDecoration(
                          labelText: 'User ID or Email',
                          hintText: 'ADMIN01 or STAFF01',
                        ),
                      ),
                      const SizedBox(height: 18),
                      ElevatedButton(
                        onPressed: _loading ? null : _sendOtp,
                        child: Text(_loading ? 'Sending OTP...' : 'Send OTP'),
                      ),
                    ] else ...[
                      TextFormField(
                        controller: _otp,
                        keyboardType: TextInputType.number,
                        inputFormatters: [
                          FilteringTextInputFormatter.digitsOnly,
                          LengthLimitingTextInputFormatter(6),
                        ],
                        decoration: const InputDecoration(
                          labelText: '6-digit Email OTP',
                          hintText: 'Enter code from email',
                        ),
                        validator: (v) => (v == null || v.length != 6) ? 'Enter 6 digits' : null,
                      ),
                      const SizedBox(height: 14),
                      PasswordField(
                        controller: _newPass,
                        label: 'New password',
                        hint: 'At least 6 characters',
                        textInputAction: TextInputAction.next,
                        validator: (v) =>
                            (v == null || v.length < 6) ? 'Minimum 6 characters' : null,
                      ),
                      const SizedBox(height: 14),
                      PasswordField(
                        controller: _confirmPass,
                        label: 'Confirm password',
                        hint: 'Repeat new password',
                        validator: (v) =>
                            (v == null || v.length < 6) ? 'Repeat new password' : null,
                      ),
                      const SizedBox(height: 18),
                      ElevatedButton(
                        onPressed: _loading ? null : _verifyAndReset,
                        child: Text(_loading ? 'Verifying...' : 'Verify & Reset'),
                      ),
                      const SizedBox(height: 8),
                      TextButton(
                        onPressed: _loading ? null : _sendOtp,
                        child: const Text('Resend OTP'),
                      ),
                    ],
                  ],
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}
