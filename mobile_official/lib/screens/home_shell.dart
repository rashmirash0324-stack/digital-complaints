import 'package:flutter/material.dart';
import '../services/api_service.dart';
import '../theme/app_theme.dart';
import '../widgets/common_widgets.dart';
import 'auth_screens.dart';
import 'complaint_detail_screen.dart';
import 'feedback_screen.dart';
import 'manage_users_screen.dart';
import 'submit_complaint_screen.dart';

class HomeShell extends StatefulWidget {
  const HomeShell({super.key});

  @override
  State<HomeShell> createState() => _HomeShellState();
}

class _HomeShellState extends State<HomeShell> {
  int _index = 0;
  List<Map<String, dynamic>> _complaints = [];
  bool _loading = true;
  String? _error;

  String _search = '';
  String _statusFilter = 'All';
  String _categoryFilter = 'All';

  @override
  void initState() {
    super.initState();
    _loadComplaints();
  }

  Future<void> _loadComplaints() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final list = await ApiService.instance.getComplaints();
      if (mounted) setState(() => _complaints = list);
    } on ApiException catch (e) {
      if (e.statusCode == 401 && mounted) {
        _goToLogin();
        return;
      }
      if (mounted) setState(() => _error = e.message);
    } catch (e) {
      if (mounted) setState(() => _error = e.toString());
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  void _goToLogin() {
    Navigator.of(context).pushAndRemoveUntil(
      MaterialPageRoute(builder: (_) => const LoginScreen()),
      (_) => false,
    );
  }

  Future<void> _logout() async {
    await ApiService.instance.logout();
    if (mounted) _goToLogin();
  }

  int _count(String status) => _complaints.where((c) => c['status'] == status).length;

  Future<void> _openTrackDialog() async {
    final controller = TextEditingController();
    await showDialog<void>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Track complaint'),
        content: TextField(
          controller: controller,
          decoration: const InputDecoration(
            labelText: '24-character Complaint ID',
            hintText: 'Paste full complaint ID',
          ),
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Cancel')),
          ElevatedButton(
            onPressed: () {
              final id = controller.text.trim();
              if (!RegExp(r'^[a-fA-F0-9]{24}$').hasMatch(id)) {
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(content: Text('Enter a valid 24-character hex ID.')),
                );
                return;
              }
              Navigator.pop(ctx);
              Navigator.push(
                context,
                MaterialPageRoute(builder: (_) => ComplaintDetailScreen(complaintId: id)),
              );
            },
            child: const Text('Track'),
          ),
        ],
      ),
    );
  }

  Widget _buildOverviewTab() {
    final user = ApiService.instance.user;
    final isAdmin = ApiService.instance.isAdmin;
    final isStaff = ApiService.instance.isStaff;
    final firstName = ((user?['name'] as String?) ?? 'User').split(' ').first;
    final recent = _complaints.take(5).toList();
    final unassigned = _complaints
        .where((c) => c['assignedTo'] == null && (c['status'] == 'Pending' || c['status'] == 'In Progress'))
        .toList();
    final outcomes = _complaints
        .where((c) => c['status'] == 'Resolved' || c['status'] == 'Failed')
        .toList();

    return RefreshIndicator(
      onRefresh: _loadComplaints,
      child: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          Container(
            padding: const EdgeInsets.all(18),
            decoration: BoxDecoration(
              color: AppColors.navy,
              borderRadius: BorderRadius.circular(16),
            ),
            child: Row(
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        isAdmin
                            ? 'Admin Dashboard'
                            : isStaff
                                ? 'Staff Dashboard'
                                : 'Welcome, $firstName',
                        style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                              color: Colors.white,
                            ),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        isAdmin
                            ? 'Assign staff and track resolution outcomes.'
                            : isStaff
                                ? 'Resolve assigned complaints and reply to citizens.'
                                : 'File complaints and view staff replies.',
                        style: Theme.of(context).textTheme.bodySmall?.copyWith(
                              color: Colors.white.withValues(alpha: 0.84),
                            ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(width: 10),
                RoleBadge(role: ApiService.instance.role),
              ],
            ),
          ),
          const SizedBox(height: 16),
          if (_error != null) ...[
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: AppColors.dangerBg,
                borderRadius: BorderRadius.circular(10),
                border: Border.all(color: AppColors.danger.withValues(alpha: 0.3)),
              ),
              child: Text(_error!, style: const TextStyle(color: AppColors.danger, fontSize: 13, fontWeight: FontWeight.w500)),
            ),
            const SizedBox(height: 14),
          ],
          GridView.count(
            crossAxisCount: 2,
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            mainAxisSpacing: 12,
            crossAxisSpacing: 12,
            childAspectRatio: 1.38,
            children: isAdmin
                ? [
                    StatCard(label: 'Needs staff', value: unassigned.length, accent: AppColors.warning, icon: Icons.assignment_late_outlined),
                    StatCard(label: 'In progress', value: _count('In Progress'), accent: AppColors.info, icon: Icons.pending_actions_outlined),
                    StatCard(label: 'Succeeded', value: _count('Resolved'), accent: AppColors.success, icon: Icons.check_circle_outline),
                    StatCard(label: 'Failed', value: _count('Failed'), accent: AppColors.danger, icon: Icons.error_outline),
                  ]
                : [
                    StatCard(label: 'Total', value: _complaints.length, accent: AppColors.navy, icon: Icons.folder_outlined),
                    StatCard(label: 'In progress', value: _count('In Progress') + _count('Pending'), accent: AppColors.info, icon: Icons.pending_actions_outlined),
                    StatCard(label: 'Succeeded', value: _count('Resolved'), accent: AppColors.success, icon: Icons.check_circle_outline),
                    StatCard(label: 'Failed', value: _count('Failed'), accent: AppColors.danger, icon: Icons.error_outline),
                  ],
          ),
          const SizedBox(height: 18),
          if (!ApiService.instance.isOfficial) ...[
            Row(
              children: [
                Expanded(
                  child: ElevatedButton.icon(
                    onPressed: () => setState(() => _index = 1),
                    icon: const Icon(Icons.add_circle_outline, size: 18),
                    label: const Text('Submit'),
                  ),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: OutlinedButton.icon(
                    onPressed: _openTrackDialog,
                    icon: const Icon(Icons.search, size: 18),
                    label: const Text('Track ID'),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 18),
          ],
          if (isAdmin && unassigned.isNotEmpty) ...[
            Text('Incoming to assign (${unassigned.length})', style: Theme.of(context).textTheme.titleMedium),
            const SizedBox(height: 8),
            ...unassigned.take(4).map(_buildComplaintTile),
            const SizedBox(height: 12),
          ],
          if (isAdmin && outcomes.isNotEmpty) ...[
            Text('Resolution outcomes (${outcomes.length})', style: Theme.of(context).textTheme.titleMedium),
            const SizedBox(height: 8),
            ...outcomes.take(5).map((c) {
              final failed = c['status'] == 'Failed';
              final rev = c['review'] as Map<String, dynamic>?;
              return Padding(
                padding: const EdgeInsets.only(bottom: 10),
                child: Card(
                  child: ListTile(
                    onTap: () async {
                      await Navigator.push(
                        context,
                        MaterialPageRoute(
                          builder: (_) => ComplaintDetailScreen(complaintId: c['_id'] as String),
                        ),
                      );
                      _loadComplaints();
                    },
                    title: Row(
                      children: [
                        Expanded(
                          child: Text(
                            (c['title'] as String?) ?? '',
                            style: const TextStyle(fontWeight: FontWeight.w600),
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                          ),
                        ),
                        const SizedBox(width: 8),
                        StatusBadge(status: failed ? 'Failed' : 'Resolved'),
                      ],
                    ),
                    subtitle: Padding(
                      padding: const EdgeInsets.only(top: 4),
                      child: Text(
                        'Reason: ${(rev?['reason'] as String?) ?? (rev?['note'] as String?) ?? '—'}',
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                  ),
                ),
              );
            }),
            const SizedBox(height: 12),
          ],
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                isStaff ? 'Assigned to you' : 'Recent complaints',
                style: Theme.of(context).textTheme.titleMedium,
              ),
              TextButton(
                onPressed: () => setState(() => _index = ApiService.instance.isOfficial ? 1 : 2),
                child: const Text('View all'),
              ),
            ],
          ),
          const SizedBox(height: 6),
          if (_loading)
            const Padding(
              padding: EdgeInsets.all(32),
              child: Center(child: CircularProgressIndicator()),
            )
          else if (recent.isEmpty)
            EmptyBox(
              icon: Icons.inbox_outlined,
              title: isStaff ? 'No assigned complaints' : 'No complaints yet',
              subtitle: isStaff
                  ? 'Complaints assigned by admin will appear here.'
                  : 'Complaints will appear here once submitted.',
            )
          else
            ...recent.map(_buildComplaintTile),
        ],
      ),
    );
  }

  Widget _buildComplaintTile(Map<String, dynamic> c) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 10),
      child: Card(
        child: InkWell(
          borderRadius: BorderRadius.circular(14),
          onTap: () async {
            await Navigator.push(
              context,
              MaterialPageRoute(
                builder: (_) => ComplaintDetailScreen(complaintId: c['_id'] as String),
              ),
            );
            _loadComplaints();
          },
          child: Padding(
            padding: const EdgeInsets.all(14),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 3),
                      decoration: BoxDecoration(
                        color: AppColors.surfaceAlt,
                        borderRadius: BorderRadius.circular(999),
                      ),
                      child: Text(
                        (c['category'] as String?) ?? '',
                        style: const TextStyle(fontSize: 11.5, fontWeight: FontWeight.w600),
                      ),
                    ),
                    StatusBadge(status: (c['status'] as String?) ?? 'Pending'),
                  ],
                ),
                const SizedBox(height: 8),
                Text(
                  (c['title'] as String?) ?? '',
                  style: Theme.of(context).textTheme.titleMedium,
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                ),
                if ((c['location'] as String? ?? '').isNotEmpty) ...[
                  const SizedBox(height: 4),
                  Text(
                    c['location'] as String,
                    style: Theme.of(context).textTheme.bodySmall,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                ],
                if (ApiService.instance.isOfficial && c['user'] is Map) ...[
                  const SizedBox(height: 4),
                  Text(
                    'Citizen: ${(c['user'] as Map)['name'] ?? ''} · ${(c['user'] as Map)['phone'] ?? ''}',
                    style: const TextStyle(fontSize: 12.5, fontWeight: FontWeight.w500, color: AppColors.navy),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                ],
                if (c['review'] is Map && ((c['review'] as Map)['note'] as String? ?? '').isNotEmpty) ...[
                  const SizedBox(height: 4),
                  Text(
                    'Reply: ${(c['review'] as Map)['note']}',
                    style: const TextStyle(fontSize: 12.5, color: AppColors.primary, fontWeight: FontWeight.w500),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                ],
                const SizedBox(height: 8),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(
                      '${shortId(c['_id'] as String?)} · ${formatDate(c['createdAt'] as String?)}',
                      style: Theme.of(context).textTheme.bodySmall,
                    ),
                    Row(
                      children: [
                        if (c['hasPhoto'] == true)
                          const Icon(Icons.photo_camera_outlined, size: 15, color: AppColors.success),
                        if (c['hasReviewPhoto'] == true) ...[
                          const SizedBox(width: 6),
                          const Icon(Icons.verified_outlined, size: 15, color: AppColors.primary),
                        ],
                      ],
                    ),
                  ],
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildComplaintsTab() {
    final term = _search.trim().toLowerCase();
    final filtered = _complaints.where((c) {
      final matchesStatus = _statusFilter == 'All' || c['status'] == _statusFilter;
      final matchesCat = _categoryFilter == 'All' || c['category'] == _categoryFilter;
      final matchesSearch = term.isEmpty ||
          ((c['title'] as String?) ?? '').toLowerCase().contains(term) ||
          ((c['location'] as String?) ?? '').toLowerCase().contains(term) ||
          ((c['category'] as String?) ?? '').toLowerCase().contains(term);
      return matchesStatus && matchesCat && matchesSearch;
    }).toList();

    return RefreshIndicator(
      onRefresh: _loadComplaints,
      child: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          TextField(
            decoration: const InputDecoration(
              hintText: 'Search title, area, or category...',
              prefixIcon: Icon(Icons.search),
            ),
            onChanged: (v) => setState(() => _search = v),
          ),
          const SizedBox(height: 10),
          SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            child: Row(
              children: ['All', ...kStatuses].map((st) {
                return Padding(
                  padding: const EdgeInsets.only(right: 8),
                  child: ChoiceChip(
                    label: Text(st),
                    selected: _statusFilter == st,
                    onSelected: (_) => setState(() => _statusFilter = st),
                  ),
                );
              }).toList(),
            ),
          ),
          if (ApiService.instance.isOfficial) ...[
            const SizedBox(height: 8),
            DropdownButtonFormField<String>(
              initialValue: _categoryFilter,
              decoration: const InputDecoration(labelText: 'Category filter'),
              items: ['All', ...kCategories]
                  .map((c) => DropdownMenuItem(value: c, child: Text(c)))
                  .toList(),
              onChanged: (v) {
                if (v != null) setState(() => _categoryFilter = v);
              },
            ),
          ],
          const SizedBox(height: 14),
          if (_loading)
            const Padding(
              padding: EdgeInsets.all(32),
              child: Center(child: CircularProgressIndicator()),
            )
          else if (filtered.isEmpty)
            const EmptyBox(
              icon: Icons.filter_list_off,
              title: 'No matching complaints',
              subtitle: 'Try adjusting your search or status filter.',
            )
          else
            ...filtered.map(_buildComplaintTile),
        ],
      ),
    );
  }

  Widget _buildProfileTab() {
    final user = ApiService.instance.user;
    final role = ApiService.instance.role;

    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        Card(
          child: Padding(
            padding: const EdgeInsets.all(20),
            child: Row(
              children: [
                CircleAvatar(
                  radius: 28,
                  backgroundColor: AppColors.roleColor(role),
                  foregroundColor: Colors.white,
                  child: Text(
                    userInitials(user?['name'] as String?),
                    style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w700),
                  ),
                ),
                const SizedBox(width: 16),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        (user?['name'] as String?) ?? '',
                        style: Theme.of(context).textTheme.titleLarge,
                      ),
                      if ((user?['userId'] as String? ?? '').isNotEmpty)
                        Text(
                          'User ID: ${user!['userId']}',
                          style: const TextStyle(
                            fontSize: 12.5,
                            fontWeight: FontWeight.w700,
                            color: AppColors.navy,
                          ),
                        ),
                      Text(
                        (user?['email'] as String?) ?? '',
                        style: Theme.of(context).textTheme.bodySmall,
                      ),
                      if ((user?['phone'] as String? ?? '').isNotEmpty)
                        Text(
                          'Phone: ${user!['phone']}',
                          style: Theme.of(context).textTheme.bodySmall,
                        ),
                      const SizedBox(height: 6),
                      RoleBadge(role: role),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ),
        const SizedBox(height: 14),
        Card(
          child: Column(
            children: [
              ListTile(
                leading: const Icon(Icons.rate_review_outlined, color: AppColors.navy),
                title: Text(ApiService.instance.isAdmin ? 'View user feedback' : 'Give feedback'),
                trailing: const Icon(Icons.chevron_right),
                onTap: () => Navigator.push(
                  context,
                  MaterialPageRoute(builder: (_) => const FeedbackScreen()),
                ),
              ),
              const Divider(height: 1),
              ListTile(
                leading: const Icon(Icons.chat_outlined, color: AppColors.whatsapp),
                title: const Text('WhatsApp support'),
                subtitle: const Text(kWhatsAppDisplay),
                trailing: const Icon(Icons.open_in_new, size: 18),
                onTap: () => openWhatsApp(message: 'Hello, I need help with Digital Complaints.'),
              ),
              const Divider(height: 1),
              ListTile(
                leading: const Icon(Icons.dns_outlined, color: AppColors.navy),
                title: const Text('Server connection'),
                subtitle: Text(ApiService.instance.baseUrl, maxLines: 1, overflow: TextOverflow.ellipsis),
                trailing: const Icon(Icons.chevron_right),
                onTap: () async {
                  await showServerConfigSheet(context);
                  if (mounted) setState(() {});
                },
              ),
            ],
          ),
        ),
        const SizedBox(height: 16),
        OutlinedButton.icon(
          style: OutlinedButton.styleFrom(
            foregroundColor: AppColors.danger,
            side: const BorderSide(color: AppColors.dangerBg),
            backgroundColor: AppColors.dangerBg,
          ),
          onPressed: _logout,
          icon: const Icon(Icons.logout, size: 18),
          label: const Text('Logout'),
        ),
      ],
    );
  }

  @override
  Widget build(BuildContext context) {
    final isAdmin = ApiService.instance.isAdmin;
    final isStaff = ApiService.instance.isStaff;

    final List<Widget> tabs;
    final List<NavigationDestination> destinations;

    if (isAdmin) {
      tabs = [
        _buildOverviewTab(),
        _buildComplaintsTab(),
        const ManageUsersScreen(),
        _buildProfileTab(),
      ];
      destinations = const [
        NavigationDestination(icon: Icon(Icons.dashboard_outlined), selectedIcon: Icon(Icons.dashboard), label: 'Overview'),
        NavigationDestination(icon: Icon(Icons.assignment_outlined), selectedIcon: Icon(Icons.assignment), label: 'Complaints'),
        NavigationDestination(icon: Icon(Icons.people_outline), selectedIcon: Icon(Icons.people), label: 'Users'),
        NavigationDestination(icon: Icon(Icons.person_outline), selectedIcon: Icon(Icons.person), label: 'Profile'),
      ];
    } else if (isStaff) {
      tabs = [
        _buildOverviewTab(),
        _buildComplaintsTab(),
        _buildProfileTab(),
      ];
      destinations = const [
        NavigationDestination(icon: Icon(Icons.dashboard_outlined), selectedIcon: Icon(Icons.dashboard), label: 'Overview'),
        NavigationDestination(icon: Icon(Icons.work_outline), selectedIcon: Icon(Icons.work), label: 'My Work'),
        NavigationDestination(icon: Icon(Icons.person_outline), selectedIcon: Icon(Icons.person), label: 'Profile'),
      ];
    } else {
      tabs = [
        _buildOverviewTab(),
        SubmitComplaintScreen(onSubmitted: _loadComplaints),
        _buildComplaintsTab(),
        _buildProfileTab(),
      ];
      destinations = const [
        NavigationDestination(icon: Icon(Icons.home_outlined), selectedIcon: Icon(Icons.home), label: 'Home'),
        NavigationDestination(icon: Icon(Icons.add_box_outlined), selectedIcon: Icon(Icons.add_box), label: 'Submit'),
        NavigationDestination(icon: Icon(Icons.list_alt_outlined), selectedIcon: Icon(Icons.list_alt), label: 'Complaints'),
        NavigationDestination(icon: Icon(Icons.person_outline), selectedIcon: Icon(Icons.person), label: 'Profile'),
      ];
    }

    final safeIndex = _index >= tabs.length ? 0 : _index;

    return Scaffold(
      appBar: AppBar(
        title: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(3),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(8),
              ),
              child: const AppLogo(size: 26, borderRadius: 6),
            ),
            const SizedBox(width: 10),
            const Text('Digital Official'),
          ],
        ),
      ),
      body: tabs[safeIndex],
      bottomNavigationBar: Container(
        decoration: const BoxDecoration(
          border: Border(top: BorderSide(color: AppColors.borderLight)),
        ),
        child: NavigationBarTheme(
          data: NavigationBarThemeData(
            backgroundColor: AppColors.surface,
            surfaceTintColor: Colors.transparent,
            height: 70,
            indicatorColor: AppColors.roleBg(ApiService.instance.role),
            iconTheme: WidgetStateProperty.resolveWith((states) {
              final active = states.contains(WidgetState.selected);
              return IconThemeData(
                size: 23,
                color: active
                    ? AppColors.roleColor(ApiService.instance.role)
                    : AppColors.textMuted,
              );
            }),
            labelTextStyle: WidgetStateProperty.resolveWith((states) {
              final active = states.contains(WidgetState.selected);
              return TextStyle(
                fontSize: 12,
                fontWeight: active ? FontWeight.w700 : FontWeight.w500,
                color: active
                    ? AppColors.roleColor(ApiService.instance.role)
                    : AppColors.textMuted,
              );
            }),
          ),
          child: NavigationBar(
            selectedIndex: safeIndex,
            onDestinationSelected: (i) => setState(() => _index = i),
            destinations: destinations,
          ),
        ),
      ),
    );
  }
}
