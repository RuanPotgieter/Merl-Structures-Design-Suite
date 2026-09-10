const fs = require('fs');

let content = fs.readFileSync('components/StatsPanel.tsx', 'utf8');
content = content.replace('border-[#242938]', 'border-[#b8d4e3]');
content = content.replace('bg-[#1c1417]', 'bg-red-50');
content = content.replace('border-[#ef4444]/30', 'border-red-200');

fs.writeFileSync('components/StatsPanel.tsx', content);

