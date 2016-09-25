var refs = require('./util').refs;

module.exports = {
  getAllApps: function (cb) {
    refs.userDevices.once('value', function (data) {
      if (data.exists()) {
        cb(null, data.val());
      } else {
        cb(null);
      }
    })
  },
  getAllDevices: function(cb){
    refs.userDevices.orderByKey().once('value', function (data) {
      if ( data.exists() && !_.isNull( data.val() ) ){
        cb(data.val());
      } else {
        cb(null);
      }
    })
  },
  checkDevice: function (deviceId, cb) {
    refs.userDevices.child(deviceId).once('value', function (resp) {
      if (resp.exists()) {
        cb(null, resp.val());
      } else {
        cb(null);
      }
    })
  },
  watchForNewApps: function (deviceId, cb) {
    refs.userDevices.child(deviceId).child('apps').on('child_added',
      function (app) {
        debug('new app>', app.val())
        if (app.exists()) {
          debug('app installed')
          cb(app.val());
        }
      })
  },
  watchForAppRemoval: function (deviceId, appId, cb) {
    refs.userDevices.child(deviceId).on('child_removed',
      function (appRemoved) {
        if (app.exists() && app.key() === appId) {
          debug('app ' + appId + ' uninstalled')
          cb(app);
        }
      })
  },
  watchForDeviceAdd: function (cb) {
    refs.userDevices.on('child_added', function (device) {
      if ( device.exists() ) {
        debug('device ', device.val(), ' on user!')
        cb(device);
      }
    })
  }
}
