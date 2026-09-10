const fs = require('fs');
let css = fs.readFileSync('index.css', 'utf8');
css = css.replace('#0b0d11', '#f0f8ff'); // Background
css = css.replace('#f1f5f9', '#0f172a'); // Text
css = css.replace('#0f1217', '#e6f2f5'); // Scrollbar track
css = css.replace('#262c38', '#b8d4e3'); // Scrollbar thumb
css = css.replace('#3d4659', '#a3c9db'); // Scrollbar thumb hover
fs.writeFileSync('index.css', css);
