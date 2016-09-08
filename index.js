require('colors');

_ = require( 'lodash' );
async = require('async');
var D = require('debug');
debug = new D('firebase')

module.exports = {
  init: require('./lib/init'),

install: require('./lib/install'),

user:{
  getAllApps: function(cb){
    firebaseUserDevicesRef.on('value', function(data){
      cb(data.val());
    })
  },
  checkDevice: function( deviceId, cb ){
    firebaseUserDevicesRef.child(deviceId).once('value',  function (resp) {
      if ( resp.exists() ){
        cb( null, resp.val() );
      } else {
        cb( null );
      }
    })
  }
},

device: {
  ping: function(){
    var d = new Date();
    var now = Math.round(d.getTime() / 1000);
    firebaseDeviceRef.child('/runtime/lastConnectionEvent').set(now);
  },
  add: function (options, events) {
    var o = {
      _state: specs.device_register.start_state,
      token: userToken,
      device: { meta: {} }
    };
    _.extend(o.device.meta, options);
    options = o;

    processTask(specs.device_register, options, events);

  },
  get: function ( cb ) {
    firebaseDeviceRef.once( 'value', function ( s ) {
      if ( !_.isNull( s.val() ) ) cb( null, s.val() )
    }, function ( e ) {
       cb( e )
    } )
  },
  getConfig: function ( cb ) {
    firebaseDeviceRef.child('/config').once( 'value', function ( s ) {
       cb( null, s.val() )
    }, function ( e ) {
      cb( e )
    } )
  },
  getRuntime: function ( cb ) {
    firebaseDeviceRef.child('/runtime').once( 'value', function ( s ) {
       cb( null, s.val() )
    }, function ( e ) {
      cb( e )
    } )
  },
  goOnline: function(cb){
    firebaseDeviceRef.child('/runtime/online').set(true, cb);
  },
  goOffline: function(cb){
    firebaseDeviceRef.child('/runtime/online').set(false, cb);
  },
  meta: function( cb ){
    firebaseDeviceRef.child('meta').once('value',  function ( s ) {
      cb( null, s.val() )
    }, function ( e ) {
      cb( e )
    })
  },
  list: function(cb){
    firebaseUserDevicesRef.once('value', function( resp ){
      cb(resp.val());
    })
  },
  lookup: function( deviceId, cb ){
    //  TODO: this requires the device to exist, otherwise bugs out, catch error condition
    firebaseApp.database().ref('devices/' + deviceId + '/public').once('value', function (resp) {
      if ( !resp.exists() ){
        return cb(null);
      }
      cb(resp.val())
    })
  }
},
storage: {
  upload: function () {
  }
},
appstore: require('./lib/appstore'),
app: {
  appKeys : appKeys,

  setConfig: function ( appId, config, cb ) {
    debug('set Config [fb]>', appId, config)
    firebaseAppRefMap[appId].child('config/').set( config, cb )
  },

  updateConfig: function (  appId, config ) {
    firebaseAppRefMap[appId].child('config/').update( config )
  },

  // looks up value in refmap from init
  get: function (  appId, cb ) {
    firebaseAppRefMap[appId].on('value', function(data){
      debug('app>', data.val())
      cb(null, data.val())
    })
  },
  install: function (token, deviceId, appId, versionId, policy, events ) {
    var options = {
      _state: specs.application_install.start_state,
      token: userToken,
      deviceId: deviceId,
      appId: appId,
      versionId: versionId,
      policy: policy
    };

    processTask(specs.application_install, options, events);

  }, //install ends
  deploy: function (token, deviceId, userId, appData, events) {
    appData.acl = {
      ownerId: userId
    };
    var options = {
      _state: specs.application_create.start_state,
      token: userToken,
      app: appData
    };

    processTask(specs.application_create, options, events);

  }, //deploy ends
  list: function( cb ) {
    firebaseUserAppsRef.on('value', function(data){
      debug('app.list>', data.val());
      cb(null, data.val());
    });
  },

  search: function(needle, cb){
    firebaseAppstoreRef.orderByChild('meta/name').startAt(needle)
    .once('value', function(data){
        cb(data.val());
    })
  },

  getConfig: function( appId, cb ){
    firebaseAppRefMap[appId].child('/config').once('value', function(data){
      debug('app.config>', data.val())
      cb(null, data.val())
    })
  },

  getConfigKey: function( appId, key, cb ){
    firebaseAppRefMap[appId].child('/config/' + key).on('value', function(data){
      debug('app.config>', data.val())
      cb(null, data.val())
    })
  },

  setConfigKey: function( appId, key, value, cb ){
    debug('config>', key, value);
    firebaseAppRefMap[appId].child('/config/' + key).set(value, cb);
  },

  getPolicy: function( appId, cb ){
    firebaseAppRefMap[appId].child('/policy').on('value', function(data){
      debug('app.policy>', data.val())
      cb(null, data.val())
    })
  },
  getMeta: function( appId, cb ){
    firebaseAppRefMap[appId].child('/meta').on('value', function(data){
      debug('app.meta>', data.val())
      cb(null, data.val())
    })
  },

  getRuntime: function( appId, cb ){
    firebaseAppRefMap[appId].child('/runtime').on('value', function(data){
      debug('app.runtime>', data.val())
      cb(null, data.val())
    })
  },
  watchRuntime: function( appId, cb ){
    firebaseAppRefMap[appId].child('/runtime').on('child_changed', function(data){
      debug('app.runtime>', data.val())
      cb(data.val())
    })
  },
  watchConfig: function( appId, cb ){
    firebaseAppRefMap[appId].child('/config').on('child_changed', function(data){
      debug('app.config>', data.val())
      cb(data.val())
    })
  },
  watchUserApps: function(cb){
    firebaseUserAppsRef.on('child_added', function(data){
      if ( data.exists() ){
        cb(data.key);
      }
    })
  },
  getUserAppIds: function(cb){
    firebaseUserAppsRef.once('value', function(data){
      if (!_.isNull(data.val())){
        cb(data.val());
      }
    })
  },
  getAll: getAllApps,
  getApps: getAppsInAppstore,
  getIDForName: function( appName, cb){
    // this will only work on a single device
    firebaseUserAppsRef.orderByChild('name').equalTo(appName).on('value', function(data){
      debug( firebaseUserAppsRef.toString(), data.key, '>>>>', data.val() )
      if ( data.exists() ){
        return cb(new Error('No user installed firebase application:' + appName))
      }
      cb(null, _.keys(data.val())[0] );
    }, console.error)
  },

  //
  remove: function ( appId, cb ) {
    if ( appId ){
      // deviceapps
      firebaseAppRefMap[appId].remove(cb);

      // user-device list
      firebaseAppList.child(appId).remove();
      delete firebaseAppList[appId];
    }
  },

  watchStatus: function( appId, cb ){
    firebaseDeviceAppsRef.child(appId).child('public/runtime/status').on('value', function(resp){
      if ( resp.exists() ){
        cb(resp.val());
      }
    });
  },

  setStatus: function( appId, status, cb ){
    if ( _.isNull(status.match(/active|inactive|error/)) ) {
      console.error('status must be active, inactive or error');
    } else {
    firebaseDeviceAppsRef.child(appId).child('public/runtime/status').set(status, cb);
    }
  }
}
}

