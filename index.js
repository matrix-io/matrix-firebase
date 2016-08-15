var firebaseDevices, firebaseAppListRef, vesFirebase, firebaseAppRefMap, firebaseAppRecords, firebaseDeviceRef;
var _ = require( 'lodash' );
var D = require('debug');
var debug = new D('firebase')
var F = require( 'firebase' );

var async = require('async');

var refreshApps;

firebaseAppRecords = {};
firebaseAppRefMap = {};

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
    firebaseDeviceRef = new F( 'https://admobilize-testing.firebaseio.com/devices/' + deviceId + '/public');
    firebaseAppListRef = new F( 'https://admobilize-testing.firebaseio.com/users/' + userId + '/devices/'+ deviceId + '/apps' );
    firebaseUserDevicesRef = new F('https://admobilize-testing.firebaseio.com/users/' + userId + '/devices/' )

    debug('=====firebase====='.rainbow, token, '🔥 🔮')

    //   var config = {
    //   apiKey: "AIzaSyC44wzkGlODJoKyRGbabB8TiRJnq9k7BuA",
    //   authDomain: "admobilize-testing.firebaseapp.com",
    //   databaseURL: "https://admobilize-testing.firebaseio.com",
    //   storageBucket: "admobiliz e-testing.appspot.com",
    // };
    // firebase.initializeApp(config);

    refreshApps = function(){
      getAllApps(deviceId, token, cb);
    }

    firebaseUserDevicesRef.authWithCustomToken(token, function(err, authData) {
      if(err) {  return cb(err);    }
      debug('Firebase successful for: device')
    });



    firebaseDeviceRef.authWithCustomToken(token, function(err, authData) {
      if(err) {  return cb(err);    }
      debug('Firebase successful for: device')
    });

    firebaseAppListRef.authWithCustomToken(token, function (err, authData) {
      if(err) {  return cb(err);    }
      debug('Firebase successful for: appList');
      refreshApps();
    })
},


device: {
  get: function ( cb ) {
    firebaseDeviceRef.on( 'value', function ( s ) {
      if ( !_.isNull( s.val() ) ) cb( null, s.val() )
    }, function ( e ) {
      if ( !_.isNull( s.val() ) ) cb( e )
    } )
  },
  getConfig: function ( cb ) {
    firebaseDeviceRef.child('/config').on( 'value', function ( s ) {
       cb( null, s.val() )
    }, function ( e ) {
      cb( e )
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
    //
    //
    async.parallel([
      function setAppList(cb){
        var o = {};
        o[newAppId] = { name: appName };
        firebaseAppListRef.set(o, cb);
      },
      function setAppConfig(cb){
        // deviceapps
        firebaseAppsRef.child( appId + '/config' ).set( config, cb )

      },
      function setAppPolicy(cb){
        // set policy
        if ( !_.isUndefined(policy)){
          firebaseAppsRef.child( appId + '/policy' ).set( policy, cb )
        } else { cb(); }

      },
      function setAppMeta(cb){

        // set meta
        firebaseAppsRef.child(appId + '/meta').set({ name: appName })
      },
    ], function(err){
      refreshApps();
    })
  },

  setConfig: function (  deviceId, appId, config ) {
    firebaseAppRefMap[appId].child('config/').set( config )
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

  list: function( cb ) {
    firebaseAppListRef.on('value', function(data){
      debug('app.list>', data.val());
      cb(null, data.val());
    });
  },

  getConfig: function( appId, cb ){
    firebaseAppRefMap[appId].child('/config').on('value', function(data){
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
  watchConfig: function( deviceId, appId, cb ){
    firebaseAppRefMap[appId].child('/config').on('child_changed', function(data){
      debug('app.config>', data.val())
      cb(data.val())
    })
  },
  getAll: getAllApps,
  getIDForName( appName, cb){
    firebaseAppListRef.orderByChild('name').equalTo(appName).on('value', function(data){
      debug('>>>>', data.val())
      if ( _.isNull(data.val()) ){
        return cb(new Error('No firebase application by that name:' + appName))
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
  onInstall: function( cb ){
    firebaseAppList.on('child_added', function(n){
      cb();
    });
  },
  onChange: function(appId, cb ){
    firebaseAppRefMap[appId].on('child_changed', function(n){
      cb();
    });
  }
}
}

function getAllApps( deviceId, token, cb ){
  appKeys = {};
  firebaseAppListRef.orderByKey().on('value', function(data){
    debug('app.getAll>', data.key(), data.val());
    // store for use later

    if ( !_.isNull(data.val()) ){

      var appMap = data.val();

      _.each(appMap, function(app, appId){
        debug(appId);
        var fbApp = new F( 'https://admobilize-testing.firebaseio.com/deviceapps/' + [ deviceId, appId ].join('/') + '/public');
        firebaseAppRefMap[appId] = fbApp;

        fbApp.authWithCustomToken(token, function(err, authData) {
          if(err) {  return cb(err);    }
          debug('Firebase successful for app:', app.name)
          fbApp.on('value', function(d){
            debug('app>', app.name, d.val())
            firebaseAppRecords[appId] = d.val();
            cb(null, data);
          }, cb);
        });


      })
      // make apps collection available

    } else {
      console.warn('No apps available for', deviceId )
      cb()
    }

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
