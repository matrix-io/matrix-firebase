var firebaseDevices, firebaseAppList, vesFirebase, firebaseAppMap, firebaseAppRecords, firebaseDevice;
var _ = require( 'lodash' );
var D = require('debug');
var debug = new D('firebase')
var F = require( 'firebase' );

firebaseAppRecords = {};
firebaseAppMap = {};

var uuid = require('uuid')
// use child to maintain position
module.exports = {
  init: function ( userId, deviceId, token, cb ) {
    if ( _.isUndefined(userId)){
      return console.error("Firebase init needs userId", userId)
    }

    if ( _.isUndefined(token)){
      return console.error("Firebase init needs token", token)
    }

    var path = '/' + userId +'/devices/'+ deviceId;

    debug('Init Firebase', userId, deviceId, path )


    // firebase = new F( 'https://admobilize.firebaseio.com/appconf' + path);
    firebaseDevice = new F( 'https://admobilize-testing.firebaseio.com/devices/' + deviceId );
    firebaseAppList = new F( 'https://admobilize-testing.firebaseio.com/users/' + userId + '/devices/'+ deviceId + '/apps' );

    console.log('==========='.rainbow, token)

    //   var config = {
    //   apiKey: "AIzaSyC44wzkGlODJoKyRGbabB8TiRJnq9k7BuA",
    //   authDomain: "admobilize-testing.firebaseapp.com",
    //   databaseURL: "https://admobilize-testing.firebaseio.com",
    //   storageBucket: "admobilize-testing.appspot.com",
    // };
    // firebase.initializeApp(config);


    firebaseDevice.authWithCustomToken(token, function(err, authData) {
      if(err) {  return cb(err);    }
      debug('Firebase successful for: device')
    });

    firebaseAppList.authWithCustomToken(token, function (err, authData) {
      if(err) {  return cb(err);    }
      debug('Firebase successful for: appList');
      getAllApps(deviceId, cb);
    })
},

// for integrating with VES server
ves: {
  init: function(options, cb){
    // options : userId, token, deviceId, deviceRecordId,

    console.warn('firebase VES is undefined right now')
    return;
    /*
    if ( _.isUndefined(options.userId)){
    return console.error("VES Firebase init needs userId", options.userId)
  }

  if ( _.isUndefined(options.token)){
  return console.error("VES Firebase init needs token", options.token)
}

if ( _.isUndefined(options.deviceRecordId)){
return console.error("VES Firebase init needs deviceRecordId")
}

var F = require( 'firebase' );
vesFirebase = new F( 'https://admobilize.firebaseio.com/VES/' + options.deviceRecordId + '/');

vesFirebase.authWithCustomToken(options.token, function(err, authData) {
if(err) {
if(err.code === 'INVALID_CREDENTIALS') {
return cb('Invalid Firebase credentials', err);
}
console.warn('Unhandled Firebase error condition', err);
return cb(err);
}

debug('VES Firebase auth successful for user %s', authData.auth.uid);

var authData = firebase.getAuth();
if (authData) {
debug("VES Firebase:", firebase.toString());
} else {
console.log("User is logged out");
}
var plugs = {
mxss: {
deviceId: options.deviceId,
user: options.username,
url: options.streamingServer + '?deviceToken=' + options.deviceSecret,
'url': '192.168.99.100:3000',
},
firebase: {
"apiEndpoint": "http://demo.admobilize.com/v1/device/token",
"url": "https://admobilize.firebaseio.com/VES/"
}
}


var obj = {
// make in the future so VES provisioning works right
'createdAt': Date.now()+100000,
'deviceId': options.deviceId,
'instance': {
// debug
'ipAddress': '192.168.99.1',
'zone': 'us-central1-b'
},
'userId': options.userId,
'deviceSecret': options.deviceSecret,
'schema': options.schema,
'source': 'rtsp://dummy',
plugins: plugs
}


// clear instance
vesFirebase.set(null);

vesFirebase.set(obj);


vesFirebase.on('child_changed', function(newVal){
console.log('VES FIREBASE △', newVal.key().blue, ':', newVal.val())
// will respond with instance data
cb(null, newVal.val())
});
});
},
onStatusChange: function(cb){
vesFirebase.child('instance/status').on('child_changed', cb)
}*/
}},

device: {
  get: function ( cb ) {
    firebaseDevice.on( 'value', function ( s ) {
      if ( !_.isNull( s.val() ) ) cb( null, s.val() )
    }, function ( e ) {
      if ( !_.isNull( s.val() ) ) cb( e )
    } )
  },
  meta: function( deviceId, cb ){
    firebaseDevice.child('meta').once('value',  function ( s ) {
      cb( null, s.val() )
    }, function ( e ) {
      cb( e )
    })
  }
},

app: {
  appKeys : appKeys,
  add: function ( config, policy ) {
    var newAppId = uuid.v4();
    var appName = config.name;
    // user-device record
    var o = {};
    o[newAppId] = { name: appName };
    firebaseAppList.set(o);

    // deviceapps
    firebaseApps.child( appId + '/config' ).set( config )

    if ( !_.isUndefined(policy)){
      firebaseApps.child( appId + '/policy' ).set( policy )
    }

    firebaseApps.child(appId + '/meta').set({ name: appName })
  },

  setConfig: function (  deviceId, appId, config ) {
    firebaseAppMap[appId].child('config/').set( config )
  },

  updateConfig: function (  appId, config ) {
    firebaseAppMap[appId].child('config/').update( config )
  },

  get: function (  appId, cb ) {
    debug(appId.blue + ' (config)>'.grey)
    firebaseAppMap[appId].once( 'value', function ( s ) {
      cb( null, s.val() )
    }, function ( e ) {
      if ( !_.isNull( s.val() ) ) cb( e )
    })
  },

  getPolicy: function( deviceId, appId, cb ){
    firebaseApps.child( appId + '/policy').on('value', function(data){
      debug('app.policy>', data)
      cb(null, data)
    })
  },
  getMeta: function( deviceId, appId, cb ){
    firebaseApps.child( appId + '/meta').on('value', function(data){
      debug('app.meta>', data)
      cb(null, data)
    })
  },
  watchRuntime: function( deviceId, appId, cb ){
    firebaseApps.child( appId + '/runtime').on('child_changed', function(data){
      debug('app.runtime>', data)
      cb(data.val())
    })
  },
  watchConfig: function( deviceId, appId, cb ){
    firebaseApps.child( appId + '/config').on('child_changed', function(data){
      debug('app.config>', data)
      cb(data.val())
    })
  },
  getAll: getAllApps,
  getIDForName( appName, cb){
    firebaseAppList.orderByKey().on('value', function(data){
      var app = _.map(data, function (app) {
        return (app.name == appName)
      });
      if ( app.length === 0 ){
        return cb(new Error('No firebase application by that name:' + appName))
      }
      app = app[0];
      cb(null, app.key );
    })
  },

  //
  remove: function ( appId, cb ) {
    if ( appId ){
      // deviceapps
      firebaseAppMap[appId].remove(cb);

      // user-device list
      firebaseAppList.child(appId).remove();
      delete firebaseAppList[appId];
    }
  },
  onInstall: function( cb ){
    firebaseAppList.on('child_added', function(n){
      cb();
    });
  },
  onChange: function(appId, cb ){
    firebaseAppMap[appId].on('child_changed', function(n){
      cb();
    });
  }
}

function getAllApps( deviceId, cb ){
  appKeys = {};
  firebaseAppList.orderByKey().on('value', function(data){
    debug('app.getAll>', data.key(), data.val());
    // store for use later

    if ( !_.isNull(data.val()) ){

      var appMap = data.val();

      _.each(appMap, function(app, appId){
        debug(app);
        var fbApp = new F( 'https://admobilize-testing.firebaseio.com/deviceapps/' + [ deviceId, appId ].join('/') + '/public');
        firebaseAppMap[appId] = fbApp;

        fbApp.on('value', function(d){
          debug('app>', app.name, d.val())
          firebaseAppRecords[appId] = d.val();
        });
      })
      // make apps collection available

    }

    cb(null, data);
  })
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

function genID(){
  return _.map(Array(16), function(v, i){
    return Math.floor(Math.random()*16).toString(16)
  }).join( '' )
}
console.log(genID())
