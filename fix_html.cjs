const fs = require('fs');
let html = fs.readFileSync('index.html', 'utf8');

html = html.replace('content="#0b0d11"', 'content="#f0f8ff"');
html = html.replace('background-color: #0b0d11;', 'background-color: #f0f8ff;');
html = html.replace('color: #f1f5f9;', 'color: #0f172a;');
html = html.replace('background: #0f1217;', 'background: #e6f2f5;');
html = html.replace('background: #262c38;', 'background: #b8d4e3;');
html = html.replace('background: #3d4659;', 'background: #a3c9db;');

fs.writeFileSync('index.html', html);
