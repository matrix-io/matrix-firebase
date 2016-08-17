var firebaseDevices;
var firebaseAppListRef;
var firebaseAppRefMap;
var firebaseAppRecords;
var firebaseDeviceRef;
var firebaseUserDevicesRef;
var firebaseQueueRef;

var _ = require( 'lodash' );
var D = require('debug');
var debug = new D('firebase')
var F = require( 'firebase' );

var async = require('async');

var refreshApps;

var userToken;

firebaseAppRecords = {};
firebaseAppRefMap = {};

var uuid = require('uuid')
// use child to maintain position
module.exports = {
  init: function ( userId, deviceId, token, cb ) {
    if ( _.isUndefined(userId)){
      return console.error('Firebase init needs userId', userId)
    }

    if ( _.isUndefined(token)){
      return console.error('Firebase init needs token', token)
    }

    var path = '/' + userId +'/devices/'+ deviceId;

    debug('Init Firebase', userId, deviceId, path )


    // firebase = new F( 'https://admobilize.firebaseio.com/appconf' + path);
    firebaseDeviceRef = new F( 'https://admobilize-testing.firebaseio.com/devices/' + deviceId + '/public');
    firebaseAppListRef = new F( 'https://admobilize-testing.firebaseio.com/users/' + userId + '/devices/'+ deviceId + '/apps' );
    firebaseUserDevicesRef = new F('https://admobilize-testing.firebaseio.com/users/' + userId + '/devices/' )

    firebaseQueueRef = new F('https://admobilize-testing.firebaseio.com/queue/tasks')

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

    firebaseUserDevicesRef.authWithCustomToken(token, function(err) {
      if(err) {  return cb(err);    }
      debug('Firebase successful for: device')
    });

    firebaseQueueRef.authWithCustomToken(token, function(err){
      if (err) return cb(err);
      debug('Firebase successful for: worker queue')
    })


    firebaseDeviceRef.authWithCustomToken(token, function(err) {
      if(err) {  return cb(err);    }
      debug('Firebase successful for: device')
    });

    firebaseAppListRef.authWithCustomToken(token, function (err) {
      if(err) {  return cb(err);    }
      debug('Firebase successful for: appList');
      refreshApps();
    })

    userToken = token;
},


device: {
  //based on matrix-data-objects / docs / deviceregistration.md
  // send to `queue/tasks`
  /*{
  "_state": "register-device",
  "token": "user-token-here",
  "device": {
    "meta": {
      "type": "matrix",
      "osVersion": "some-raspian-version",
      "version": "some-mos-version",
      "hardwareId": "some-hw-identifier"
      name and description optional
    }
  }
  }
  */
  add: function( options, cb ){
    var o = {
      _state: 'register-device',
      token: userToken,
      device: { meta: {} }
    };

    // add
    _.extend(o.device.meta, options)

    debug('[FB] + device', o);
    firebaseQueueRef.push(o, cb);
  },
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
  meta: function( cb ){
    firebaseDeviceRef.child('meta').once('value',  function ( s ) {
      cb( null, s.val() )
    }, function ( e ) {
      cb( e )
    })
  }
},

app: {
  appKeys : appKeys,
  add: function ( deviceId, config, policy ) {
    var newAppId = uuid.v4();
    var appName = config.name;

    var newAppRef = getFirebaseAppRef(deviceId, newAppId);
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
        newAppRef.child( '/config' ).set( config, cb )

      },
      function setAppPolicy(cb){
        // set policy
        if ( !_.isUndefined(policy)){
          newAppRef.child( '/policy' ).set( policy, cb )
        } else { cb(); }

      },
      function setAppMeta(cb){
        // set meta
        newAppRef.child('/meta').set({ name: appName }, cb)
      },
    ], function(err){
      if (err) console.error(err);

      console.log(appName, newAppId, 'added to firebase ->', deviceId)
      refreshApps();
    })
  },

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
  watchConfig: function( appId, cb ){
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

function getFirebaseAppRef( deviceId, appId ){
  return new F( 'https://admobilize-testing.firebaseio.com/deviceapps/' + [ deviceId, appId ].join('/') + '/public');
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
          fbApp.once('value', function(d){
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
