const fs = require('fs');
let c = fs.readFileSync('mobile_app_flutter/lib/screens/admin/tabs/personnel_tab.dart', 'utf8');
const search = `  Future<void> _openEditShiftsForMonth(EmployeeRow emp) async {
    final now = DateTime.now();
    final startOfMonth = DateTime(now.year, now.month, 1);
    final endOfMonth = DateTime(now.year, now.month + 1, 0, 23, 59, 59);

    final resp = await Supabase.instance.client
        .from('shifts')
        .select('id, user_id, site_id, site_name, started_at, ended_at, lunch_total_ms, start_city, end_city')
        .eq('user_id', emp.id)
        .gte('started_at', startOfMonth.toUtc().toIso8601String())
        .lte('started_at', endOfMonth.toUtc().toIso8601String())
        .order('started_at', ascending: false);

    if (!mounted) return;

    final shifts = List<Map<String, dynamic>>.from(resp);

    AdminShiftEditSheet.show(
      context: context,
      employeeId: emp.id,
      employeeName: emp.name,
      date: DateTime.now(),
      existingShifts: shifts,
      onSaved: _fetchData,
    );
  }`;
c = c.replace(search, '');
c = c.replace(search.replace(/\n/g, '\r\n'), '');
fs.writeFileSync('mobile_app_flutter/lib/screens/admin/tabs/personnel_tab.dart', c);
