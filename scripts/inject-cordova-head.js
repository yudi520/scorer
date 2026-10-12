const fs = require('fs');
const path = require('path');

function injectCordovaHead(filePath) {
  const resolvedPath = path.resolve(filePath);
  let html = fs.readFileSync(resolvedPath, 'utf8');

  if (!html.includes('</head>')) {
    throw new Error(`Missing </head> in ${resolvedPath}`);
  }

  if (!html.includes('</title>')) {
    throw new Error(`Missing </title> in ${resolvedPath}`);
  }

  if (!html.includes('cordova.js')) {
    const injection = [
      '    <!-- Cordova script -->',
      '    <script src="cordova.js"></script>',
      '    <!-- Node.js startup script -->',
      '    <script src="start-nodejs.js"></script>',
    ].join('\n');

    html = html.replace('</head>', `${injection}\n  </head>`);
  }

  fs.writeFileSync(resolvedPath, html, 'utf8');

  const verified = fs.readFileSync(resolvedPath, 'utf8');
  if (!verified.includes('</title>') || !verified.includes('start-nodejs.js')) {
    throw new Error(`Verification failed for ${resolvedPath}`);
  }
}

if (require.main === module) {
  const target = process.argv[2];
  if (!target) {
    console.error('Usage: node scripts/inject-cordova-head.js <index.html>');
    process.exit(1);
  }

  injectCordovaHead(target);
}

module.exports = { injectCordovaHead };
