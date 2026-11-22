import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../services/api_service.dart';
import '../theme/app_theme.dart';
import '../widgets/common_widgets.dart';

class ManageUsersScreen extends StatefulWidget {
  const ManageUsersScreen({super.key});

  @override
  State<ManageUsersScreen> createState() => _ManageUsersScreenState();
}

class _ManageUsersScreenState extends State<ManageUsersScreen> {
  List<Map<String, dynamic>> _users = [];
  bool _loading = true;
  String? _error;
  String _roleFilter = 'All';

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
      final list = await ApiService.instance.getUsers();
      if (mounted) setState(() => _users = list);
    } catch (e) {
      if (mounted) setState(() => _error = e.toString());
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _openAddStaff() async {
    final formKey = GlobalKey<FormState>();
    final userId = TextEditingController();
    final name = TextEditingController();
    final email = TextEditingController();
    final phone = TextEditingController();
    final password = TextEditingController();
    final selected = <String>{};
    bool saving = false;
    String? err;

    await showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      backgroundColor: AppColors.surface,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setModal) => Padding(
          padding: EdgeInsets.fromLTRB(
            20,
            20,
            20,
            MediaQuery.of(ctx).viewInsets.bottom + 24,
          ),
          child: SingleChildScrollView(
            child: Form(
              key: formKey,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text('Add staff member', style: Theme.of(ctx).textTheme.titleLarge),
                  const SizedBox(height: 14),
                  if (err != null) ...[
                    Text(err!, style: const TextStyle(color: AppColors.danger, fontSize: 13)),
                    const SizedBox(height: 10),
                  ],
                  TextFormField(
                    controller: userId,
                    textCapitalization: TextCapitalization.characters,
                    decoration: const InputDecoration(
                      labelText: 'Staff User ID (optional)',
                      hintText: 'Auto-assigned e.g. STAFF04',
                    ),
                  ),
                  const SizedBox(height: 12),
                  TextFormField(
                    controller: name,
                    decoration: const InputDecoration(labelText: 'Name'),
                    validator: (v) => (v == null || v.trim().isEmpty) ? 'Required' : null,
                  ),
                  const SizedBox(height: 12),
                  TextFormField(
                    controller: email,
                    keyboardType: TextInputType.emailAddress,
                    decoration: const InputDecoration(labelText: 'Email (for OTP reset)'),
                    validator: (v) => (v == null || !v.contains('@')) ? 'Valid email required' : null,
                  ),
                  const SizedBox(height: 12),
                  TextFormField(
                    controller: phone,
                    keyboardType: TextInputType.phone,
                    inputFormatters: [
                      FilteringTextInputFormatter.digitsOnly,
                      LengthLimitingTextInputFormatter(10),
                    ],
                    decoration: const InputDecoration(labelText: 'Phone (10 digits)'),
                    validator: (v) => (v == null || v.length != 10) ? '10 digits required' : null,
                  ),
                  const SizedBox(height: 12),
                  PasswordField(
                    controller: password,
                    validator: (v) => (v == null || v.length < 6) ? 'Min 6 chars' : null,
                  ),
                  const SizedBox(height: 14),
                  Text('Categories', style: Theme.of(ctx).textTheme.titleMedium?.copyWith(fontSize: 14)),
                  const SizedBox(height: 8),
                  Wrap(
                    spacing: 8,
                    runSpacing: 8,
                    children: kCategories.map((cat) {
                      final active = selected.contains(cat);
                      return FilterChip(
                        label: Text(cat),
                        selected: active,
                        onSelected: (v) => setModal(() {
                          if (v) {
                            selected.add(cat);
                          } else {
                            selected.remove(cat);
                          }
                        }),
                      );
                    }).toList(),
                  ),
                  const SizedBox(height: 18),
                  ElevatedButton(
                    onPressed: saving
                        ? null
                        : () async {
                            if (!formKey.currentState!.validate()) return;
                            if (selected.isEmpty) {
                              setModal(() => err = 'Select at least one category.');
                              return;
                            }
                            setModal(() {
                              saving = true;
                              err = null;
                            });
                            try {
                              final created = await ApiService.instance.createStaff(
                                userId: userId.text,
                                name: name.text,
                                email: email.text,
                                phone: phone.text,
                                password: password.text,
                                categories: selected.toList(),
                              );
                              if (mounted) setState(() => _users.insert(0, created));
                              if (ctx.mounted) Navigator.pop(ctx);
                            } catch (e) {
                              setModal(() {
                                saving = false;
                                err = e.toString();
                              });
                            }
                          },
                    child: Text(saving ? 'Creating...' : 'Create'),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }

  Future<void> _editUserRole(Map<String, dynamic> user) async {
    final selected = Set<String>.from((user['categories'] as List?) ?? []);
    bool saving = false;

    await showDialog<void>(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setDlg) => AlertDialog(
          title: Text('Manage ${user['name']}'),
          content: Wrap(
            spacing: 8,
            runSpacing: 8,
            children: kCategories.map((cat) {
              return FilterChip(
                label: Text(cat),
                selected: selected.contains(cat),
                onSelected: (v) => setDlg(() {
                  if (v) {
                    selected.add(cat);
                  } else {
                    selected.remove(cat);
                  }
                }),
              );
            }).toList(),
          ),
          actions: [
            if (user['role'] == 'staff')
              TextButton(
                onPressed: saving
                    ? null
                    : () async {
                        setDlg(() => saving = true);
                        try {
                          final updated = await ApiService.instance.updateUserRole(
                            userId: user['_id'] as String,
                            role: 'user',
                            categories: [],
                          );
                          if (mounted) {
                            setState(() {
                              final i = _users.indexWhere((u) => u['_id'] == updated['_id']);
                              if (i >= 0) _users[i] = updated;
                            });
                          }
                          if (ctx.mounted) Navigator.pop(ctx);
                        } finally {
                          if (ctx.mounted) setDlg(() => saving = false);
                        }
                      },
                child: const Text('Remove staff', style: TextStyle(color: AppColors.danger)),
              ),
            ElevatedButton(
              onPressed: saving || selected.isEmpty
                  ? null
                  : () async {
                      setDlg(() => saving = true);
                      try {
                        final updated = await ApiService.instance.updateUserRole(
                          userId: user['_id'] as String,
                          role: 'staff',
                          categories: selected.toList(),
                        );
                        if (mounted) {
                          setState(() {
                            final i = _users.indexWhere((u) => u['_id'] == updated['_id']);
                            if (i >= 0) _users[i] = updated;
                          });
                        }
                        if (ctx.mounted) Navigator.pop(ctx);
                      } finally {
                        if (ctx.mounted) setDlg(() => saving = false);
                      }
                    },
              child: const Text('Save'),
            ),
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final visible = _users
        .where((u) => _roleFilter == 'All' || u['role'] == _roleFilter)
        .toList();

    return Scaffold(
      body: RefreshIndicator(
        onRefresh: _load,
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text('Users & Staff', style: Theme.of(context).textTheme.headlineSmall),
                ElevatedButton.icon(
                  onPressed: _openAddStaff,
                  icon: const Icon(Icons.person_add_alt_1_outlined, size: 18),
                  label: const Text('Add staff'),
                ),
              ],
            ),
            const SizedBox(height: 12),
            SingleChildScrollView(
              scrollDirection: Axis.horizontal,
              child: Row(
                children: ['All', 'staff', 'user', 'admin'].map((r) {
                  final active = _roleFilter == r;
                  return Padding(
                    padding: const EdgeInsets.only(right: 8),
                    child: ChoiceChip(
                      label: Text(r == 'All' ? 'All' : r[0].toUpperCase() + r.substring(1)),
                      selected: active,
                      onSelected: (_) => setState(() => _roleFilter = r),
                    ),
                  );
                }).toList(),
              ),
            ),
            const SizedBox(height: 14),
            if (_loading)
              const Padding(
                padding: EdgeInsets.all(40),
                child: Center(child: CircularProgressIndicator()),
              )
            else if (_error != null)
              Text(_error!, style: const TextStyle(color: AppColors.danger))
            else if (visible.isEmpty)
              const EmptyBox(
                icon: Icons.people_outline,
                title: 'No accounts found',
                subtitle: 'No users match this filter.',
              )
            else
              ...visible.map((u) {
                final role = (u['role'] as String?) ?? 'user';
                final cats = ((u['categories'] as List?) ?? []).join(', ');
                return Padding(
                  padding: const EdgeInsets.only(bottom: 10),
                  child: Card(
                    child: ListTile(
                      contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
                      leading: CircleAvatar(
                        backgroundColor: AppColors.roleColor(role),
                        foregroundColor: Colors.white,
                        child: Text(userInitials(u['name'] as String?)),
                      ),
                      title: Row(
                        children: [
                          Expanded(
                            child: Text(
                              (u['name'] as String?) ?? '',
                              style: const TextStyle(fontWeight: FontWeight.w600),
                            ),
                          ),
                          RoleBadge(role: role),
                        ],
                      ),
                      subtitle: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          if ((u['userId'] as String? ?? '').isNotEmpty)
                            Text(
                              'User ID: ${u['userId']}',
                              style: const TextStyle(
                                color: AppColors.navy,
                                fontWeight: FontWeight.w700,
                                fontSize: 12.5,
                              ),
                            ),
                          Text('${u['email'] ?? ''} · ${u['phone'] ?? 'No phone'}'),
                          if (role == 'staff' && cats.isNotEmpty)
                            Text(
                              'Handles: $cats',
                              style: const TextStyle(
                                color: AppColors.roleStaff,
                                fontWeight: FontWeight.w600,
                                fontSize: 12,
                              ),
                            ),
                        ],
                      ),
                      trailing: role != 'admin'
                          ? Row(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                IconButton(
                                  tooltip: 'Edit role',
                                  icon: const Icon(Icons.edit_outlined),
                                  onPressed: () => _editUserRole(u),
                                ),
                                if (role == 'staff')
                                  IconButton(
                                    tooltip: 'Remove staff',
                                    icon: const Icon(Icons.delete_outline, color: AppColors.danger),
                                    onPressed: () async {
                                      final messenger = ScaffoldMessenger.of(context);
                                      try {
                                        await ApiService.instance.deleteStaff(u['_id'] as String);
                                        if (mounted) {
                                          setState(() => _users.removeWhere((x) => x['_id'] == u['_id']));
                                        }
                                      } catch (e) {
                                        if (mounted) {
                                          messenger.showSnackBar(
                                            SnackBar(content: Text(e.toString())),
                                          );
                                        }
                                      }
                                    },
                                  ),
                              ],
                            )
                          : null,
                    ),
                  ),
                );
              }),
          ],
        ),
      ),
    );
  }
}
