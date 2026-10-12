const fs = require('fs');
const path = require('path');

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function wrapCordovaModule(moduleId, sourceCode) {
  return `cordova.define("${moduleId}", function(require, exports, module) {\n${sourceCode}\n});\n`;
}

function writeFile(targetPath, contents) {
  ensureDir(path.dirname(targetPath));
  fs.writeFileSync(targetPath, contents, 'utf8');
}

function restoreCordovaNodejsRuntime(stagingDir, cordovaRoot) {
  const cordovaJsSource = path.join(
    cordovaRoot,
    'node_modules',
    'cordova-android',
    'templates',
    'project',
    'assets',
    'www',
    'cordova.js'
  );
  const pluginRoot = path.join(cordovaRoot, 'plugins', 'nodejs-mobile-cordova');
  const pluginFiles = [
    {
      source: path.join(pluginRoot, 'www', 'nodejs_apis.js'),
      target: path.join(stagingDir, 'plugins', 'nodejs-mobile-cordova', 'www', 'nodejs_apis.js'),
      moduleId: 'nodejs-mobile-cordova.nodejs'
    },
    {
      source: path.join(pluginRoot, 'www', 'nodejs_events.js'),
      target: path.join(stagingDir, 'plugins', 'nodejs-mobile-cordova', 'www', 'nodejs_events.js'),
      moduleId: 'nodejs-mobile-cordova.nodejs_events'
    }
  ];

  if (!fs.existsSync(cordovaJsSource)) {
    throw new Error(`Missing cordova.js template: ${cordovaJsSource}`);
  }

  const cordovaJsTarget = path.join(stagingDir, 'cordova.js');
  ensureDir(stagingDir);
  fs.copyFileSync(cordovaJsSource, cordovaJsTarget);

  pluginFiles.forEach(({ source, target, moduleId }) => {
    if (!fs.existsSync(source)) {
      throw new Error(`Missing plugin source: ${source}`);
    }

    const sourceCode = fs.readFileSync(source, 'utf8').replace(/^\uFEFF/, '');
    writeFile(target, wrapCordovaModule(moduleId, sourceCode));
  });

  const cordovaPluginsContent = `cordova.define('cordova/plugin_list', function(require, exports, module) {
  module.exports = [
    {
      "id": "nodejs-mobile-cordova.nodejs",
      "file": "plugins/nodejs-mobile-cordova/www/nodejs_apis.js",
      "pluginId": "nodejs-mobile-cordova",
      "clobbers": [
        "nodejs"
      ]
    },
    {
      "id": "nodejs-mobile-cordova.nodejs_events",
      "file": "plugins/nodejs-mobile-cordova/www/nodejs_events.js",
      "pluginId": "nodejs-mobile-cordova",
      "clobbers": [
        "nodejs_events"
      ]
    }
  ];
  module.exports.metadata = {
    "nodejs-mobile-cordova": "0.4.3"
  };
});\n`;

  writeFile(path.join(stagingDir, 'cordova_plugins.js'), cordovaPluginsContent);
}

if (require.main === module) {
  const stagingDir = process.argv[2];
  const cordovaRoot = process.argv[3];

  if (!stagingDir || !cordovaRoot) {
    console.error('Usage: node scripts/restore-cordova-nodejs-runtime.js <stagingDir> <cordovaRoot>');
    process.exit(1);
  }

  restoreCordovaNodejsRuntime(path.resolve(stagingDir), path.resolve(cordovaRoot));
}

module.exports = { restoreCordovaNodejsRuntime };
