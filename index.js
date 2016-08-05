var firebaseDevices, firebaseAppList, vesFirebase, firebaseApps;
var _ = require( 'lodash' );
var D = require('debug');
var debug = new D('firebase')


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


    var F = require( 'firebase' );
    // firebase = new F( 'https://admobilize.firebaseio.com/appconf' + path);
    firebaseDevice = new F( 'https://admobilize-testing.firebaseio.com/devices/' + deviceId + '/public' );
    firebaseAppList = new F( 'https://admobilize-testing.firebaseio.com/users/' + deviceId + '/devices/'+ deviceId + '/apps' );

    console.log('==========='.rainbow, token)

    //   var config = {
    //   apiKey: "AIzaSyC44wzkGlODJoKyRGbabB8TiRJnq9k7BuA",
    //   authDomain: "admobilize-testing.firebaseapp.com",
    //   databaseURL: "https://admobilize-testing.firebaseio.com",
    //   storageBucket: "admobilize-testing.appspot.com",
    // };
    // firebase.initializeApp(config);
    firebase.authWithCustomToken(token, function(err, authData) {
      log('catch!')
      if(err) {
        debug(err, authData);
        if(err.code === 'INVALID_CREDENTIALS') {
          return cb('Invalid Firebase credentials', err);
        }
        debug('Unhandled Firebase error condition', err);
        return cb(err);
      }

      log('then!')
      debug('Firebase auth successful for user', authData);

      var authData = firebase.getAuth();
      if (authData) {
        debug("Firebase:", firebase.toString());
      } else {
        debug("User is logged out");
      }

      // populate local app index
      getAllApps();

      cb(null, { userId: authData.auth.uid })
    });

    firebase.on( 'value',
    function ( snap ) {
      console.log( 'FB>', snap.val() )
    },
    function ( err ) {
      console.log( 'Firebase Error', err );
    }
  );
},

device: firebaseDevice,
appList: firebaseAppList,
apps: firebaseApps,
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
  add: function ( deviceId, appId, config ) {
    if (arguments.length === 3){
      firebase.child( ['deviceapps', deviceId, appId].join('/') ).set( config )
    }
    if (arguments.length === 2){
      // assume config, gen ID
      firebase.child( ['deviceapps', deviceId, appId].join('/') ).set( config )
    } else {
      console.error('firebase error on app.add')
    }
  },
  set: function (  deviceId, appId, config ) {
    firebase.child(['deviceapps', deviceId, appId].join('/')).set( config )
  },
  update: function (  deviceId, appId, config ) {
    firebase.child(['deviceapps', deviceId, appId].join('/') ).update( config )
  },
  get: function (   deviceId, appId, cb ) {
    debug(appId.blue + ' (config)>'.grey)
    firebase.child( ['deviceapps', deviceId, appId].join('/') ).once( 'value', function ( s ) {
      cb( null, s.val() )
    }, function ( e ) {
      if ( !_.isNull( s.val() ) ) cb( e )
    })
  },
  getPolicy: function( deviceId, appId, cb ){
    firebase.child(['deviceapps', deviceId, appId].join('/') + '/policy').on('value', function(data){
      debug('app.policy>', data)
      cb(null, data)
    })
  },
  getMeta: function( deviceId, appId, cb ){
    firebase.child(['deviceapps', deviceId, appId].join('/')+ '/meta').on('value', function(data){
      debug('app.meta>', data)
      cb(null, data)
    })
  },
  watchRuntime: function( deviceId, appId, cb ){
    firebase.child(['deviceapps', deviceId, appId].join('/') + '/runtime').on('child_changed', function(data){
      debug('app.runtime>', data)
      cb(data.val())
    })
  },
  watchConfig: function( deviceId, appId, cb ){
    firebase.child(['deviceapps', deviceId, appId].join('/') + '/config').on('child_changed', function(data){
      debug('app.config>', data)
      cb(data.val())
    })
  },
  getAll: getAllApps,
  getConfigByName( deviceId, appName, cb ){
    var appId = getAppKeyFromName(appName);
    firebase.child(['deviceapps', deviceId, appId].join('/') ).on('value', function(data){
      cb(null, data.val().config );
    })
  },
  getIDForName( appName, cb){
    firebase.child('apps/').orderByKey().on('value', function(data){
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
  remove: function ( appId, cb ) {
    appId = checkId(appId);
    if ( appId ){
      firebase.child( 'apps/' + appId ).remove( cb );
    }
  },
  onInstall: function( cb ){
    firebase.child( 'apps/' ).on('child_added', function(n){
      cb();
    });
  },
  onChange: function(appId, cb ){
    firebase.child(  'apps/' + appId ).on('child_changed', function(n){
      cb();
    });
  }
}
}

function getAllApps( cb ){
  appKeys = {};
  firebaseAppList.orderByKey().on('value', function(data){
    // store for use later
    appKeys[data.key()] = data.val().name;

    var fbApp = new F( 'https://admobilize-testing.firebaseio.com/deviceapps/' + data.key() + '/public');

    // make apps collection available
    fbApp.on('value', function(data){
      firebaseApps.push(data.val());;
    });


    debug('app.getAll>', data);
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
