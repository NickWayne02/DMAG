const fs = require('fs');
const path = require('path');

function replaceFile(filePath, replacements) {
    let content = fs.readFileSync(filePath, 'utf-8');
    let original = content;
    for (const rep of replacements) {
        if (content.includes(rep.search)) {
            content = content.replace(rep.search, rep.replace);
        } else {
            console.log(`Could not find in ${filePath}:\n${rep.search}\n`);
        }
    }
    
    if (content !== original) {
        if (!content.includes('transliteration.dart') && content.includes('TransliterationService')) {
            const importPath = filePath.includes('admin\\dialogs') ? '../../../../../utils/transliteration.dart' :
                               filePath.includes('admin\\tabs') ? '../../../../utils/transliteration.dart' :
                               filePath.includes('admin') ? '../../../utils/transliteration.dart' :
                               '../../utils/transliteration.dart';
            content = `import '${importPath}';\n` + content;
        }
        fs.writeFileSync(filePath, content, 'utf-8');
        console.log(`Updated ${filePath}`);
    }
}

const basePath = 'mobile_app_flutter/lib/screens/admin';

// 1. Calendar Tab
replaceFile(path.join(basePath, 'tabs/calendar_tab.dart'), [
    {
        search: "Text(e['full_name'] ?? e['id']),",
        replace: "Text(TransliterationService.transliterateIfNeeded(e['full_name'] ?? e['id'], context.read<LocaleProvider>().currentLang)),"
    }
]);

// 2. Admin Shift Edit Sheet
replaceFile(path.join(basePath, 'admin_shift_edit_sheet.dart'), [
    {
        search: "child: Text(s['name'] as String, style: GoogleFonts.inter(color: Colors.white)),",
        replace: "child: Text(TransliterationService.transliterateIfNeeded(s['name'] as String, context.read<LocaleProvider>().currentLang), style: GoogleFonts.inter(color: Colors.white)),"
    },
    {
        search: "_startCityController.text = s['start_city'] ?? '';",
        replace: "_startCityController.text = TransliterationService.transliterateIfNeeded(s['start_city'] ?? '', context.read<LocaleProvider>().currentLang);"
    },
    {
        search: "_endCityController.text = s['end_city'] ?? '';",
        replace: "_endCityController.text = TransliterationService.transliterateIfNeeded(s['end_city'] ?? '', context.read<LocaleProvider>().currentLang);"
    }
]);

// 3. Chat Tab
replaceFile(path.join(basePath, 'tabs/chat_tab.dart'), [
    {
        search: "title: site['name'],",
        replace: "title: TransliterationService.transliterateIfNeeded(site['name'] ?? '', context.read<LocaleProvider>().currentLang),"
    },
    {
        search: "onTap: () => _openChat('site', site['id'], site['name']),",
        replace: "onTap: () => _openChat('site', site['id'], TransliterationService.transliterateIfNeeded(site['name'] ?? '', context.read<LocaleProvider>().currentLang)),"
    }
]);

// 4. Personnel Tab
replaceFile(path.join(basePath, 'tabs/personnel_tab.dart'), [
    {
        search: "final name = p['full_name'] ?? p['email'] ?? p['phone'] ?? context.read<LocaleProvider>().t('personnel.no_name') ?? 'Без имени';",
        replace: "final name = TransliterationService.transliterateIfNeeded(p['full_name'] ?? p['email'] ?? p['phone'] ?? context.read<LocaleProvider>().t('personnel.no_name') ?? 'Без имени', context.read<LocaleProvider>().currentLang);"
    }
]);
