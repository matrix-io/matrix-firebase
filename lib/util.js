// TODO: Consider merging helpers into util

var firebaseUserAppsRef;
var firebaseAppstoreRef;
var firebaseInstalls;
var firebaseDeviceAppRefMap = {};
var firebaseAppRecords;
var firebaseDeviceRef;
var firebaseUserDevicesRef;
var firebaseQueueRef;
var firebaseDeviceAppsRef;
var firebaseDeviceRecords = {};

var firebaseApp = {};

var userToken;

var F = require('firebase');


function getAllDevices(cb){
  var deviceIds = [];
  firebaseUserDevicesRef.once('value', function(resp){
    if ( resp.exists() ){
      deviceIds.push(resp.key());
      async.each( deviceIds, function( id, cb ){
        firebaseDeviceRef.child( id + '/public' )
        .once('value', function(resp){
          if ( resp.exists() ){
            firebaseDeviceRecords[id] = resp.val();
          }
          cb();
        }, cb);
      })
    } else {
      cb(null);
    }
  })
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

        firebaseInstalls[deviceId] = {};
        firebaseDeviceAppRefMap[appId] = fbApp;
        firebaseInstalls[deviceId][appId] = fbApp;
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


module.exports = {
  init: function (userId, deviceId, token, cb) {
    var error;
    if (_.isUndefined(userId)) {
      error = new Error('Firebase init needs a userId');
      error.code = 'auth/no-user-id-provided';
    }
    if (_.isUndefined(token)) {
      error = new Error('Firebase init needs a token');
      error.code = 'auth/no-custom-token-provided';
    }
    if (error) return cb(error);

    debug('=====🔥 firebase 📇====='.rainbow, token )

    var config = {
      apiKey: 'AIzaSyC44wzkGlODJoKyRGbabB8TiRJnq9k7BuA',
      authDomain: 'admobilize-testing.firebaseapp.com',
      databaseURL: 'https://admobilize-testing.firebaseio.com',
      storageBucket: 'admobilize-testing.appspot.com',
    };

    firebaseApp = F.initializeApp(config);

    firebaseApp.auth().signInWithCustomToken(token).then(function(user) {
      module.exports.refs.base = firebaseApp.database();
      debug('Firebase Auth Success');
      userToken = token;
      firebaseDeviceRef = firebaseApp.database().ref('devices/' + deviceId + '/public');
      firebaseUserAppsRef = firebaseApp.database().ref('users/' + userId + '/devices/'+ deviceId + '/apps' );
      firebaseAppstoreRef = firebaseApp.database().ref('appstore');
      firebaseUserDevicesRef = firebaseApp.database().ref('users/' + userId + '/devices');
      firebaseQueueRef = firebaseApp.database().ref('queue/tasks');
      firebaseDeviceAppsRef = firebaseApp.database().ref('deviceapps/'+deviceId );

      module.exports.refs.device = firebaseDeviceRef;
      module.exports.refs.userApps = firebaseUserAppsRef;
      module.exports.refs.appstore = firebaseAppstoreRef;
      module.exports.refs.userDevices = firebaseUserDevicesRef;
      module.exports.refs.queue =firebaseQueueRef;
      module.exports.refs.deviceApps = firebaseDeviceAppsRef;

      getAllApps( deviceId, cb );

    }).catch(function (err) {
      debug('Using token: ', token);
      return cb(err);
    });
  },
  refs: {
    // all of the below are populated on init
    // base: firebaseApp.database(),
    // appstore/
    appstore: firebaseAppstoreRef,
    // devices/$deviceId/public
    device: firebaseDeviceRef,
    // users/$userId/devices/$deviceId/apps
    userApps: firebaseUserAppsRef,
    // users/$userId/devices/
    userDevices: firebaseUserDevicesRef,
    // queue/tasks
    queue: firebaseQueueRef,
    // deviceapps/$deviceId
    deviceApps: firebaseDeviceAppsRef,

    // collection keyed by [deviceId][appId]
    installs: firebaseInstalls,

    // device specific collection keyed by [appId]
    deviceAppRefs: firebaseDeviceAppRefMap
  },
  records: {
    apps: firebaseAppRecords,
    //TODO: not populated yet
    devices: firebaseDeviceRecords
  },
  token: userToken
}
