var adbApp = angular.module('adbApp', []);

function AdbController($scope, $http) {
  var GOOGLE_VENDOR_ID = 0x18D1;
  var ADB_PRODUCT_ID = 0x4EE2;
  var NEXUS_S_PRODUCT_ID = 0x4E22;

  var DEVICE_INFO = {
    "vendorId" : GOOGLE_VENDOR_ID,
    "productId" : NEXUS_S_PRODUCT_ID
  };

  var permissionObj = {
    permissions : [{
      'usbDevices' : [DEVICE_INFO]
    }]
  };

  $scope.needPermission = true;

  $scope.devices = [];

  $scope.server = null;

  $scope.rescan = function() {
    chrome.usb.findDevices(DEVICE_INFO, function(devices) {
      if (!devices || !devices.length) {
        console.log('device not found');
        return;
      }
      console.log('Found ' + devices.length + ' device(s):');
      for (var i in devices) {
        console.log('Handle: ' + devices[i].handle);
      }

      $scope.devices = devices;
    });
  };

  $scope.gotPermission = function() {
    $scope.needPermission = false;
    console.log('App was granted the "usbDevices" permission.');
    $scope.rescan();
  };

  $scope.requestPermission = function() {
    chrome.permissions.request(permissionObj, function(result) {
      if (result) {
        $scope.gotPermission();
      } else {
        console.log('App was not granted the "usbDevices" permission.');
        console.log(chrome.runtime.lastError);
      }
    });
  };

  $scope.listenOnPort = function(port) {
    chrome.runtime.getBackgroundPage(function(bgPage) {
      bgPage.startServer();
    });
  };

  chrome.permissions.contains(permissionObj, function(result) {
    if (result) {
      $scope.gotPermission();
    }
  });
}