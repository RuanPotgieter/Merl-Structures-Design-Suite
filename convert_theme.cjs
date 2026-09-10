const fs = require('fs');
const path = require('path');

const colorMap = {
  // Backgrounds
  'bg-[#0b0d11]': 'bg-[#f0f8ff]',
  'bg-[#111319]': 'bg-[#ffffff]',
  'bg-[#161922]': 'bg-[#e6f2f5]',
  'bg-[#1A1D24]': 'bg-[#dcebf0]',
  'bg-[#13161f]': 'bg-[#ffffff]',
  'bg-[#12151d]': 'bg-[#eef5f9]',
  'bg-[#12151C]': 'bg-[#eef5f9]',
  'bg-[#0e1117]': 'bg-[#f0f8ff]',
  'bg-[#1b202d]': 'bg-[#e6f2f5]',
  'bg-[#10131b]': 'bg-[#f8fbfd]',
  'bg-[#0f1118]': 'bg-[#eef5f9]',
  'bg-[#181c28]': 'bg-[#dcebf0]',
  'bg-[#1e222d]': 'bg-[#dcebf0]',
  'bg-[#1e222e]': 'bg-[#dcebf0]',
  'bg-[#1c202c]': 'bg-[#e6f2f5]',
  'bg-[#222734]': 'bg-[#e0f2fe]',
  'bg-[#1d212c]': 'bg-[#dcebf0]',
  'bg-[#1d212d]': 'bg-[#dcebf0]',
  'bg-[#171b26]': 'bg-[#f8fbfd]',
  'bg-[#090b10]': 'bg-[#001f3f]', // backdrop
  'bg-[#e5e7eb]': 'bg-[#ffffff]', // canvas bg to white?

  // Borders
  'border-[#232734]': 'border-[#b8d4e3]',
  'border-[#232733]': 'border-[#b8d4e3]',
  'border-[#272d3b]': 'border-[#a3c9db]',
  'border-[#2b303d]': 'border-[#a3c9db]',
  'border-[#2e3444]': 'border-[#8ebdd4]',
  'border-[#343b4d]': 'border-[#8ebdd4]',
  'border-[#2d3445]': 'border-[#8ebdd4]',
  'border-[#272d3c]': 'border-[#a3c9db]',
  'border-[#384052]': 'border-[#8ebdd4]',
  'border-[#1b202d]': 'border-[#b8d4e3]',

  // Text
  'text-[#f1f5f9]': 'text-[#0f172a]',
  'text-[#cbd5e1]': 'text-[#334155]',
  'text-[#94a3b8]': 'text-[#475569]',
  'text-[#8e9cb2]': 'text-[#475569]',
  // text-[#64748b] stays same
  'text-[#f8fafc]': 'text-[#0f172a]',
  'text-stone-950': 'text-white',
  'hover:text-stone-950': 'hover:text-white',

  // Accents
  'amber-500': 'cyan-500',
  'amber-400': 'cyan-600', // using cyan-600 because it's on light bg now
};

function processFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let original = content;

  // Replace each mapped string
  for (const [key, value] of Object.entries(colorMap)) {
    content = content.split(key).join(value);
  }

  if (content !== original) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log('Updated:', filePath);
  }
}

function walkDir(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      if (file !== 'node_modules' && file !== '.git' && file !== 'dist') {
        walkDir(fullPath);
      }
    } else if (fullPath.endsWith('.tsx') || fullPath.endsWith('.ts') || fullPath.endsWith('.css') || fullPath.endsWith('.html')) {
      processFile(fullPath);
    }
  }
}

walkDir('.');
