/*
 * Copyright 2013 Kenny Root
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

var server;

if (chrome.app.runtime !== undefined) {
  chrome.app.runtime.onLaunched.addListener(function () {
    chrome.app.window.create('src/devices.html', {
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

startServer();
