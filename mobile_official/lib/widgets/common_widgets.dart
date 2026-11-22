import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:geolocator/geolocator.dart';
import 'package:image_picker/image_picker.dart';
import 'package:url_launcher/url_launcher.dart';
import '../services/api_service.dart';
import '../theme/app_theme.dart';

const _months = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

String shortId(String? id) {
  if (id == null || id.isEmpty) return '';
  final tail = id.length >= 6 ? id.substring(id.length - 6) : id;
  return '#${tail.toUpperCase()}';
}

String formatDate(String? iso) {
  if (iso == null || iso.isEmpty) return '—';
  final dt = DateTime.tryParse(iso)?.toLocal();
  if (dt == null) return '—';
  return '${dt.day} ${_months[dt.month - 1]} ${dt.year}';
}

String formatDateTime(String? iso) {
  if (iso == null || iso.isEmpty) return '—';
  final dt = DateTime.tryParse(iso)?.toLocal();
  if (dt == null) return '—';
  final hour12 = dt.hour % 12 == 0 ? 12 : dt.hour % 12;
  final minute = dt.minute.toString().padLeft(2, '0');
  final period = dt.hour >= 12 ? 'PM' : 'AM';
  return '${dt.day} ${_months[dt.month - 1]} ${dt.year}, $hour12:$minute $period';
}

String userInitials(String? name) {
  final parts = (name ?? '?').trim().split(RegExp(r'\s+')).where((e) => e.isNotEmpty).toList();
  if (parts.isEmpty) return '?';
  return parts.take(2).map((p) => p[0].toUpperCase()).join();
}

Future<void> openWhatsApp({String number = kWhatsAppNumber, String message = ''}) async {
  final digits = number.replaceAll(RegExp(r'\D'), '');
  final full = digits.length == 10 ? '91$digits' : digits;
  final uri = Uri.parse(
    'https://wa.me/$full${message.isNotEmpty ? '?text=${Uri.encodeComponent(message)}' : ''}',
  );
  await launchUrl(uri, mode: LaunchMode.externalApplication);
}

Future<void> openGoogleMaps(num lat, num lng) async {
  final uri = Uri.parse('https://www.google.com/maps?q=$lat,$lng');
  await launchUrl(uri, mode: LaunchMode.externalApplication);
}

Future<Map<String, dynamic>?> pickGpsPhoto(BuildContext context, ImageSource source) async {
  final picker = ImagePicker();
  final picked = await picker.pickImage(
    source: source,
    maxWidth: 1280,
    maxHeight: 1280,
    imageQuality: 80,
  );
  if (picked == null) return null;

  final serviceEnabled = await Geolocator.isLocationServiceEnabled();
  if (!serviceEnabled) {
    throw ApiException('Enable GPS location services on your device.');
  }

  var permission = await Geolocator.checkPermission();
  if (permission == LocationPermission.denied) {
    permission = await Geolocator.requestPermission();
  }
  if (permission == LocationPermission.denied || permission == LocationPermission.deniedForever) {
    throw ApiException('Location permission is required to tag the photo.');
  }

  final pos = await Geolocator.getCurrentPosition(
    locationSettings: const LocationSettings(
      accuracy: LocationAccuracy.high,
      timeLimit: Duration(seconds: 15),
    ),
  );

  final bytes = await picked.readAsBytes();
  final base64Str = base64Encode(bytes);
  return {
    'data': 'data:image/jpeg;base64,$base64Str',
    'latitude': pos.latitude,
    'longitude': pos.longitude,
    'accuracy': pos.accuracy,
    'capturedAt': DateTime.now().toUtc().toIso8601String(),
  };
}

class AppLogo extends StatelessWidget {
  final double size;
  final double borderRadius;

  const AppLogo({super.key, this.size = 44, this.borderRadius = 12});

  @override
  Widget build(BuildContext context) {
    return ClipRRect(
      borderRadius: BorderRadius.circular(borderRadius),
      child: Image.asset(
        'assets/images/logo.png',
        width: size,
        height: size,
        fit: BoxFit.cover,
      ),
    );
  }
}

class PasswordField extends StatefulWidget {
  final TextEditingController controller;
  final String label;
  final String? hint;
  final String? Function(String?)? validator;
  final TextInputAction textInputAction;

  const PasswordField({
    super.key,
    required this.controller,
    this.label = 'Password',
    this.hint,
    this.validator,
    this.textInputAction = TextInputAction.done,
  });

  @override
  State<PasswordField> createState() => _PasswordFieldState();
}

class _PasswordFieldState extends State<PasswordField> {
  bool _obscure = true;

