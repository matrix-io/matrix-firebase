var refs = require('./util').refs;

var debug = new DebugLog('firebase:app');

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

  changeSettings: function( appId, config ) {
    debug('change Settings [fb]>', appId, config)
    refs.deviceApps.child( appId )
    .child('/public/config/settings')
    .update( config );
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
  deploy: function (params, events) {
    params.appData.acl = {
      ownerId: params.userId
    };
    var options = {
      app: params.appData,
      deviceId: params.deviceId,
    };

    require('./helpers').startAppDeploy(options, events);

  }, //deploy ends
  //TODO: refactor so params are options coming in
  publish: function (token, deviceId, userId, appData, events) {
    appData.acl = {
      ownerId: userId
    };
    var options = {
      app: appData
    };

    require('./helpers').startAppPublish(options, events);

  },
  unpublish: function(token, appId, events) {
    var options = {
      appId: appId
    };

    require('./helpers').startAppUnpublish(options, events);
  },
  list: function( cb ) {
    refs.userApps.on('value', function(data){
      debug('app.list>', data.val());
      cb(null, data.val());
    });
  },

   search: function(needle, cb){
    refs.appstore.orderByChild('meta/shortname')
      .startAt(needle)
      .once('value', function(data){
        var result = data.val();
        //Validate if exist results
        if (!_.isNull(result)) {
          //Search the app
          var appId = _.findKey(result, function (app, appId) {
            if (app.meta.name == needle || (app.meta.hasOwnProperty("shortname") && app.meta.shortname == needle)) {
              return true;
            }
          });
          //adding the app to the variable and add the app id in the object
          result = result[appId];
          if (_.isUndefined(result)) {
            console.log('No results found'.yellow);
            process.exit();
          } else {

            if (!_.isUndefined(result.meta.visible) && result.meta.visible === true) {
              if (result) {
                result.id = appId;
              }

              //return the app
              cb(result);
            } else {
              console.log('No results found'.yellow);
              process.exit();
            }
          }
        }

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
  watchNamedUserApp: function (appName, cb) {
    refs.userApps.orderByChild('name').equalTo(appName).limitToFirst(1).on('value', function (app) {
      if (app.exists()) {
        debug('USERS DEVICES APPS ('.red + app.key.yellow + ') > NEW APP: '.red, app.val());
        if (app.key == 'apps' && Object.keys(app.val()).length > 0) {
          var key = Object.keys(app.val())[0];
          var val = app.val()[key];
          debug('USERS DEVICES APPS > ' + key);
          cb(val, key);
        } else {
          debug('USERS DEVICES APPS > ' + app.key);
          cb(app.val(), app.key);
        }
      } else {
        debug('USERS DEVICES APPS > NEW APP?');
      }
    }, function(err) { console.log(err); });
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
    debug( refs.userApps.toString() )
    refs.userApps.orderByKey().once('value', function(data){
      if ( data.exists() ){
        cb(data.val());
      } else {
        cb(null);
      }
    })
  },
  getApps: getAppsInAppstore,
  getIDForName: function( appName, cb){
    // this will only work on a single device
    refs.userApps.orderByChild('name')
    .equalTo(appName)
    .once('value', function(data){
      debug( refs.userApps.toString(), data.key, 'aId:', data.val() )
      if ( !data.exists() ){
        return cb(new Error('No user installed firebase application: ' + appName.yellow))
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
  getStatus: function( appId, cb ){
    refs.deviceApps.child(appId)
    .child('public/runtime/status')
    .once('value', function(resp){
      if ( resp.exists() ){
        cb(resp.val());
      } else {
        cb();
      }
    });
  },

  setStatus: function( appId, status, cb ){
    if ( _.isNull(status.match(/active|inactive|pending|error/)) ) {
      console.error('status must be active, inactive, pending or error');
    } else {
    refs.deviceApps.child(appId)
    .child('public/runtime/status')
    .set(status, cb);
    }
  },

  setOnline: function(appId, online, cb){
    refs.deviceApps.child(appId)
    .child('public/runtime/online')
    .set(online, cb)
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
