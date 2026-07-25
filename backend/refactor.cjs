const fs = require('fs');
const path = require('path');

const directories = [
  path.join(__dirname, 'src', 'routes'),
  path.join(__dirname, 'src', 'services'),
];

const replacements = [
  { regex: /tenant_profiles/g, replacement: 'occupant_profiles' },
  { regex: /tenant_id/g, replacement: 'occupant_id' },
  { regex: /leases/g, replacement: 'agreements' },
  { regex: /lease_id/g, replacement: 'agreement_id' },
];

function processDirectory(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      processDirectory(fullPath);
    } else if (fullPath.endsWith('.js')) {
      let content = fs.readFileSync(fullPath, 'utf8');
      let changed = false;
      for (const { regex, replacement } of replacements) {
        if (regex.test(content)) {
          content = content.replace(regex, replacement);
          changed = true;
        }
      }
      if (changed) {
        fs.writeFileSync(fullPath, content, 'utf8');
        console.log(`Updated ${fullPath}`);
      }
    }
  }
}

directories.forEach(processDirectory);
console.log('Refactoring complete.');