  @override
  Widget build(BuildContext context) {
    return TextFormField(
      controller: widget.controller,
      obscureText: _obscure,
      textInputAction: widget.textInputAction,
      validator: widget.validator,
      decoration: InputDecoration(
        labelText: widget.label,
        hintText: widget.hint,
        suffixIcon: IconButton(
          onPressed: () => setState(() => _obscure = !_obscure),
          tooltip: _obscure ? 'Show password' : 'Hide password',
          icon: Icon(
            _obscure ? Icons.visibility_outlined : Icons.visibility_off_outlined,
            color: AppColors.textMuted,
          ),
        ),
      ),
    );
  }
}

class StatusBadge extends StatelessWidget {
  final String status;
  const StatusBadge({super.key, required this.status});

  @override
  Widget build(BuildContext context) {
    Color fg;
    Color bg;
    switch (status) {
      case 'In Progress':
        fg = AppColors.info;
        bg = AppColors.infoBg;
        break;
      case 'Resolved':
        fg = AppColors.success;
        bg = AppColors.successBg;
        break;
      case 'Failed':
      case 'Rejected':
        fg = AppColors.danger;
        bg = AppColors.dangerBg;
        break;
      default:
        fg = AppColors.warning;
        bg = AppColors.warningBg;
    }

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(
        color: bg,
        borderRadius: BorderRadius.circular(999),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(
            width: 6,
            height: 6,
            decoration: BoxDecoration(color: fg, shape: BoxShape.circle),
          ),
          const SizedBox(width: 6),
          Text(
            status,
            style: TextStyle(color: fg, fontSize: 12, fontWeight: FontWeight.w600),
          ),
        ],
      ),
    );
  }
}

class RoleBadge extends StatelessWidget {
  final String role;
  const RoleBadge({super.key, required this.role});

  @override
  Widget build(BuildContext context) {
    final label = role == 'admin' ? 'Admin' : role == 'staff' ? 'Staff' : 'Citizen';
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(
        color: AppColors.roleBg(role),
        borderRadius: BorderRadius.circular(999),
      ),
      child: Text(
        label,
        style: TextStyle(
          color: AppColors.roleColor(role),
          fontSize: 12,
          fontWeight: FontWeight.w600,
        ),
      ),
    );
  }
}

class StatCard extends StatelessWidget {
  final String label;
  final int value;
  final Color accent;
  final IconData? icon;

  const StatCard({
    super.key,
    required this.label,
    required this.value,
    this.accent = AppColors.primary,
    this.icon,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: AppColors.borderLight),
        boxShadow: const [
          BoxShadow(color: Color(0x0D0F172A), blurRadius: 8, offset: Offset(0, 2)),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Container(
                width: 30,
                height: 4,
                decoration: BoxDecoration(
                  color: accent,
                  borderRadius: BorderRadius.circular(4),
                ),
              ),
              if (icon != null)
                Container(
                  width: 30,
                  height: 30,
                  decoration: BoxDecoration(
                    color: accent.withValues(alpha: 0.12),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Icon(icon, size: 17, color: accent),
                ),
            ],
          ),
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                '$value',
                style: Theme.of(context).textTheme.headlineMedium?.copyWith(
                      fontSize: 25,
                      color: AppColors.textPrimary,
                    ),
              ),
              const SizedBox(height: 2),
              Text(
                label,
                style: Theme.of(context).textTheme.bodySmall?.copyWith(
                      color: AppColors.textSoft,
                      fontWeight: FontWeight.w600,
                    ),
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class StatusTracker extends StatelessWidget {
  final String status;
  final String? reason;
  const StatusTracker({super.key, required this.status, this.reason});

  @override
  Widget build(BuildContext context) {
    if (status == 'Failed' || status == 'Rejected') {
      return Container(
        width: double.infinity,
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: AppColors.dangerBg,
          borderRadius: BorderRadius.circular(10),
        ),
        child: Text(
          status == 'Failed'
              ? 'Resolution failed: ${reason?.isNotEmpty == true ? reason : 'Could not resolve complaint.'}'
              : 'Complaint rejected after review.',
          style: const TextStyle(color: AppColors.danger, fontWeight: FontWeight.w600),
        ),
      );
    }

    const steps = ['Submitted', 'In Progress', 'Resolved'];
    final current = status == 'Resolved' ? 2 : status == 'In Progress' ? 1 : 0;

    return Row(
      children: List.generate(steps.length, (index) {
        final isDone = index == 0 || index < current || status == 'Resolved';
        final isCurrent = !isDone && index == current;

        return Expanded(
          child: Column(
            children: [
              Row(
                children: [
                  if (index > 0)
                    Expanded(
                      child: Container(
                        height: 3,
                        color: (isDone || isCurrent) ? AppColors.primary : AppColors.border,
                      ),
                    )
                  else
                    const Expanded(child: SizedBox()),
                  Container(
                    width: 28,
                    height: 28,
                    alignment: Alignment.center,
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      color: isDone ? AppColors.primary : AppColors.surface,
                      border: Border.all(
                        color: (isDone || isCurrent) ? AppColors.primary : AppColors.border,
                        width: 2,
                      ),
                    ),
                    child: isDone
                        ? const Icon(Icons.check, size: 15, color: Colors.white)
                        : Text(
                            '${index + 1}',
                            style: TextStyle(
                              fontSize: 12,
                              fontWeight: FontWeight.w700,
                              color: isCurrent ? AppColors.primary : AppColors.textMuted,
                            ),
                          ),
                  ),
                  if (index < steps.length - 1)
                    Expanded(
                      child: Container(
                        height: 3,
                        color: index < current ? AppColors.primary : AppColors.border,
                      ),
                    )
                  else
                    const Expanded(child: SizedBox()),
                ],
              ),
              const SizedBox(height: 6),
              Text(
                steps[index],
                style: TextStyle(
                  fontSize: 12,
                  fontWeight: (isDone || isCurrent) ? FontWeight.w600 : FontWeight.w500,
                  color: (isDone || isCurrent) ? AppColors.navy : AppColors.textMuted,
                ),
              ),
            ],
          ),
        );
      }),
    );
  }
}

