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

//Worker tasks specs
var specs = {
  device_register: {
    error_state: "error",
    finished_state: "device-register-completed",
    in_progress_state: "device-register-in-progress",
    retries: 3,
    start_state: "device-register",
    timeout: 10000
  },
  application_install: {
    error_state: "error",
    in_progress_state: "application-install-in-progress",
    retries: 3,
    start_state: "application-install",
    timeout: 10000
  },
  application_create: {
    error_state: "error",
    in_progress_state: "application-create-in-progress",
    retries: 3,
    start_state: "application-create",
    timeout: 10000
  }
};

/**
 *@method processTask
 *@parameter {Object} spec Json object that follows Firebase worker specs format
 *@parameter {Object} options Json object sent to the worker task
 *@parameter {Object} events Json object with function exectued for each respective worker state (start, progress, finished, error) 
 *@description Copy a file from a specific path to another.
 */
var processTask = function (spec, options, events) {
  debug('Processing a task with ', spec);
  debug('OPTIONS: ', JSON.stringify(options));
  //These events are optional
  var error = !_.has(events, 'error') ? function (err) { } : events.error; //Called when the task finishes in an error state, includes the error (Timeout included)
  var finished = !_.has(events, 'finished') ? function () { } : events.finished; //Called whenever the tasks reaches its final state
  var start = !_.has(events, 'start') ? function () { } : events.start; //Called whenever the task is on its initial state (can happen more than once if spec.retries > 0)
  var progress = !_.has(events, 'progress') ? function () { } : events.progress; //Called whenever the task state changes to progress (can happen more than once if spec.retries > 0)
  
  var key = firebaseQueueRef.push().key;
  var update = {};
  update[key] = options;
  firebaseQueueRef.update(update);
  var timeoutTimer = setTimeout(function () {
    return error(new Error('Timeout processing worker task ' + key));
  }, spec.timeout + (spec.timeout * spec.retries));
  firebaseQueueRef.child(key).on('value', function (dataSnapshot) {
    var task = dataSnapshot.val();

    if (_.isNull(task) || _.isUndefined(task) || (spec.hasOwnProperty('finished_state') && task._state == spec.finished_state)) {
      return finished();
    } else { 
      switch (task._state) {
        case spec.start_state:
          start();
          break;
        case spec.in_progress_state:
          progress();
          break;
        case spec.error_state:
          clearTimeout(timeoutTimer);
          var generatedError = new Error('Error processing task ' + key);
          if (task.hasOwnProperty('_error_details')) generatedError.details = task._error_details; 
          return error(generatedError);
        default:
          clearTimeout(timeoutTimer);
          var generatedError = new Error('Unable to create task ' + key);
          if (task.hasOwnProperty('_error_details')) generatedError.details = task._error_details;
          return error(generatedError);
      }
    }
  });
}

module.exports = {
  init: function (userId, deviceId, token, cb) {
    debug('Init Firebase');
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

install: {
  watch: function(appId, cb){
    firebaseDeviceAppsRef.child(appId + '/public').on('child_changed', function(deviceApp){
      var install = deviceApp.val();
      debug('install.watch>', install);
      if (install.runtime.status === 'pending'){
        console.log('Application installing...');
      } else if ( install.runtime.status === 'inactive'){
        cb(null, 'Application install successful');
      } else if ( install.runtime.status === 'error'){
        cb('Application install error')
      }
    })
  }
},

user:{
  getAllApps: function(cb){
    firebaseUserDevicesRef.on('value', function(data){
      cb(data.val());
    })
  }
},

device: {
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
  },
  list: function(cb){
    firebaseUserDevicesRef.once('value', function( resp ){
      cb(resp.val());
    })
  },
  lookup: function( deviceId, cb ){
    //  TODO: this requires the device to exist, otherwise bugs out, catch error condition
    firebaseApp.database().ref('devices/' + deviceId + '/public').on('value', function (resp) {
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
appstore: {
  get: function(appId, cb){
    firebaseAppstoreRef.child(appId).on('value', function (data) {
      if ( !_.isNull(data.val())){
        cb(data.val())
      }
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
  install: function (token, deviceId, appId, versionId, policy, events) { 
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

function genID(){
  return _.map(Array(16), function(v, i){
    return Math.floor(Math.random()*16).toString(16)
  }).join( '' )
}