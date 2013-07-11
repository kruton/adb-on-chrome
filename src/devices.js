var adbApp = angular.module('adbApp', []);

function AdbController($scope, $http) {
  $scope.server = null;

  $scope.permissionObj;

  $scope.needPermission = true;

  $scope.devices = [];

  $scope.rescan = function(callback) {
    $scope.server.getDevices(function(devices) {
      $scope.devices = devices;
      $scope.$apply();
    });
  };

  $scope.gotPermission = function() {
    $scope.needPermission = false;
    $scope.$apply();
    console.log('App was granted the "usbDevices" permission.');
    $scope.rescan();
  };

  $scope.requestPermission = function() {
    chrome.permissions.request($scope.permissionObj, function(result) {
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

  chrome.runtime.getBackgroundPage(function(bgPage) {
    $scope.server = bgPage.server;
    $scope.permissionObj = {
      permissions : [{
        'usbDevices': $scope.server.getDeviceInfos()
      }]
    };

    chrome.permissions.contains($scope.permissionObj, function(result) {
      if (result) {
        $scope.gotPermission();
      }
    });
  });
}