const fs = require("fs");
const path = require("path");
const { injectCordovaHead } = require("./inject-cordova-head");

const h5BuildPath = path.join(__dirname, "../dist");
const cordovaWWWPath = path.join(
  __dirname,
  "../Score/platforms/android/app/src/main/assets/www",
);
const serverDestPath = path.join(
  __dirname,
  "../Score/platforms/android/app/src/main/assets/www/nodejs-project",
);
const wsSourcePath = path.join(__dirname, "../server/node_modules/ws");

// 澶嶅埗 H5 鏋勫缓鍒?Cordova www
function copyRecursiveSync(src, dest) {
  const exists = fs.existsSync(src);
  const stats = exists && fs.statSync(src);
  const isDirectory = exists && stats.isDirectory();

  if (isDirectory) {
    if (!fs.existsSync(dest)) {
      fs.mkdirSync(dest, { recursive: true });
    }
    fs.readdirSync(src).forEach((child) => {
      copyRecursiveSync(path.join(src, child), path.join(dest, child));
    });
  } else {
    fs.copyFileSync(src, dest);
  }
}

console.log("Copying H5 build and server files to Cordova...");

// 娓呯┖骞跺鍒?www
if (fs.existsSync(cordovaWWWPath)) {
  fs.readdirSync(cordovaWWWPath).forEach((file) => {
    const filePath = path.join(cordovaWWWPath, file);
    const stat = fs.statSync(filePath);
    if (stat.isFile()) {
      fs.unlinkSync(filePath);
    }
  });
}

copyRecursiveSync(h5BuildPath, cordovaWWWPath);

// 澶嶅埗鏈嶅姟鍣ㄦ枃浠跺埌 nodejs-project
if (!fs.existsSync(serverDestPath)) {
  fs.mkdirSync(serverDestPath, { recursive: true });
}

// 澶嶅埗宓屽叆寮忔湇鍔″櫒鏂囦欢
fs.copyFileSync(
  path.join(__dirname, "../server/embedded-server.js"),
  path.join(serverDestPath, "embedded-server.js"),
);

copyRecursiveSync(h5BuildPath, path.join(serverDestPath, "dist"));

const wsDestPath = path.join(serverDestPath, "node_modules", "ws");
if (!fs.existsSync(wsSourcePath)) {
  throw new Error(`Missing ws dependency at: ${wsSourcePath}`);
}
if (fs.existsSync(wsDestPath)) {
  fs.rmSync(wsDestPath, { recursive: true, force: true });
}
copyRecursiveSync(wsSourcePath, wsDestPath);

// 鍒涘缓 main.js
const mainJsContent = `const EmbeddedServer = require('./embedded-server.js');

// 鍚姩宓屽叆寮忔湇鍔″櫒
const server = new EmbeddedServer();
server.start();

console.log('Node.js 鏈嶅姟鍣ㄥ凡鍦?Android 搴旂敤涓惎鍔?);

// 鐩戝惉搴旂敤閫€鍑?process.on('SIGTERM', () => {
  console.log('鏀跺埌閫€鍑轰俊鍙凤紝鍏抽棴鏈嶅姟鍣?..');
  server.stop();
  process.exit(0);
});
`;

fs.writeFileSync(path.join(serverDestPath, "main.js"), mainJsContent);

// 鍒涘缓 package.json
const packageJsonContent = {
  name: "scorer-embedded-server",
  version: "1.0.0",
  description: "Embedded Node.js server for Scorer app",
  main: "main.js",
  dependencies: {
    ws: "^8.19.0",
  },
};

fs.writeFileSync(
  path.join(serverDestPath, "package.json"),
  JSON.stringify(packageJsonContent, null, 2),
);

// 澶嶅埗鍚姩鑴氭湰
const startNodejsContent = `window.__SCORER_EMBEDDED_RUNTIME__ = true;
window.nodejsStarting = false;
window.nodejsReady = false;
window.nodejsServerInfo = null;

document.addEventListener('deviceready', function() {
  window.nodejsStarting = true;

  if (typeof nodejs === 'undefined') {
    window.nodejsStarting = false;
    document.dispatchEvent(new CustomEvent('nodejs-unavailable'));
    console.error('nodejs-mobile-cordova plugin not found');
    return;
  }

  nodejs.start('main.js', function(err) {
    window.nodejsStarting = false;

    if (err) {
      console.error('Failed to start Node.js:', err);
      document.dispatchEvent(new CustomEvent('nodejs-error'));
      return;
    }

    window.nodejsReady = true;
    document.dispatchEvent(new CustomEvent('nodejs-ready'));
    console.log('Node.js server started');
  });

  nodejs.channel.on('message', function(msg) {
    console.log('Message from Node.js:', msg);
  });

  if (nodejs.channel && typeof nodejs.channel.on === 'function') {
    nodejs.channel.on('server-started', function(msg) {
      window.nodejsServerInfo = msg;
    });
  }
}, false);
`;

fs.writeFileSync(
  path.join(cordovaWWWPath, "start-nodejs.js"),
  startNodejsContent,
);

// 淇敼 index.html锛屾坊鍔?Cordova 鍜?Node.js 鍚姩鑴氭湰
const indexHtmlPath = path.join(cordovaWWWPath, "index.html");
if (fs.existsSync(indexHtmlPath)) {
  injectCordovaHead(indexHtmlPath);
  console.log(
    "index.html updated: injected Cordova and Node.js startup scripts",
  );
}

console.log("Copy completed!");
console.log(`  H5 Source: ${h5BuildPath}`);
console.log(`  Cordova Target: ${cordovaWWWPath}`);
console.log(`  Server Files: ${serverDestPath}`);
