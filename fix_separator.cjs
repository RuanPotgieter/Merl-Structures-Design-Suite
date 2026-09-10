const fs = require('fs');

let content = fs.readFileSync('App.tsx', 'utf8');
content = content.split('bg-[#232734]').join('bg-[#b8d4e3]');
fs.writeFileSync('App.tsx', content);