class EmptyBox extends StatelessWidget {
  final IconData icon;
  final String title;
  final String subtitle;

  const EmptyBox({
    super.key,
    required this.icon,
    required this.title,
    required this.subtitle,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.symmetric(vertical: 36, horizontal: 20),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: AppColors.border),
      ),
      child: Column(
        children: [
          Container(
            width: 48,
            height: 48,
            decoration: const BoxDecoration(
              color: AppColors.primarySoft,
              shape: BoxShape.circle,
            ),
            child: Icon(icon, color: AppColors.primary),
          ),
          const SizedBox(height: 12),
          Text(title, style: Theme.of(context).textTheme.titleMedium),
          const SizedBox(height: 4),
          Text(subtitle, style: Theme.of(context).textTheme.bodySmall, textAlign: TextAlign.center),
        ],
      ),
    );
  }
}

Future<void> showServerConfigSheet(BuildContext context) async {
  final controller = TextEditingController(text: ApiService.instance.baseUrl);
  String? statusMsg;
  bool testing = false;

  await showModalBottomSheet<void>(
    context: context,
    isScrollControlled: true,
    backgroundColor: AppColors.surface,
    shape: const RoundedRectangleBorder(
      borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
    ),
    builder: (ctx) {
      return StatefulBuilder(
        builder: (ctx, setModalState) {
          return Padding(
            padding: EdgeInsets.fromLTRB(
              20,
              20,
              20,
              MediaQuery.of(ctx).viewInsets.bottom + 24,
            ),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('Backend Server URL', style: Theme.of(ctx).textTheme.titleLarge),
                const SizedBox(height: 6),
                Text(
                  'Use your PC Wi-Fi IP or USB reverse port.',
                  style: Theme.of(ctx).textTheme.bodySmall,
                ),
                const SizedBox(height: 14),
                TextField(
                  controller: controller,
                  keyboardType: TextInputType.url,
                  decoration: const InputDecoration(
                    labelText: 'API URL',
                    hintText: 'http://192.168.1.3:5000/api',
                  ),
                ),
                const SizedBox(height: 10),
                Wrap(
                  spacing: 8,
                  runSpacing: 8,
                  children: [
                    ActionChip(
                      label: const Text('Wi-Fi (192.168.1.3)'),
                      onPressed: () => controller.text = 'http://192.168.1.3:5000/api',
                    ),
                    ActionChip(
                      label: const Text('USB ADB (127.0.0.1)'),
                      onPressed: () => controller.text = 'http://127.0.0.1:5000/api',
                    ),
                    ActionChip(
                      label: const Text('Emulator (10.0.2.2)'),
                      onPressed: () => controller.text = 'http://10.0.2.2:5000/api',
                    ),
                  ],
                ),
                if (statusMsg != null) ...[
                  const SizedBox(height: 10),
                  Text(
                    statusMsg!,
                    style: TextStyle(
                      fontSize: 13,
                      fontWeight: FontWeight.w600,
                      color: statusMsg!.startsWith('Connected')
                          ? AppColors.success
                          : AppColors.danger,
                    ),
                  ),
                ],
                const SizedBox(height: 16),
                Row(
                  children: [
                    Expanded(
                      child: OutlinedButton(
                        onPressed: testing
                            ? null
                            : () async {
                                setModalState(() {
                                  testing = true;
                                  statusMsg = null;
                                });
                                final ok = await ApiService.instance
                                    .testConnection(controller.text.trim());
                                setModalState(() {
                                  testing = false;
                                  statusMsg = ok
                                      ? 'Connected to backend API.'
                                      : 'Could not reach server.';
                                });
                              },
                        child: Text(testing ? 'Testing...' : 'Test'),
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: ElevatedButton(
                        onPressed: () async {
                          await ApiService.instance.setBaseUrl(controller.text);
                          if (ctx.mounted) Navigator.pop(ctx);
                        },
                        child: const Text('Save'),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          );
        },
      );
    },
  );
}
