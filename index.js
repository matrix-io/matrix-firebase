
var firebaseUserAppsRef;
var firebaseAppstoreRef;
var firebaseAppRefMap;
var firebaseAppRecords;
var firebaseDeviceRef;
var firebaseUserDevicesRef;
var firebaseQueueRef;
var firebaseDeviceAppsRef;
var refreshApps;
var userToken;

var firebaseApp;

var _ = require( 'lodash' );
var D = require('debug');
var debug = new D('firebase')
var F = require('firebase');
var async = require('async');
var uuid = require('uuid')

firebaseAppRecords = {};
firebaseAppRefMap = {};

module.exports = {
  init: function ( userId, deviceId, token, cb ) {
    if (_.isUndefined(userId)) return console.error('Firebase init needs userId', userId);
    if (_.isUndefined(token)) return console.error('Firebase init needs token', token);

    debug('Init Firebase', userId, deviceId);
    debug('=====firebase====='.rainbow, token, '🔥 🔮')

    userToken = token;
    var config = {
      apiKey: 'AIzaSyC44wzkGlODJoKyRGbabB8TiRJnq9k7BuA',
      authDomain: 'admobilize-testing.firebaseapp.com',
      databaseURL: 'https://admobilize-testing.firebaseio.com',
      storageBucket: 'admobilize-testing.appspot.com',
    };

    firebaseApp = F.initializeApp(config);

    firebaseApp.auth().signInWithCustomToken(token).then(function(user) {
      debug('Successful auth', user, token);
      firebaseDeviceRef = firebaseApp.database().ref('devices/' + deviceId + '/public');
      firebaseUserAppsRef = firebaseApp.database().ref('users/' + userId + '/devices/'+ deviceId + '/apps' );
      firebaseAppstoreRef = firebaseApp.database().ref('appstore');
      firebaseUserDevicesRef = firebaseApp.database().ref('users/' + userId + '/devices');
      firebaseQueueRef = firebaseApp.database().ref('queue/tasks');
      firebaseDeviceAppsRef = firebaseApp.database().ref('deviceapps/' + deviceId );
      getAllApps( deviceId, cb );
      cb();
    }).catch(function (err) {
      if (err) {
        console.log('Authentication error: ', err);
      } else {
        console.log('Failed auth with no error!!!');
      }
      console.log('Using token: ', token);
      return process.exit();
    });


    /*F.auth().onAuthStateChanged(function(user) {
      if (user) {
        // User is signed in.
        console.log('AUTH WITH: ', user);
      } else {
        // No user is signed in.
        console.log('AUTH WITH No user');
      }
    });*/
},


device: {
  //based on matrix-data-objects / docs / deviceregistration.md
  // send to `queue/tasks`
  /*{
  '_state': 'register-device',
  'token': 'user-token-here',
  'device': {
    'meta': {
      'type': 'matrix',
      'osVersion': 'some-raspian-version',
      'version': 'some-mos-version',
      'hardwareId': 'some-hw-identifier'
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
       cb( e )
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
storage: {
  upload: function () {
  }
}
,
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
        firebaseUserAppsRef.set(o, cb);
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
  install: function (token, deviceId, appId, versionId, policy, cb) {
    var options = {
      _state: 'application-install',
      token: userToken,
      deviceId: deviceId,
      appId: appId,
      versionId: versionId,
      policy: policy
    };
    var key = firebaseQueueRef.push().key;

    // update deviceapps/
    var update = {};
    update[key] = options;

    firebaseQueueRef.update(update);

    // rest of firebase update is handled by worker
    cb();
  },
  deploy: function (token, deviceId, userId, appData, cb) {
    appData.acl = {
      ownerId: userId
    };
    var options = {
      _state: 'application-create',
      token: userToken,
      app: appData
    };
    firebaseQueueRef.push(options, cb);
  },
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
  watchDeviceApps: function(cb){
    console.log('deviceapps!')
    firebaseDeviceAppsRef.on('child_added', function(data){
      console.log('add', data.val())
      cb(data.val())
    })
  },
  watchDeviceAppChanges: function(cb){
    console.log('changes!')
    firebaseDeviceAppsRef.on('child_changed', function(data){
      console.log('change', data.val())
      cb(data.val())
    })
  },
  getAll: getAllApps,
  getApps: getAppsInAppstore,
  getIDForName: function( appName, cb){
    firebaseUserAppsRef.orderByChild('name').equalTo(appName).on('value', function(data){
      debug( firebaseUserAppsRef.toString(), data.key(), '>>>>', data.val() )
      if ( _.isNull(data.val()) ){
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
  return firebaseApp.database().ref('deviceapps/' + [ deviceId, appId ].join('/') + '/public');
}

function getAllApps( deviceId, cb ){
  appKeys = {};
  firebaseUserAppsRef.orderByKey().once('value', function(data){
    debug('app.getAll>', data.val());
    // store for use later

    if ( !_.isNull(data.val()) ){

      var appMap = data.val();

      async.eachOf(appMap, function(app, appId, callback){
        var fbApp = firebaseApp.database().ref('deviceapps/' + [ deviceId, appId ].join('/') + '/public');
        firebaseAppRefMap[appId] = fbApp;


          fbApp.once('value', function(d){
            debug('[fb]dev-app>', app.name, d.val())
            firebaseAppRecords[appId] = d.val();
            callback();
          });
      }, cb)

    } else {
      cb('No apps available for', deviceId )
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

function genID(){
  return _.map(Array(16), function(v, i){
    return Math.floor(Math.random()*16).toString(16)
  }).join( '' )
}
