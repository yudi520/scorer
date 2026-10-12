const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

function fileContains(filePath, text) {
  return fs.existsSync(filePath) && fs.readFileSync(filePath, 'utf8').includes(text);
}

function readJson(filePath) {
  if (!fs.existsSync(filePath)) {
    return null;
  }

  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function writeJson(filePath, value) {
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function copyFileIfNeeded(sourcePath, targetPath) {
  if (!fs.existsSync(sourcePath)) {
    throw new Error(`Missing source file: ${sourcePath}`);
  }

  ensureDir(path.dirname(targetPath));
  fs.copyFileSync(sourcePath, targetPath);
}

function copyDirectoryRecursive(sourceDir, targetDir) {
  if (!fs.existsSync(sourceDir)) {
    throw new Error(`Missing source directory: ${sourceDir}`);
  }

  ensureDir(targetDir);
  for (const entry of fs.readdirSync(sourceDir, { withFileTypes: true })) {
    const sourcePath = path.join(sourceDir, entry.name);
    const targetPath = path.join(targetDir, entry.name);
    if (entry.isDirectory()) {
      copyDirectoryRecursive(sourcePath, targetPath);
    } else {
      fs.copyFileSync(sourcePath, targetPath);
    }
  }
}

function ensureXmlFile(filePath, contents) {
  ensureDir(path.dirname(filePath));
  fs.writeFileSync(filePath, contents, 'utf8');
}

function patchNodeJsJava(targetPath) {
  let javaSource = fs.readFileSync(targetPath, 'utf8');
  const original = 'if (BuildConfig.DEBUG) {';
  const replacement =
    'if ((context.getApplicationInfo().flags & android.content.pm.ApplicationInfo.FLAG_DEBUGGABLE) != 0) {';

  if (javaSource.includes(original)) {
    javaSource = javaSource.replace(original, replacement);
    fs.writeFileSync(targetPath, javaSource, 'utf8');
  }
}

function patchMainActivity(cordovaRoot) {
  const mainActivityPath = path.join(
    cordovaRoot,
    'platforms',
    'android',
    'app',
    'src',
    'main',
    'java',
    'com',
    'example',
    'scorer',
    'MainActivity.java'
  );

  if (!fs.existsSync(mainActivityPath)) {
    return;
  }

  let javaSource = fs.readFileSync(mainActivityPath, 'utf8');

  if (!javaSource.includes('import android.view.View;')) {
    javaSource = javaSource.replace(
      "import android.os.Bundle;\n",
      "import android.os.Bundle;\nimport android.view.View;\nimport android.webkit.WebSettings;\n"
    );
  }

  if (!javaSource.includes('import org.apache.cordova.engine.SystemWebView;')) {
    javaSource = javaSource.replace(
      "import org.apache.cordova.*;\n",
      "import org.apache.cordova.*;\nimport org.apache.cordova.engine.SystemWebView;\n"
    );
  }

  const mixedContentBlock = [
    '',
    '        if (appView != null) {',
    '            View webView = appView.getView();',
    '            if (webView instanceof SystemWebView) {',
    '                WebSettings settings = ((SystemWebView) webView).getSettings();',
    '                settings.setMixedContentMode(WebSettings.MIXED_CONTENT_ALWAYS_ALLOW);',
    '            }',
    '        }'
  ].join('\n');

  if (!javaSource.includes('settings.setMixedContentMode(WebSettings.MIXED_CONTENT_ALWAYS_ALLOW);')) {
    javaSource = javaSource.replace(
      '        super.onCreate(savedInstanceState);\n',
      `        super.onCreate(savedInstanceState);\n${mixedContentBlock}\n`
    );
  }

  fs.writeFileSync(mainActivityPath, javaSource, 'utf8');
}

function patchAndroidManifest(cordovaRoot) {
  const manifestPath = path.join(
    cordovaRoot,
    'platforms',
    'android',
    'app',
    'src',
    'main',
    'AndroidManifest.xml'
  );
  const networkSecurityConfigPath = path.join(
    cordovaRoot,
    'platforms',
    'android',
    'app',
    'src',
    'main',
    'res',
    'xml',
    'network_security_config.xml'
  );

  if (!fs.existsSync(manifestPath)) {
    return;
  }

  let xml = fs.readFileSync(manifestPath, 'utf8');

  if (!xml.includes('android:usesCleartextTraffic="true"')) {
    xml = xml.replace(
      '<application ',
      '<application android:usesCleartextTraffic="true" '
    );
  }

  if (!xml.includes('android:networkSecurityConfig="@xml/network_security_config"')) {
    xml = xml.replace(
      '<application android:usesCleartextTraffic="true" ',
      '<application android:usesCleartextTraffic="true" android:networkSecurityConfig="@xml/network_security_config" '
    );
  }

  fs.writeFileSync(manifestPath, xml, 'utf8');
  ensureXmlFile(
    networkSecurityConfigPath,
    [
      '<?xml version="1.0" encoding="utf-8"?>',
      '<network-security-config>',
      '  <domain-config cleartextTrafficPermitted="true">',
      '    <domain includeSubdomains="true">localhost</domain>',
      '    <domain includeSubdomains="true">127.0.0.1</domain>',
      '  </domain-config>',
      '</network-security-config>',
      ''
    ].join('\n')
  );
}

function ensureAndroidLocalhostAccess(cordovaRoot) {
  patchAndroidManifest(cordovaRoot);
  patchMainActivity(cordovaRoot);
}

function compareVersions(a, b) {
  const aParts = a.split('.').map((value) => parseInt(value, 10) || 0);
  const bParts = b.split('.').map((value) => parseInt(value, 10) || 0);
  const maxLength = Math.max(aParts.length, bParts.length);

  for (let index = 0; index < maxLength; index += 1) {
    const left = aParts[index] || 0;
    const right = bParts[index] || 0;
    if (left !== right) {
      return left - right;
    }
  }

  return 0;
}

function resolveAndroidSdkRoot(cordovaRoot) {
  const candidates = [
    process.env.ANDROID_HOME,
    process.env.ANDROID_SDK_ROOT,
    'F:\\Android\\Sdk'
  ].filter(Boolean);

  const existing = candidates.find((candidate) => fs.existsSync(candidate));
  if (existing) {
    return existing;
  }

  const buildModelRoot = path.join(
    cordovaRoot,
    'platforms',
    'android',
    'app',
    'build',
    'intermediates',
    'cxx',
    'Debug'
  );

  if (fs.existsSync(buildModelRoot)) {
    const buildModelFiles = [];
    const stack = [buildModelRoot];
    while (stack.length > 0) {
      const current = stack.pop();
      for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
        const fullPath = path.join(current, entry.name);
        if (entry.isDirectory()) {
          stack.push(fullPath);
        } else if (entry.name === 'build_model.json') {
          buildModelFiles.push(fullPath);
        }
      }
    }

    for (const buildModelFile of buildModelFiles) {
      try {
        const json = readJson(buildModelFile);
        const ndkPath = json?.ndkFolder;
        if (ndkPath && fs.existsSync(path.dirname(ndkPath))) {
          return path.dirname(ndkPath);
        }
      } catch (error) {
        // Ignore malformed debug metadata and keep searching.
      }
    }
  }

  throw new Error('Unable to locate Android SDK root for libc++_shared.so');
}

function resolveLatestNdkDir(sdkRoot) {
  const ndkRoot = path.join(sdkRoot, 'ndk');
  if (!fs.existsSync(ndkRoot)) {
    throw new Error(`Missing NDK directory under SDK root: ${ndkRoot}`);
  }

  const versions = fs.readdirSync(ndkRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort(compareVersions);

  if (versions.length === 0) {
    throw new Error(`No NDK versions found under ${ndkRoot}`);
  }

  return path.join(ndkRoot, versions[versions.length - 1]);
}

function ensureSharedStlLibraries(cordovaRoot) {
  const sdkRoot = resolveAndroidSdkRoot(cordovaRoot);
  const ndkDir = resolveLatestNdkDir(sdkRoot);
  const prebuiltRoot = path.join(
    ndkDir,
    'toolchains',
    'llvm',
    'prebuilt',
    'windows-x86_64',
    'sysroot',
    'usr',
    'lib'
  );
  const jniLibsRoot = path.join(
    cordovaRoot,
    'platforms',
    'android',
    'app',
    'src',
    'main',
    'jniLibs'
  );
  const abiMap = {
    'arm64-v8a': 'aarch64-linux-android',
    'armeabi-v7a': 'arm-linux-androideabi',
    'x86': 'i686-linux-android',
    'x86_64': 'x86_64-linux-android'
  };

  for (const [abiName, ndkLibDir] of Object.entries(abiMap)) {
    const sourcePath = path.join(prebuiltRoot, ndkLibDir, 'libc++_shared.so');
    const targetPath = path.join(jniLibsRoot, abiName, 'libc++_shared.so');
    copyFileIfNeeded(sourcePath, targetPath);
  }
}

function getPlatformState(cordovaRoot) {
  const androidJsonPath = path.join(cordovaRoot, 'platforms', 'android', 'android.json');
  const configXmlPath = path.join(cordovaRoot, 'platforms', 'android', 'app', 'src', 'main', 'res', 'xml', 'config.xml');
  const javaCandidates = [
    path.join(
      cordovaRoot,
      'platforms',
      'android',
      'app',
      'src',
      'main',
      'java',
      'com',
      'janeasystems',
      'cdvnodejsmobile',
      'NodeJS.java'
    ),
    path.join(
      cordovaRoot,
      'platforms',
      'android',
      'src',
      'com',
      'janeasystems',
      'cdvnodejsmobile',
      'NodeJS.java'
    )
  ];
  const androidJson = readJson(androidJsonPath);

  return {
    androidJsonPath,
    configXmlPath,
    installedInPlatform: Boolean(androidJson?.installed_plugins?.['nodejs-mobile-cordova']),
    configHasFeature:
      fileContains(configXmlPath, '<feature name="NodeJS">') &&
      fileContains(configXmlPath, 'com.janeasystems.cdvnodejsmobile.NodeJS'),
    javaSourceExists: javaCandidates.some((candidate) => fs.existsSync(candidate)),
  };
}

function isHealthy(state) {
  return state.configHasFeature && state.javaSourceExists;
}

function runCordovaCommand(cordovaRoot, command, allowFailure = false) {
  const result = spawnSync('cmd', ['/c', command], {
    cwd: cordovaRoot,
    stdio: 'inherit',
  });

  if (result.status !== 0 && !allowFailure) {
    throw new Error(`Command failed: ${command}`);
  }
}

function ensureConfigFeature(configXmlPath) {
  let xml = fs.readFileSync(configXmlPath, 'utf8');
  const featureXml = [
    '    <feature name="NodeJS">',
    '        <param name="android-package" value="com.janeasystems.cdvnodejsmobile.NodeJS" />',
    '    </feature>'
  ].join('\n');

  if (xml.includes('<feature name="NodeJS">')) {
    return;
  }

  const insertionPoint = '    <name>计分器</name>';
  if (!xml.includes(insertionPoint)) {
    throw new Error(`Unable to locate insertion point in ${configXmlPath}`);
  }

  xml = xml.replace(insertionPoint, `${featureXml}\n${insertionPoint}`);
  fs.writeFileSync(configXmlPath, xml, 'utf8');
}

function ensureAndroidJson(androidJsonPath) {
  const androidJson = readJson(androidJsonPath);
  if (!androidJson) {
    throw new Error(`Missing android.json: ${androidJsonPath}`);
  }

  androidJson.installed_plugins = androidJson.installed_plugins || {};
  if (!androidJson.installed_plugins['nodejs-mobile-cordova']) {
    androidJson.installed_plugins['nodejs-mobile-cordova'] = {};
  }

  androidJson.config_munge = androidJson.config_munge || { files: {} };
  androidJson.config_munge.files = androidJson.config_munge.files || {};
  androidJson.config_munge.files['res/xml/config.xml'] =
    androidJson.config_munge.files['res/xml/config.xml'] || { parents: { '/*': [] } };

  const configParents = androidJson.config_munge.files['res/xml/config.xml'].parents;
  configParents['/*'] = configParents['/*'] || [];
  const featureEntry =
    '<feature name="NodeJS"><param name="android-package" value="com.janeasystems.cdvnodejsmobile.NodeJS" /></feature>';
  if (!configParents['/*'].some((entry) => entry.xml === featureEntry)) {
    configParents['/*'].push({ xml: featureEntry, count: 1 });
  }

  writeJson(androidJsonPath, androidJson);
}

function manualRepairPlatform(cordovaRoot) {
  const pluginRootCandidates = [
    path.join(cordovaRoot, 'plugins', 'nodejs-mobile-cordova'),
    path.join(cordovaRoot, 'node_modules', 'nodejs-mobile-cordova')
  ];
  const pluginRoot = pluginRootCandidates.find((candidate) => fs.existsSync(candidate));
  if (!pluginRoot) {
    throw new Error(`Unable to locate nodejs-mobile-cordova sources under ${cordovaRoot}`);
  }

  const appJavaRoot = path.join(
    cordovaRoot,
    'platforms',
    'android',
    'app',
    'src',
    'main',
    'java',
    'com',
    'janeasystems',
    'cdvnodejsmobile'
  );
  const appLibRoot = path.join(cordovaRoot, 'platforms', 'android', 'app', 'libs', 'cdvnodejsmobile');
  const appAssetsRoot = path.join(cordovaRoot, 'platforms', 'android', 'app', 'src', 'main', 'assets');
  const androidJsonPath = path.join(cordovaRoot, 'platforms', 'android', 'android.json');
  const configXmlPath = path.join(
    cordovaRoot,
    'platforms',
    'android',
    'app',
    'src',
    'main',
    'res',
    'xml',
    'config.xml'
  );

  copyFileIfNeeded(
    path.join(pluginRoot, 'src', 'android', 'java', 'com', 'janeasystems', 'cdvnodejsmobile', 'NodeJS.java'),
    path.join(appJavaRoot, 'NodeJS.java')
  );
  patchNodeJsJava(path.join(appJavaRoot, 'NodeJS.java'));
  copyFileIfNeeded(
    path.join(pluginRoot, 'src', 'common', 'cordova-bridge', 'cordova-bridge.h'),
    path.join(appLibRoot, 'cordova-bridge.h')
  );
  copyFileIfNeeded(
    path.join(pluginRoot, 'src', 'common', 'cordova-bridge', 'cordova-bridge.cpp'),
    path.join(appLibRoot, 'cordova-bridge.cpp')
  );
  copyFileIfNeeded(
    path.join(pluginRoot, 'src', 'android', 'jni', 'native-lib.cpp'),
    path.join(appLibRoot, 'native-lib.cpp')
  );
  copyFileIfNeeded(
    path.join(pluginRoot, 'src', 'android', 'CMakeLists.txt'),
    path.join(appLibRoot, 'CMakeLists.txt')
  );

  const libnodeSource = path.join(pluginRoot, 'libs', 'android', 'libnode');
  const libnodeTarget = path.join(appLibRoot, 'libnode');
  if (!fs.existsSync(libnodeTarget) || fs.readdirSync(libnodeTarget).length === 0) {
    copyDirectoryRecursive(libnodeSource, libnodeTarget);
  }
  copyDirectoryRecursive(
    path.join(pluginRoot, 'install', 'nodejs-mobile-cordova-assets'),
    path.join(appAssetsRoot, 'nodejs-mobile-cordova-assets')
  );

  ensureConfigFeature(configXmlPath);
  ensureAndroidJson(androidJsonPath);
  ensureSharedStlLibraries(cordovaRoot);
  ensureAndroidLocalhostAccess(cordovaRoot);
}

function patchExistingPlatformFiles(cordovaRoot) {
  const pluginRootCandidates = [
    path.join(cordovaRoot, 'plugins', 'nodejs-mobile-cordova'),
    path.join(cordovaRoot, 'node_modules', 'nodejs-mobile-cordova')
  ];
  const pluginRoot = pluginRootCandidates.find((candidate) => fs.existsSync(candidate));
  const appJavaPath = path.join(
    cordovaRoot,
    'platforms',
    'android',
    'app',
    'src',
    'main',
    'java',
    'com',
    'janeasystems',
    'cdvnodejsmobile',
    'NodeJS.java'
  );
  const appAssetsRoot = path.join(
    cordovaRoot,
    'platforms',
    'android',
    'app',
    'src',
    'main',
    'assets',
    'nodejs-mobile-cordova-assets'
  );

  if (fs.existsSync(appJavaPath)) {
    patchNodeJsJava(appJavaPath);
  }
  if (pluginRoot) {
    copyDirectoryRecursive(
      path.join(pluginRoot, 'install', 'nodejs-mobile-cordova-assets'),
      appAssetsRoot
    );
  }

  ensureSharedStlLibraries(cordovaRoot);
  ensureAndroidLocalhostAccess(cordovaRoot);
}

function ensureCordovaNodejsPlugin(cordovaRoot) {
  const pluginPath = path.join(cordovaRoot, 'node_modules', 'nodejs-mobile-cordova');
  if (!fs.existsSync(pluginPath)) {
    throw new Error(`Missing nodejs-mobile-cordova package: ${pluginPath}`);
  }

  const initialState = getPlatformState(cordovaRoot);
  console.log('NodeJS plugin platform state:', JSON.stringify(initialState, null, 2));
  patchExistingPlatformFiles(cordovaRoot);

  if (isHealthy(initialState)) {
    console.log('NodeJS plugin already installed in Android platform.');
    return;
  }

  console.warn('NodeJS plugin is incomplete in Android platform. Repairing platform files directly...');
  manualRepairPlatform(cordovaRoot);

  const repairedState = getPlatformState(cordovaRoot);
  console.log('NodeJS plugin repaired state:', JSON.stringify(repairedState, null, 2));

  if (!isHealthy(repairedState)) {
    throw new Error(
      'NodeJS plugin repair did not restore Android platform bindings. ' +
      'Expected NodeJS feature in config.xml and NodeJS.java.'
    );
  }
}

if (require.main === module) {
  const cordovaRoot = process.argv[2];

  if (!cordovaRoot) {
    console.error('Usage: node scripts/ensure-cordova-nodejs-plugin.js <cordovaRoot>');
    process.exit(1);
  }

  ensureCordovaNodejsPlugin(path.resolve(cordovaRoot));
}

module.exports = { ensureCordovaNodejsPlugin };
