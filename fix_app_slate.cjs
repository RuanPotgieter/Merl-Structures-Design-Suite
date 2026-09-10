const fs = require('fs');

let content = fs.readFileSync('App.tsx', 'utf8');
content = content.split('text-slate-100').join('text-sky-900');
content = content.split('text-slate-400').join('text-sky-800');
content = content.split('border-[#2f3647]').join('border-sky-300');
content = content.split('text-slate-600').join('text-sky-300'); // for the | separator
fs.writeFileSync('App.tsx', content);

