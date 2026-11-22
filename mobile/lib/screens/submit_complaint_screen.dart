import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import '../services/api_service.dart';
import '../theme/app_theme.dart';
import '../widgets/common_widgets.dart';
import 'complaint_detail_screen.dart';

class SubmitComplaintScreen extends StatefulWidget {
  final VoidCallback? onSubmitted;
  const SubmitComplaintScreen({super.key, this.onSubmitted});

  @override
  State<SubmitComplaintScreen> createState() => _SubmitComplaintScreenState();
}

class _SubmitComplaintScreenState extends State<SubmitComplaintScreen> {
  final _formKey = GlobalKey<FormState>();
  final _title = TextEditingController();
  final _location = TextEditingController();
  final _description = TextEditingController();

  String _category = kCategories.first;
  Map<String, dynamic>? _photo;
  bool _pickingPhoto = false;
  bool _submitting = false;
  String? _error;

  Future<void> _attachPhoto(ImageSource source) async {
    setState(() {
      _pickingPhoto = true;
      _error = null;
    });

    try {
      final result = await pickGpsPhoto(context, source);
      if (result != null && mounted) {
        setState(() => _photo = result);
      }
    } catch (e) {
      if (mounted) setState(() => _error = e.toString());
    } finally {
      if (mounted) setState(() => _pickingPhoto = false);
    }
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() {
      _submitting = true;
      _error = null;
    });

    try {
      final res = await ApiService.instance.submitComplaint(
        title: _title.text,
        category: _category,
        location: _location.text,
        description: _description.text,
        photo: _photo,
      );
      _title.clear();
      _location.clear();
      _description.clear();
      setState(() => _photo = null);
      widget.onSubmitted?.call();

      if (!mounted) return;
      final created = res['complaint'] as Map<String, dynamic>?;
      final id = created?['_id'] as String?;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Complaint submitted successfully.')),
      );
      if (id != null) {
        Navigator.push(
          context,
          MaterialPageRoute(builder: (_) => ComplaintDetailScreen(complaintId: id)),
        );
      }
    } catch (e) {
      setState(() => _error = e.toString());
    } finally {
      if (mounted) setState(() => _submitting = false);
    }
  }

  @override
  void dispose() {
    _title.dispose();
    _location.dispose();
    _description.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Card(
        child: Padding(
          padding: const EdgeInsets.all(18),
          child: Form(
            key: _formKey,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Text('Report an issue', style: Theme.of(context).textTheme.titleLarge),
                const SizedBox(height: 4),
                Text(
                  'Provide location details and an optional GPS photo.',
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
                  const SizedBox(height: 14),
                ],
                TextFormField(
                  controller: _title,
                  maxLength: 150,
                  decoration: const InputDecoration(
                    labelText: 'Title',
                    hintText: 'Short summary of the issue',
                    counterText: '',
                  ),
                  validator: (v) => (v == null || v.trim().isEmpty) ? 'Enter a title' : null,
                ),
                const SizedBox(height: 14),
                DropdownButtonFormField<String>(
                  initialValue: _category,
                  decoration: const InputDecoration(labelText: 'Category'),
                  items: kCategories
                      .map((c) => DropdownMenuItem(value: c, child: Text(c)))
                      .toList(),
                  onChanged: (v) {
                    if (v != null) setState(() => _category = v);
                  },
                ),
                const SizedBox(height: 14),
                TextFormField(
                  controller: _location,
                  maxLength: 200,
                  decoration: const InputDecoration(
                    labelText: 'Area / Location',
                    hintText: 'e.g. MG Road near bus stop',
                    counterText: '',
                  ),
                  validator: (v) => (v == null || v.trim().isEmpty) ? 'Enter the location' : null,
                ),
                const SizedBox(height: 14),
                TextFormField(
                  controller: _description,
                  minLines: 4,
                  maxLines: 7,
                  maxLength: 5000,
                  decoration: const InputDecoration(
                    labelText: 'Description',
                    hintText: 'Describe what happened and since when',
                    alignLabelWithHint: true,
                  ),
                  validator: (v) =>
                      (v == null || v.trim().isEmpty) ? 'Enter a description' : null,
                ),
                const SizedBox(height: 12),
                Text('GPS Photo (optional)', style: Theme.of(context).textTheme.titleMedium?.copyWith(fontSize: 14)),
                const SizedBox(height: 8),
                if (_photo != null) ...[
                  ClipRRect(
                    borderRadius: BorderRadius.circular(10),
                    child: Image.memory(
                      base64Decode((_photo!['data'] as String).split(',').last),
                      height: 170,
                      width: double.infinity,
                      fit: BoxFit.cover,
                    ),
                  ),
                  const SizedBox(height: 8),
                  Row(
                    children: [
                      const Icon(Icons.location_on_outlined, size: 16, color: AppColors.success),
                      const SizedBox(width: 4),
                      Expanded(
                        child: Text(
                          '${(_photo!['latitude'] as num).toStringAsFixed(5)}, ${(_photo!['longitude'] as num).toStringAsFixed(5)}',
                          style: const TextStyle(
                            fontSize: 12.5,
                            fontWeight: FontWeight.w600,
                            color: AppColors.success,
                          ),
                        ),
                      ),
                      TextButton(
                        onPressed: () => setState(() => _photo = null),
                        child: const Text('Remove'),
                      ),
                    ],
                  ),
                ] else ...[
                  Row(
                    children: [
                      Expanded(
                        child: OutlinedButton.icon(
                          onPressed: _pickingPhoto ? null : () => _attachPhoto(ImageSource.camera),
                          icon: const Icon(Icons.camera_alt_outlined, size: 18),
                          label: Text(_pickingPhoto ? 'Locating...' : 'Camera'),
                        ),
                      ),
                      const SizedBox(width: 10),
                      Expanded(
                        child: OutlinedButton.icon(
                          onPressed: _pickingPhoto ? null : () => _attachPhoto(ImageSource.gallery),
                          icon: const Icon(Icons.photo_library_outlined, size: 18),
                          label: const Text('Gallery'),
                        ),
                      ),
                    ],
                  ),
                ],
                const SizedBox(height: 20),
                ElevatedButton(
                  onPressed: _submitting ? null : _submit,
                  child: Text(_submitting ? 'Submitting...' : 'Submit'),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
