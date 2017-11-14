var refs = require('./util').refs;


var debug = new DebugLog('firebase:user')

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
  get: function (cb) { 
    refs.user.child('meta').once('value', function (resp) {
      if (resp.exists()) {
        cb(null, resp.val());
      } else {
        cb();
      }
    });
  },
  update: function (data, events) { 
    require('./helpers').startUserUpdate(data, events);
  },
  watchAppInstall: function (deviceId, cb) {
    var updateDate;
    var watching = false;
    function setDate(data) {
      if ((_.isUndefined(data) || _.isNull(data)) || !data.hasOwnProperty('updatedAt')) {
        updateDate = 0;
      } else {
        updateDate = data.updatedAt;
      }
      return;
    };

    refs.userDevices.child(deviceId).child('apps').orderByChild("updatedAt").limitToLast(1).on('value',
    function (app) {
      if (app.exists() && Object.keys(app.val()).length > 0) { // If there's an app in the response
        var key = Object.keys(app.val())[0];
        var val = app.val()[key];
        debug('Type:', typeof val);

        if (!watching) { // If it's the first time it triggers
          setDate(val);
          debug('Now watching for app install changes (' + updateDate + ')...');
          watching = true;
        } else {
          debug('App install update>', val)
          if (val.hasOwnProperty('updatedAt') && val.updatedAt > updateDate) {
            setDate(val);
            debug('App install update confirmed', key, val);
            return cb(val, key);
          }
        }

      } else { // If no apps are currently installed
        watching = true;
        setDate(app.val());
        debug('Now watching for app install changes (' + updateDate + ')...');
      }
    });
  },
  watchForNewApps: function (deviceId, cb) {
    refs.userDevices.child(deviceId).child('apps').on('value',
      function (app) {
        debug('new app>', app.val())
        if (app.exists()) {
          debug('app installed')
          cb(app.val());
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
  },
  allowTracking: function(){
    refs.userMeta.child('trackOk').set( true );
  },
  denyTracking: function(){
    refs.userMeta.child('trackOk').set( false );
  },
  setGroup: function(key, devices) {
    refs.userGroups.child(key).set(devices);
  },
  deleteGroup: function(key) {
    refs.userGroups.child(key).set(null);
  },
  getDevicesFromGroup: function(groupId, cb) {
    refs.userGroups.child(groupId).once('value')
    .then((data) => {
      if (data.exists()) {
        cb(null, data.val());
      } else {
        cb();
      }
    });
  }
}
