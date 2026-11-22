import 'package:flutter/material.dart';
import '../services/api_service.dart';
import '../theme/app_theme.dart';
import '../widgets/common_widgets.dart';

class FeedbackScreen extends StatefulWidget {
  const FeedbackScreen({super.key});

  @override
  State<FeedbackScreen> createState() => _FeedbackScreenState();
}

class _FeedbackScreenState extends State<FeedbackScreen> {
  final _message = TextEditingController();
  int _rating = 0;
  bool _loading = false;
  List<Map<String, dynamic>> _items = [];
  String? _error;

  @override
  void initState() {
    super.initState();
    if (ApiService.instance.isAdmin) _loadFeedback();
  }

  Future<void> _loadFeedback() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final list = await ApiService.instance.getFeedback();
      if (mounted) setState(() => _items = list);
    } catch (e) {
      if (mounted) setState(() => _error = e.toString());
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _submit() async {
    if (_rating == 0) {
      setState(() => _error = 'Choose a rating from 1 to 5 stars.');
      return;
    }
    if (_message.text.trim().isEmpty) {
      setState(() => _error = 'Enter your feedback message.');
      return;
    }

    setState(() {
      _loading = true;
      _error = null;
    });

    try {
      await ApiService.instance.submitFeedback(message: _message.text, rating: _rating);
      _message.clear();
      setState(() => _rating = 0);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Feedback submitted. Thank you!')),
        );
      }
    } catch (e) {
      setState(() => _error = e.toString());
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  void dispose() {
    _message.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final isAdmin = ApiService.instance.isAdmin;

    return Scaffold(
      appBar: AppBar(title: Text(isAdmin ? 'User feedback' : 'Share feedback')),
      body: isAdmin
          ? _loading
              ? const Center(child: CircularProgressIndicator())
              : _error != null
                  ? Center(child: Text(_error!))
                  : _items.isEmpty
                      ? const Padding(
                          padding: EdgeInsets.all(20),
                          child: EmptyBox(
                            icon: Icons.rate_review_outlined,
                            title: 'No feedback yet',
                            subtitle: 'Citizen ratings and reviews will appear here.',
                          ),
                        )
                      : RefreshIndicator(
                          onRefresh: _loadFeedback,
                          child: ListView.separated(
                            padding: const EdgeInsets.all(16),
                            itemCount: _items.length,
                            separatorBuilder: (_, _) => const SizedBox(height: 12),
                            itemBuilder: (_, i) {
                              final item = _items[i];
                              final user = item['user'] as Map<String, dynamic>?;
                              final rating = (item['rating'] as num?)?.toInt() ?? 0;
                              return Card(
                                child: Padding(
                                  padding: const EdgeInsets.all(16),
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      Row(
                                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                        children: [
                                          Text(
                                            (user?['name'] as String?) ?? 'Citizen',
                                            style: const TextStyle(fontWeight: FontWeight.w700),
                                          ),
                                          Row(
                                            children: List.generate(
                                              5,
                                              (idx) => Icon(
                                                idx < rating ? Icons.star : Icons.star_border,
                                                size: 18,
                                                color: Colors.amber.shade700,
                                              ),
                                            ),
                                          ),
                                        ],
                                      ),
                                      const SizedBox(height: 6),
                                      Text((item['message'] as String?) ?? ''),
                                      const SizedBox(height: 6),
                                      Text(
                                        formatDate(item['createdAt'] as String?),
                                        style: Theme.of(context).textTheme.bodySmall,
                                      ),
                                    ],
                                  ),
                                ),
                              );
                            },
                          ),
                        )
          : SingleChildScrollView(
              padding: const EdgeInsets.all(16),
              child: Card(
                child: Padding(
                  padding: const EdgeInsets.all(18),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      Text('Rate our service', style: Theme.of(context).textTheme.titleMedium),
                      const SizedBox(height: 8),
                      Row(
                        children: List.generate(
                          5,
                          (i) => IconButton(
                            onPressed: () => setState(() => _rating = i + 1),
                            icon: Icon(
                              i < _rating ? Icons.star : Icons.star_border,
                              size: 32,
                              color: i < _rating ? Colors.amber.shade700 : AppColors.textMuted,
                            ),
                          ),
                        ),
                      ),
                      const SizedBox(height: 12),
                      if (_error != null) ...[
                        Text(_error!, style: const TextStyle(color: AppColors.danger, fontSize: 13)),
                        const SizedBox(height: 10),
                      ],
                      TextField(
                        controller: _message,
                        minLines: 4,
                        maxLines: 6,
                        maxLength: 2000,
                        decoration: const InputDecoration(
                          labelText: 'Your feedback',
                          hintText: 'Share what worked well or what needs improvement',
                          alignLabelWithHint: true,
                        ),
                      ),
                      const SizedBox(height: 16),
                      ElevatedButton(
                        onPressed: _loading ? null : _submit,
                        child: Text(_loading ? 'Sending...' : 'Submit'),
                      ),
                    ],
                  ),
                ),
              ),
            ),
    );
  }
}