function getFirebaseAppRef( deviceId, appId ){
  return firebaseApp.database().ref('deviceapps/' + [ deviceId, appId ].join('/') + '/public');
}

function getAllApps( deviceId, cb ){
  appKeys = {};
  firebaseUserAppsRef.orderByKey().once('value', function(data){
    // debug('app.getAll>', data.val());
    // store for use later

    if ( !_.isNull(data.val()) ){

      var appMap = data.val();

      _.each(appMap, function(meta, appId){
        // console.log('>>>>'.rainbow, appId, meta)
        var fbApp = firebaseApp.database().ref('deviceapps/' + [ deviceId, appId ].join('/') + '/public');
        firebaseAppRefMap[appId] = fbApp;
        fbApp.once('value', function(d){
          if ( !_.isNull( d.val() )){

          debug('[fb]installed-app>', meta.name )
          if ( meta.name === d.val().meta.name ) {
            // console.log(meta.name, 'checks out')
          } else {
            console.warn(meta.name, 'is not in `deviceapps`'.yellow )
          }
          firebaseAppRecords[appId] = d.val();
        }
        });
      })

      cb();

    } else {
      // no apps found
      cb(null, deviceId )
    }

  })
}

function getAppsInAppstore(deviceId, token, callback) {
  appKeys = {};
  var appsResult = [];
  firebaseAppstoreRef.on('value', function (data) {
    debug('app.getAppstore>', '\nValue: \n'.yellow, data.val());
    if (!_.isNull(data.val())) {
      var appMap = data.val();

      _.each(appMap, function (app, appId) {
        debug(appId);
        firebaseAppRecords[appId] = app;


        var activeVersionId = app['meta']['currentVersion'];
        var versionDetails = app['versions'][activeVersionId]
        debug('app>', app['meta']['name'], ' ', appId);
        var createdAt = app['meta']['createdAt'] ? app['meta']['createdAt'] : "2015-09-28T20:38:21.768Z";
        var updatedAt = versionDetails['createdAt'] ? versionDetails['createdAt'] : "2015-09-28T20:38:21.768Z";
        var app =
          {

            "_id": appId,
            "versionId": activeVersionId,
            "name": app['meta']['name'],
            "description": app['meta']['description'],
            "shortname": app['meta']['name'], //TODO use or generate real shortname
            "version": versionDetails['version'],
            "numInstalls": 0,
            "numUninstalls": 0,
            "createdAt": createdAt,
            "updatedAt": updatedAt, //TODO Is this right?
            "file": versionDetails['file']
          };
        firebaseAppRecords[appId] = app;
        appsResult.push(app);

      });

      callback(null, appsResult);

    } else {
      console.warn('No apps available for', deviceId)
      callback()
    }

  });
}

function checkId(id){
  if (!_.isUndefined(getAppKeyFromName(id))){
    // do we have a name?
    console.warn('App Name passed')
    return getAppKeyFromName(id);
  }
  if (!checkAppId(appId)){
    debug('No Application ID Found', id);
    return false;
  }
  return id;
}

//check app ids
function checkAppId(id){
  return appKeys.hasOwnProperty(id);
}

function getAppKeyFromName(name){
  return _.findKey( appKeys, { name: name })
}

var appKeys = {};
