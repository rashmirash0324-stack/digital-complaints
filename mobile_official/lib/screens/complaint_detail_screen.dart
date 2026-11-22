import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:image_picker/image_picker.dart';
import '../services/api_service.dart';
import '../theme/app_theme.dart';
import '../widgets/common_widgets.dart';

class ComplaintDetailScreen extends StatefulWidget {
  final String complaintId;
  const ComplaintDetailScreen({super.key, required this.complaintId});

  @override
  State<ComplaintDetailScreen> createState() => _ComplaintDetailScreenState();
}

class _ComplaintDetailScreenState extends State<ComplaintDetailScreen> {
  Map<String, dynamic>? _complaint;
  Map<String, dynamic>? _citizenPhoto;
  Map<String, dynamic>? _reviewPhotoData;
  List<Map<String, dynamic>> _staffList = [];

  final _reviewNote = TextEditingController();
  final _reviewReason = TextEditingController();
  String _outcome = 'Succeeded';
  Map<String, dynamic>? _newReviewPhoto;

  bool _loading = true;
  bool _busy = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });

    try {
      final data = await ApiService.instance.getComplaint(widget.complaintId);
      _complaint = data;
      final review = data['review'] as Map<String, dynamic>?;
      _reviewNote.text = (review?['note'] as String?) ?? '';
      _reviewReason.text = (review?['reason'] as String?) ?? '';
      _outcome = (review?['outcome'] == 'Failed') ? 'Failed' : 'Succeeded';

      if (data['hasPhoto'] == true) {
        ApiService.instance
            .getComplaintPhoto(widget.complaintId, 'photo')
            .then((p) {
          if (mounted) setState(() => _citizenPhoto = p);
        }).catchError((_) {});
      }

      if (data['hasReviewPhoto'] == true) {
        ApiService.instance
            .getComplaintPhoto(widget.complaintId, 'review')
            .then((p) {
          if (mounted) setState(() => _reviewPhotoData = p);
        }).catchError((_) {});
      }

      if (ApiService.instance.isAdmin) {
        ApiService.instance.getStaff().then((list) {
          if (mounted) setState(() => _staffList = list);
        }).catchError((_) {});
      }
    } catch (e) {
      _error = e.toString();
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _updateStatus(String status) async {
    setState(() => _busy = true);
    try {
      final updated = await ApiService.instance.updateComplaintStatus(widget.complaintId, status);
      if (mounted) {
        setState(() => _complaint = updated);
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Status updated.')),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.toString())));
      }
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _assignStaff(String? staffId) async {
    setState(() => _busy = true);
    try {
      final updated = await ApiService.instance.assignComplaint(widget.complaintId, staffId);
      if (mounted) {
        setState(() => _complaint = updated);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(staffId == null ? 'Complaint unassigned.' : 'Staff assigned.')),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.toString())));
      }
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _pickReviewPhoto(ImageSource source) async {
    setState(() => _busy = true);
    try {
      final photo = await pickGpsPhoto(context, source);
      if (photo != null && mounted) setState(() => _newReviewPhoto = photo);
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.toString())));
      }
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _saveReview() async {
    if (_outcome == 'Succeeded' && _reviewNote.text.trim().isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Enter the resolution answer for the citizen.')),
      );
      return;
    }
    if (_outcome == 'Failed' && _reviewReason.text.trim().isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Provide the reason why resolution failed.')),
      );
      return;
    }

    setState(() => _busy = true);
    try {
      final updated = await ApiService.instance.reviewComplaint(
        id: widget.complaintId,
        outcome: _outcome,
        note: _reviewNote.text,
        reason: _reviewReason.text.trim().isNotEmpty ? _reviewReason.text : _reviewNote.text,
        photo: _newReviewPhoto,
      );
      if (mounted) {
        setState(() {
          _complaint = updated;
          _newReviewPhoto = null;
        });
        if (updated['hasReviewPhoto'] == true) {
          final p = await ApiService.instance.getComplaintPhoto(widget.complaintId, 'review');
          if (mounted) setState(() => _reviewPhotoData = p);
        }
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text(
                _outcome == 'Succeeded'
                    ? 'Marked Succeeded & answer sent to citizen.'
                    : 'Marked Failed & reason reported to admin.',
              ),
            ),
          );
        }
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.toString())));
      }
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  void dispose() {
    _reviewNote.dispose();
    _reviewReason.dispose();
    super.dispose();
  }

  Widget _photoCard(Map<String, dynamic> photo, String caption) {
    final raw = (photo['data'] as String?) ?? '';
    final bytes = raw.contains(',') ? base64Decode(raw.split(',').last) : null;
    final lat = photo['latitude'] as num?;
    final lng = photo['longitude'] as num?;

    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: AppColors.surfaceAlt,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppColors.border),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          if (bytes != null)
            ClipRRect(
              borderRadius: BorderRadius.circular(8),
              child: Image.memory(bytes, height: 190, width: double.infinity, fit: BoxFit.cover),
            ),
          const SizedBox(height: 8),
          Text(caption, style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 13)),
          if (lat != null && lng != null) ...[
            const SizedBox(height: 4),
            InkWell(
              onTap: () => openGoogleMaps(lat, lng),
              child: Row(
                children: [
                  const Icon(Icons.map_outlined, size: 16, color: AppColors.primary),
                  const SizedBox(width: 6),
                  Text(
                    '${lat.toStringAsFixed(5)}, ${lng.toStringAsFixed(5)} · Open Maps',
                    style: const TextStyle(
                      color: AppColors.primary,
                      fontWeight: FontWeight.w600,
                      fontSize: 13,
                    ),
                  ),
                ],
              ),
            ),
          ],
          const SizedBox(height: 2),
          Text(
            'Taken ${formatDateTime(photo['capturedAt'] as String?)}',
            style: Theme.of(context).textTheme.bodySmall,
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final isAdmin = ApiService.instance.isAdmin;
    final isStaff = ApiService.instance.isStaff;
    final isOfficial = ApiService.instance.isOfficial;

    return Scaffold(
      appBar: AppBar(title: const Text('Complaint details')),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : _error != null || _complaint == null
              ? Center(
                  child: Padding(
                    padding: const EdgeInsets.all(20),
                    child: Text(_error ?? 'Complaint not found.'),
                  ),
                )
              : RefreshIndicator(
                  onRefresh: _load,
                  child: SingleChildScrollView(
                    physics: const AlwaysScrollableScrollPhysics(),
                    padding: const EdgeInsets.all(16),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      children: [
                        Card(
                          child: Padding(
                            padding: const EdgeInsets.all(18),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Row(
                                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                  children: [
                                    Container(
                                      padding: const EdgeInsets.symmetric(
                                        horizontal: 10,
                                        vertical: 4,
                                      ),
                                      decoration: BoxDecoration(
                                        color: AppColors.surfaceAlt,
                                        borderRadius: BorderRadius.circular(999),
                                      ),
                                      child: Text(
                                        (_complaint!['category'] as String?) ?? '',
                                        style: const TextStyle(
                                          fontSize: 12,
                                          fontWeight: FontWeight.w600,
                                        ),
                                      ),
                                    ),
                                    StatusBadge(
                                      status: (_complaint!['status'] as String?) ?? 'Pending',
                                    ),
                                  ],
                                ),
                                const SizedBox(height: 12),
                                Text(
                                  (_complaint!['title'] as String?) ?? '',
                                  style: Theme.of(context).textTheme.titleLarge,
                                ),
                                const SizedBox(height: 12),
                                Row(
                                  children: [
                                    Text(
                                      'ID: ${shortId(_complaint!['_id'] as String?)}',
                                      style: Theme.of(context).textTheme.bodySmall,
                                    ),
                                    const SizedBox(width: 8),
                                    InkWell(
                                      onTap: () {
                                        Clipboard.setData(
                                          ClipboardData(text: _complaint!['_id'] as String),
                                        );
                                        ScaffoldMessenger.of(context).showSnackBar(
                                          const SnackBar(content: Text('Full ID copied.')),
                                        );
                                      },
                                      child: const Text(
                                        'Copy full ID',
                                        style: TextStyle(
                                          fontSize: 12.5,
                                          fontWeight: FontWeight.w600,
                                          color: AppColors.primary,
                                        ),
                                      ),
                                    ),
                                  ],
                                ),
                                const SizedBox(height: 6),
                                if ((_complaint!['location'] as String? ?? '').isNotEmpty)
                                  Text(
                                    'Area: ${_complaint!['location']}',
                                    style: Theme.of(context).textTheme.bodySmall,
                                  ),
                                Text(
                                  'Submitted: ${formatDateTime(_complaint!['createdAt'] as String?)}',
                                  style: Theme.of(context).textTheme.bodySmall,
                                ),
                                if (_complaint!['assignedTo'] is Map) ...[
                                  const SizedBox(height: 4),
                                  Text(
                                    'Assigned staff: ${(_complaint!['assignedTo'] as Map)['name']}',
                                    style: const TextStyle(
                                      fontSize: 13,
                                      fontWeight: FontWeight.w600,
                                      color: AppColors.navy,
                                    ),
                                  ),
                                ],
                                if (isOfficial && _complaint!['user'] is Map) ...[
                                  const SizedBox(height: 4),
                                  Text(
                                    'Citizen: ${(_complaint!['user'] as Map)['name']} (${(_complaint!['user'] as Map)['phone'] ?? ''})',
                                    style: Theme.of(context).textTheme.bodySmall,
                                  ),
                                ],
                                const Divider(height: 28),
                                Text('Progress', style: Theme.of(context).textTheme.titleMedium),
                                const SizedBox(height: 12),
                                StatusTracker(
                                  status: (_complaint!['status'] as String?) ?? 'Pending',
                                  reason: (_complaint!['review'] is Map)
                                      ? ((_complaint!['review'] as Map)['reason'] as String?)
                                      : null,
                                ),
                                const Divider(height: 28),
                                Text('Description', style: Theme.of(context).textTheme.titleMedium),
                                const SizedBox(height: 6),
                                Text(
                                  (_complaint!['description'] as String?) ?? '',
                                  style: Theme.of(context).textTheme.bodyLarge,
                                ),
                                if (_citizenPhoto != null) ...[
                                  const SizedBox(height: 18),
                                  _photoCard(_citizenPhoto!, 'Citizen photo evidence'),
                                ],
                                if (_complaint!['review'] is Map) ...[
                                  const Divider(height: 28),
                                  Text('Resolution report', style: Theme.of(context).textTheme.titleMedium),
                                  const SizedBox(height: 8),
                                  Builder(
                                    builder: (context) {
                                      final rev = _complaint!['review'] as Map;
                                      final failed = _complaint!['status'] == 'Failed' || rev['outcome'] == 'Failed';
                                      return Container(
                                        width: double.infinity,
                                        padding: const EdgeInsets.all(14),
                                        decoration: BoxDecoration(
                                          color: failed ? AppColors.dangerBg : AppColors.successBg,
                                          borderRadius: BorderRadius.circular(10),
                                          border: Border.all(
                                            color: failed ? AppColors.danger : AppColors.success,
                                          ),
                                        ),
                                        child: Column(
                                          crossAxisAlignment: CrossAxisAlignment.start,
                                          children: [
                                            Text(
                                              failed ? 'Resolution Failed' : 'Resolution Succeeded',
                                              style: TextStyle(
                                                fontWeight: FontWeight.w700,
                                                color: failed ? AppColors.danger : AppColors.success,
                                              ),
                                            ),
                                            if ((rev['note'] as String? ?? '').isNotEmpty) ...[
                                              const SizedBox(height: 6),
                                              Text(
                                                'Answer: ${rev['note']}',
                                                style: Theme.of(context).textTheme.bodyLarge,
                                              ),
                                            ],
                                            if ((rev['reason'] as String? ?? '').isNotEmpty &&
                                                (isOfficial || failed)) ...[
                                              const SizedBox(height: 4),
                                              Text(
                                                'Reason: ${rev['reason']}',
                                                style: Theme.of(context).textTheme.bodyMedium,
                                              ),
                                            ],
                                            if (_reviewPhotoData != null) ...[
                                              const SizedBox(height: 10),
                                              _photoCard(_reviewPhotoData!, 'Staff site photo'),
                                            ],
                                            const SizedBox(height: 6),
                                            Text(
                                              'Handled by ${rev['reviewerName'] ?? 'Staff'} · ${formatDateTime(rev['reviewedAt'] as String?)}',
                                              style: Theme.of(context).textTheme.bodySmall,
                                            ),
                                          ],
                                        ),
                                      );
                                    },
                                  ),
                                ],
                                const SizedBox(height: 18),
                                Wrap(
                                  spacing: 10,
                                  runSpacing: 10,
                                  children: [
                                    ElevatedButton.icon(
                                      style: ElevatedButton.styleFrom(
                                        backgroundColor: AppColors.whatsapp,
                                      ),
                                      onPressed: () => openWhatsApp(
                                        message:
                                            'Hello, contacting about complaint ${shortId(_complaint!['_id'] as String?)} (${_complaint!['title']}).',
                                      ),
                                      icon: const Icon(Icons.chat_outlined, size: 18),
                                      label: const Text('WhatsApp Support'),
                                    ),
                                    if (isOfficial &&
                                        _complaint!['user'] is Map &&
                                        ((_complaint!['user'] as Map)['phone'] as String? ?? '')
                                            .isNotEmpty)
                                      OutlinedButton.icon(
                                        onPressed: () => openWhatsApp(
                                          number: (_complaint!['user'] as Map)['phone'] as String,
                                          message:
                                              'Update on your complaint ${shortId(_complaint!['_id'] as String?)}: Status is ${_complaint!['status']}.',
                                        ),
                                        icon: const Icon(Icons.phone_outlined, size: 18),
                                        label: const Text('WhatsApp Citizen'),
                                      ),
                                  ],
                                ),
                              ],
                            ),
                          ),
                        ),
                        if (isAdmin) ...[
                          const SizedBox(height: 14),
                          Card(
                            child: Padding(
                              padding: const EdgeInsets.all(18),
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.stretch,
                                children: [
                                  Text('Assign staff', style: Theme.of(context).textTheme.titleMedium),
                                  const SizedBox(height: 10),
                                  DropdownButtonFormField<String>(
                                    initialValue: (_complaint!['assignedTo'] is Map)
                                        ? (_complaint!['assignedTo'] as Map)['_id'] as String?
                                        : null,
                                    decoration: const InputDecoration(labelText: 'Staff member'),
                                    items: [
                                      const DropdownMenuItem(value: null, child: Text('Unassigned')),
                                      ..._staffList.map(
                                        (s) => DropdownMenuItem(
                                          value: s['_id'] as String,
                                          child: Text(
                                            '${s['name']} (${((s['categories'] as List?) ?? []).join(', ')})',
                                            overflow: TextOverflow.ellipsis,
                                          ),
                                        ),
                                      ),
                                    ],
                                    onChanged: _busy ? null : _assignStaff,
                                  ),
                                ],
                              ),
                            ),
                          ),
                        ],
                        if (isStaff) ...[
                          const SizedBox(height: 14),
                          Card(
                            child: Padding(
                              padding: const EdgeInsets.all(18),
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.stretch,
                                children: [
                                  Text('Update status', style: Theme.of(context).textTheme.titleMedium),
                                  const SizedBox(height: 10),
                                  DropdownButtonFormField<String>(
                                    initialValue: _complaint!['status'] as String,
                                    items: kStatuses
                                        .map((st) => DropdownMenuItem(value: st, child: Text(st)))
                                        .toList(),
                                    onChanged: _busy
                                        ? null
                                        : (v) {
                                            if (v != null) _updateStatus(v);
                                          },
                                  ),
                                ],
                              ),
                            ),
                          ),
                          const SizedBox(height: 14),
                          Card(
                            child: Padding(
                              padding: const EdgeInsets.all(18),
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.stretch,
                                children: [
                                  Text('Resolve & send response', style: Theme.of(context).textTheme.titleMedium),
                                  const SizedBox(height: 10),
                                  SegmentedButton<String>(
                                    segments: const [
                                      ButtonSegment(
                                        value: 'Succeeded',
                                        label: Text('Succeeded'),
                                        icon: Icon(Icons.check_circle_outline),
                                      ),
                                      ButtonSegment(
                                        value: 'Failed',
                                        label: Text('Failed'),
                                        icon: Icon(Icons.error_outline),
                                      ),
                                    ],
                                    selected: {_outcome},
                                    onSelectionChanged: (s) => setState(() => _outcome = s.first),
                                  ),
                                  const SizedBox(height: 12),
                                  TextField(
                                    controller: _reviewNote,
                                    minLines: 2,
                                    maxLines: 4,
                                    decoration: InputDecoration(
                                      labelText: _outcome == 'Succeeded'
                                          ? 'Resolution answer for citizen (required)'
                                          : 'Answer for citizen (optional)',
                                      hintText: 'Explain what action was taken',
                                    ),
                                  ),
                                  const SizedBox(height: 12),
                                  TextField(
                                    controller: _reviewReason,
                                    minLines: 2,
                                    maxLines: 4,
                                    decoration: InputDecoration(
                                      labelText: _outcome == 'Failed'
                                          ? 'Failure reason for admin (required)'
                                          : 'Admin summary / reason (optional)',
                                      hintText: 'Why resolution succeeded or failed',
                                    ),
                                  ),
                                  const SizedBox(height: 12),
                                  if (_newReviewPhoto != null) ...[
                                    const Text(
                                      'Site photo attached (GPS tagged)',
                                      style: TextStyle(
                                        color: AppColors.success,
                                        fontWeight: FontWeight.w600,
                                        fontSize: 13,
                                      ),
                                    ),
                                    const SizedBox(height: 8),
                                  ],
                                  Row(
                                    children: [
                                      Expanded(
                                        child: OutlinedButton.icon(
                                          onPressed: _busy
                                              ? null
                                              : () => _pickReviewPhoto(ImageSource.camera),
                                          icon: const Icon(Icons.camera_alt_outlined, size: 18),
                                          label: const Text('Site photo'),
                                        ),
                                      ),
                                      const SizedBox(width: 10),
                                      Expanded(
                                        child: OutlinedButton.icon(
                                          onPressed: _busy
                                              ? null
                                              : () => _pickReviewPhoto(ImageSource.gallery),
                                          icon: const Icon(Icons.photo_outlined, size: 18),
                                          label: const Text('Gallery'),
                                        ),
                                      ),
                                    ],
                                  ),
                                  const SizedBox(height: 16),
                                  ElevatedButton(
                                    onPressed: _busy ? null : _saveReview,
                                    child: Text(_busy ? 'Submitting...' : 'Submit resolution'),
                                  ),
                                ],
                              ),
                            ),
                          ),
                        ],
                      ],
                    ),
                  ),
                ),
    );
  }
}
