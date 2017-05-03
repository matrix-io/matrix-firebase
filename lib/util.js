// TODO: Consider merging helpers into util


var debug = new DebugLog('firebase:util')

var firebaseUserRef;
var firebaseUserAppsRef;
var firebaseAppstoreRef;
var firebaseInstalls = {};
var firebaseDeviceAppRefMap = {};
var firebaseAppRecords = {};
var firebaseDeviceRef;
var firebaseUserDevicesRef;
var firebaseQueueRef;
var firebaseDeviceAppsRef;
var firebaseDeviceRecords = {};

var firebaseUserMetaRef;

var userAppRecords = {};

var firebaseApp = {};

var userToken;

var F = require('firebase');

function getAllApps( deviceId, cb ){
  appKeys = {};
  firebaseUserAppsRef.orderByKey().once('value', function(data){
    // debug('app.getAll>', _.map(data.val(), 'name') );
    // store for use later

    if ( data.exists() ){

      module.exports.records.apps = data.val();
      var appMap = data.val();

      async.eachOf(appMap, function(meta, appId, cb){
        debug('>>>>'.rainbow, appId, meta.name)
        var fbApp = firebaseApp.database().ref('deviceapps/' + [ deviceId, appId ].join('/') + '/public');

        firebaseInstalls[deviceId] = {};
        firebaseDeviceAppRefMap[appId] = fbApp;
        firebaseInstalls[deviceId][appId] = fbApp;
        fbApp.once('value', function(d){
          if ( d.exists() ){

            debug('[fb]installed-app>', meta.name )
            if ( !_.has(d.val(), 'meta') ){
              console.warn('deviceapps record without meta!')
            } else if ( meta.name === d.val().meta.name ) {
              debug(meta.name, '✅')
            } else {
              console.warn(meta.name, 'is not in `deviceapps`'.yellow )
            }
            firebaseAppRecords[appId] = d.val();
          }
          cb();
        }, function empty(){
          debug('deviceapps', deviceId, appId, '/public does not exist');
          cb();
        });
      }, function(){
        debug('done mapping app records')
        cb(null, deviceId );
      })


    } else {
      // no apps found
      //
      module.exports.records.apps = null;
      debug('no apps found')
      cb(null, deviceId )
    }

  })
}

function checkConnection() {
        var connected = firebaseApp.database().ref(".info/connected");
        var status = false;
        connected.on("value", function(snap) {
                status = snap.val() === true ? true : false;
        });
        return status;
}


module.exports = {
  init: function (userId, deviceId, token, env, cb) {
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

    // debug('=====🔥 firebase 📇=====', token )

    var config = {
      apiKey: 'AIzaSyC44wzkGlODJoKyRGbabB8TiRJnq9k7BuA',
      authDomain: 'admobilize-testing.firebaseapp.com',
      databaseURL: 'https://admobilize-testing.firebaseio.com',
      storageBucket: 'admobilize-testing.appspot.com',
    };

    if (env === 'rc' || env === 'production'){
      debug('using rc / production firebase')
      config = {
        apiKey: 'AIzaSyAN1gE6FoR2jKA8QElDpZ836iZS9wzUBwo',
        authDomain: 'admobilize-production.firebaseapp.com',
        databaseURL: 'https://admobilize-production.firebaseio.com',
        storageBucket: 'admobilize-production.appspot.com',
      };
    }

    firebaseApp = F.initializeApp(config);

    async.doUntil(function(){
        firebaseApp.auth().signInWithCustomToken(token).then(function(user) {
          module.exports.refs.base = firebaseApp.database();
          debug('Firebase Auth Success');
          firebaseDeviceRef = firebaseApp.database().ref('devices/' + deviceId + '/public');
          firebaseUserRef = firebaseApp.database().ref('users/' + userId );
          firebaseUserAppsRef = firebaseApp.database().ref('users/' + userId + '/devices/'+ deviceId + '/apps' );
          firebaseAppstoreRef = firebaseApp.database().ref('appstore');
          firebaseUserDevicesRef = firebaseApp.database().ref('users/' + userId + '/devices');
          firebaseUserMetaRef = firebaseApp.database().ref('users/' + userId + '/meta');
          firebaseQueueRef = firebaseApp.database().ref('queue/tasks');
          firebaseDeviceAppsRef = firebaseApp.database().ref('deviceapps/'+deviceId );
          module.exports.token = token;
          module.exports.refs.device = firebaseDeviceRef;
          module.exports.refs.userApps = firebaseUserAppsRef;
          module.exports.refs.appstore = firebaseAppstoreRef;
          module.exports.refs.user = firebaseUserRef;
          module.exports.refs.userDevices = firebaseUserDevicesRef;
          module.exports.refs.userMeta = firebaseUserMetaRef;
          module.exports.refs.queue =firebaseQueueRef;
          module.exports.refs.deviceApps = firebaseDeviceAppsRef;

          getAllApps( deviceId, cb );

        }).catch(function (err) {
          debug('Using token: ', token);
          return cb(err);
        });
      }, checkConnection());
  },

  refs: {
    // all of the below are populated on init
    // base: firebaseApp.database(),
    // appstore/
    appstore: firebaseAppstoreRef,
    // devices/$deviceId/public
    device: firebaseDeviceRef,
    // users/$userId
    user: firebaseUserRef,
    // users/$userId/devices/$deviceId/apps
    userApps: firebaseUserAppsRef,
    // users/$userId/devices/
    userDevices: firebaseUserDevicesRef,

    userMeta: firebaseUserMetaRef,
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
