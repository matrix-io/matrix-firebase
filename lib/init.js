var firebaseUserAppsRef;
var firebaseAppstoreRef;
var firebaseInstalls;
var firebaseAppRecords;
var firebaseDeviceRef;
var firebaseUserDevicesRef;
var firebaseQueueRef;
var firebaseDeviceAppsRef;
var firebaseDeviceRecords = {};

var firebaseApp;

var F = require('firebase');


function getAllDevices(cb){
  var deviceIds = [];
  firebaseUserDevicesRef.once('value', function(resp){
    if ( resp.exists() ){
      deviceIds.push(resp.key());
      async.each( deviceIds, function( id, cb ){
        firebaseDeviceRef.child( id + '/public' ), function(resp){
          if ( resp.exists() ){
            firebaseDeviceRecords[id] = resp.val();
          }
          cb();
        })
      }, cb);
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

    debug('=====🔥 firebase 📇====='.rainbow, token, )

    var config = {
      apiKey: 'AIzaSyC44wzkGlODJoKyRGbabB8TiRJnq9k7BuA',
      authDomain: 'admobilize-testing.firebaseapp.com',
      databaseURL: 'https://admobilize-testing.firebaseio.com',
      storageBucket: 'admobilize-testing.appspot.com',
    };

    firebaseApp = F.initializeApp(config);

    firebaseApp.auth().signInWithCustomToken(token).then(function(user) {
      debug('Firebase Auth Success');
      firebaseDeviceRef = firebaseApp.database().ref('devices/' + deviceId + '/public');
      firebaseUserAppsRef = firebaseApp.database().ref('users/' + userId + '/devices/'+ deviceId + '/apps' );
      firebaseAppstoreRef = firebaseApp.database().ref('appstore');
      firebaseUserDevicesRef = firebaseApp.database().ref('users/' + userId + '/devices');
      firebaseQueueRef = firebaseApp.database().ref('queue/tasks');
      firebaseDeviceAppsRef = firebaseApp.database().ref('deviceapps/'+deviceId );
      getAllApps( deviceId, cb );

    }).catch(function (err) {
      debug('Using token: ', token);
      return cb(err);
    });
  },
  refs: {
    base: firebaseApp.database(),
    appstore: firebaseAppstoreRef,
    device: firebaseDeviceRef,
    userApps: firebaseUserAppsRef,
    userDevices: firebaseUserDevicesRef,
    queue: firebaseQueueRef,
    deviceApps: firebaseDeviceAppsRef,

    // keyed by [deviceId][appId]
    installs: firebaseInstalls
  },
  records: {
    apps: firebaseAppRecords,
    devices: firebaseDeviceRecords
  }
}
