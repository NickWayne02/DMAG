const fs = require('fs');
const path = require('path');

function removeFunc(file, funcName) {
  const p = path.join('mobile_app_flutter', file);
  if (!fs.existsSync(p)) return;
  const content = fs.readFileSync(p, 'utf8');
  const regex = new RegExp(`[\\w\\s<>]+\\s+${funcName}\\s*\\([^)]*\\)\\s*\\{`);
  const match = content.match(regex);
  if (match) {
    let start = match.index;
    let braceCount = 0;
    let inStr = false;
    let end = start + match[0].length;
    braceCount = 1;
    for (let i = end; i < content.length; i++) {
      if (content[i] === '"' || content[i] === "'") inStr = !inStr;
      if (!inStr) {
        if (content[i] === '{') braceCount++;
        if (content[i] === '}') braceCount--;
      }
      if (braceCount === 0) {
        end = i + 1;
        break;
      }
    }
    fs.writeFileSync(p, content.slice(0, start) + content.slice(end));
    console.log(`Removed ${funcName} from ${file}`);
  }
}

function removeField(file, fieldName) {
  const p = path.join('mobile_app_flutter', file);
  if (!fs.existsSync(p)) return;
  let content = fs.readFileSync(p, 'utf8');
  const regex = new RegExp(`.*${fieldName}.*;\\r?\\n?`);
  content = content.replace(regex, '');
  fs.writeFileSync(p, content);
  console.log(`Removed ${fieldName} from ${file}`);
}

removeFunc('lib/screens/admin/dialogs/change_name_dialog.dart', '_formatForApi');
removeFunc('lib/screens/admin/dialogs/create_user_dialog.dart', '_formatForApi');
removeFunc('lib/screens/admin/tabs/dashboard_tab.dart', '_buildStatCard');
removeFunc('lib/screens/admin/tabs/personnel_tab.dart', '_openEditShiftsForMonth');
removeFunc('lib/services/shift_export_service.dart', '_translit');

removeField('lib/screens/admin/tabs/dashboard_tab.dart', '_employeesOnShift');
removeField('lib/screens/admin/tabs/dashboard_tab.dart', '_employeesOnLunch');
removeField('lib/screens/admin/tabs/dashboard_tab.dart', '_activeSitesCount');
removeField('lib/screens/admin/tabs/dashboard_tab.dart', '_urgentReportsCount');

function fixPrint(file) {
  const p = path.join('mobile_app_flutter', file);
  if (!fs.existsSync(p)) return;
  let content = fs.readFileSync(p, 'utf8');
  if(!content.includes("import 'package:flutter/foundation.dart';")) {
    content = "import 'package:flutter/foundation.dart';\n" + content;
  }
  content = content.replace(/print\(/g, 'debugPrint(');
  fs.writeFileSync(p, content);
  console.log(`Fixed print in ${file}`);
}
fixPrint('lib/screens/admin/tabs/personnel_tab.dart');
