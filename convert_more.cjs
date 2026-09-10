const fs = require('fs');

function replaceInFile(filePath, searchVal, replaceVal) {
  let content = fs.readFileSync(filePath, 'utf8');
  const newContent = content.split(searchVal).join(replaceVal);
  if (content !== newContent) {
    fs.writeFileSync(filePath, newContent, 'utf8');
    console.log('Updated:', filePath);
  }
}

// In BillOfMaterials
replaceInFile('components/BillOfMaterials.tsx', 'bg-[#161a25]', 'bg-[#f0f8ff]');
replaceInFile('components/BillOfMaterials.tsx', 'bg-[#131620]', 'bg-[#ffffff]');

// In App.tsx
replaceInFile('App.tsx', 'bg-slate-900/80', 'bg-white/80');
replaceInFile('App.tsx', 'bg-slate-900/95', 'bg-white/95');
replaceInFile('App.tsx', 'bg-slate-800', 'bg-sky-50');
replaceInFile('App.tsx', 'bg-slate-900', 'bg-sky-100');
replaceInFile('App.tsx', 'text-slate-300', 'text-sky-900');
replaceInFile('App.tsx', 'text-slate-200', 'text-sky-800');
replaceInFile('App.tsx', 'border-slate-700/60', 'border-sky-200');
replaceInFile('App.tsx', 'border-slate-700', 'border-sky-300');
replaceInFile('App.tsx', 'text-amber-500', 'text-cyan-600');
replaceInFile('App.tsx', 'hover:text-white hover:bg-slate-800', 'hover:text-cyan-700 hover:bg-sky-100');

// In DeckVisualizer3D.tsx
replaceInFile('components/DeckVisualizer3D.tsx', 'bg-slate-900/80', 'bg-white/80');
replaceInFile('components/DeckVisualizer3D.tsx', 'bg-slate-900', 'bg-sky-100');
replaceInFile('components/DeckVisualizer3D.tsx', 'border-slate-700/60', 'border-sky-200');
replaceInFile('components/DeckVisualizer3D.tsx', 'text-slate-300', 'text-sky-900');
replaceInFile('components/DeckVisualizer3D.tsx', 'text-slate-200', 'text-sky-800');
replaceInFile('components/DeckVisualizer3D.tsx', 'text-slate-400', 'text-sky-700');
replaceInFile('components/DeckVisualizer3D.tsx', 'text-amber-500', 'text-cyan-600');
replaceInFile('components/DeckVisualizer3D.tsx', 'bg-amber-400/15', 'bg-cyan-500/15');
replaceInFile('components/DeckVisualizer3D.tsx', 'hover:text-amber-400', 'hover:text-cyan-600');

