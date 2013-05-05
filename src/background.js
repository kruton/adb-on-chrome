var server;

if (chrome.app.runtime !== undefined) {
  chrome.app.runtime.onLaunched.addListener(function () {
    chrome.app.window.create('devices.html', {
      width: 400,
      height: 400
    });
  });
}

function isServerRunning() {
  if (server) {
    return true;
  }

  return false;
}

function stopServer() {
  server.stop();
  server = null;
}

function startServer() {
  if (server) {
    stopServer();
  }
  server = new AdbServer(5037);
  server.start();
}