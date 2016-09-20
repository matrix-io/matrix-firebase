var refs = require('./util').refs;

module.exports = {

  setConfig: function ( appId, config, cb ) {
    debug('set Config [fb]>', appId, config)
    refs.deviceApps.child( appId )
    .child('public/config')
    .set( config, cb )
  },

  updateConfig: function (  appId, config ) {
    refs.deviceApps.child( appId )
    .child('config/')
    .update( config )
  },

  // looks up value in refmap from init
  get: function (  appId, cb ) {
    refs.deviceApps.child( appId )
    .on('value', function(data){
      debug('app>', data.val())
      cb(null, data.val())
    })
  },

  //TODO: Refactor so params are options coming in
  install: function (token, deviceId, appId, versionId, policy, events ) {
    var options = {
      deviceId: deviceId,
      appId: appId,
      versionId: versionId,
      policy: policy
    };

    require('./helpers').startAppInstall(options, events);

  }, //install ends

  //TODO: Refactor so params are options coming in
  uninstall: function (token, deviceId, appId, events ) {
    var options = {
      deviceId: deviceId,
      appId: appId,
    };

    require('./helpers').startAppUninstall(options, events);

  },

  //TODO: refactor so params are options coming in
  deploy: function (token, deviceId, userId, appData, events) {
    appData.acl = {
      ownerId: userId
    };
    var options = {
      app: appData
    };

    require('./helpers').startAppDeploy(options, events);

  }, //deploy ends
  list: function( cb ) {
    refs.userApps.on('value', function(data){
      debug('app.list>', data.val());
      cb(null, data.val());
    });
  },
  
  search: function(needle, cb){
    refs.appstore.orderByChild('meta/name')
    .startAt(needle)
    .once('value', function(data){
        cb(data.val());
    })
  },

  getConfig: function( appId, cb ){
    debug('getConfig>', appId);
    refs.deviceApps.child( appId )
    .child('public/config')
    .once('value', function(data){
      debug('app.config>', data.val())
      cb(null, data.val())
    })
  },

  getConfigKey: function( appId, key, cb ){
    refs.deviceApps.child( appId )
    .child('public/config/' + key)
    .on('value', function(data){
      debug('app.config>', data.val())
      cb(null, data.val())
    })
  },

  setConfigKey: function( appId, key, value, cb ){
    debug('config>', key, value);
    refs.deviceApps.child( appId )
    .child('public/config/' + key)
    .set(value, cb);
  },

  getPolicy: function( appId, cb ){
    refs.deviceApps.child( appId )
    .child('public/policy')
    .once('value', function(data){
      debug('app.policy>', data.val())
      if ( data.exists() ){
        cb(null, data.val())
      } else {
        cb(null, {})
      }
    }, cb)
  },
  getMeta: function( appId, cb ){
    refs.deviceApps.child( appId )
    .child('public/meta')
    .once('value', function(data){
      debug('app.meta>', data.val())
      if ( data.exists() ){
        cb(null, data.val())
      }else {
        cb('no app meta found')
      }
    }, cb)
  },

  getRuntime: function( appId, cb ){
    refs.deviceApps.child( appId )
    .child('public/runtime')
    .on('value', function(data){
      debug('app.runtime>', data.val())
      cb(null, data.val())
    })
  },
  watchRuntime: function( appId, cb ){
    refs.deviceApps.child( appId )
    .child('public/runtime')
    .on('child_changed', function(data){
      debug('app.runtime>', data.val())
      cb(data.val())
    })
  },
  watchConfig: function( appId, cb ){
    refs.deviceApps.child( appId )
    .child('public/config')
    .on('child_changed', function(data){
      debug('app.config>', data.val())
      cb(data.val())
    })
  },
  watchUserApps: function(cb){
    refs.userApps.on('child_added', function(data){
      if ( data.exists() ){
        cb(data.key);
      }
    })
  },
  watchUserAppsRemoval: function(cb){
    refs.userApps.on('child_removed', function (data) {
      debug('Content of child removed: ', data.val());
      if ( data.exists() ){
        var app = {
          id: data.key,
          name: data.val().name 
        };
        cb(app);
      }
    })
  },
  getUserAppIds: function(cb){
    refs.userApps.once('value', function(data){
      if (!_.isNull(data.val())){
        cb(data.val());
      }
    })
  },
  getApps: getAppsInAppstore,
  getIDForName: function( appName, cb){
    // this will only work on a single device
    refs.userApps.orderByChild('name')
    .equalTo(appName)
    .on('value', function(data){
      debug( refs.userApps.toString(), data.key, '>>>>', data.val() )
      if ( !data.exists() ){
        return cb(new Error('No user installed firebase application:' + appName))
      }
      cb(null, _.keys(data.val())[0] );
    }, console.error)
  },

  //
  remove: function ( appId, cb ) {
    if ( appId ){
      // deviceapps
      refs.deviceApps.child( appId ).remove(cb);
      delete refs.deviceApps.child( appId );
    } else {
      console.warn('appId required to app.remove')
    }
  },

  watchStatus: function( appId, cb ){
    refs.deviceApps.child(appId)
    .child('public/runtime/status')
    .on('value', function(resp){
      if ( resp.exists() ){
        cb(resp.val());
      }
    });
  },

  setStatus: function( appId, status, cb ){
    if ( _.isNull(status.match(/active|inactive|error/)) ) {
      console.error('status must be active, inactive or error');
    } else {
    refs.deviceApps.child(appId)
    .child('public/runtime/status')
    .set(status, cb);
    }
  }
}


function getAppsInAppstore(deviceId, token, callback) {
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
