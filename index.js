var firebase, vesFirebase;
var _ = require( 'lodash' );
var D = require('debug');
var debug = new D('firebase')

// application keys as names
var fbx = {};




// use child to maintain position
module.exports = {
  init: function ( userId, deviceId, token, cb ) {
    if ( _.isUndefined(userId)){
      return console.error("Firebase init needs userId", userId)
    }

    if ( _.isUndefined(token)){
      return console.error("Firebase init needs token", token)
    }

    if ( _.isUndefined(deviceId)){
      var path = '/' + userId;
    } else {
      var path = '/' + userId +'/'+ deviceId.replace(/[\W\D]/g,'');
    }

    debug('Init Firebase', userId, deviceId, path )


    var F = require( 'firebase' );
    firebase = new F( 'https://admobilize.firebaseio.com/appconf/' + userId);

    firebase.authWithCustomToken(token, function(err, authData) {
      if(err) {
        if(err.code === 'INVALID_CREDENTIALS') {
          return cb('Invalid Firebase credentials', err);
        }
        console.warn('Unhandled Firebase error condition', err);
        return cb(err);
      }

      debug('Firebase auth successful for user %s', authData.auth.uid);

      var authData = firebase.getAuth();
      if (authData) {
        debug("Firebase:", firebase.toString());
      } else {
        console.log("User is logged out");
      }
      cb(null, { userId: authData.auth.uid })
    });

    firebase.on( 'value',
      function ( snap ) {
        // console.log( 'FB>', snap.val() )
      },
      function ( err ) {
        console.log( 'Firebase Error', err );
      }
    );
  },

  instance: firebase,

  // for integrating with VES server
  ves: {
    init: function(userId, deviceId, token, cb){
      if ( _.isUndefined(userId)){
        return console.error("VES Firebase init needs userId", userId)
      }

      if ( _.isUndefined(token)){
        return console.error("VES Firebase init needs token", token)
      }

      var F = require( 'firebase' );
      vesFirebase = new F( 'https://admobilize.firebaseio.com/VES/' + userId + '/' + deviceId);

      vesFirebase.authWithCustomToken(token, function(err, authData) {
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

        vesFirebase.child('instance/zone').set('us-central1-b');

        vesFirebase.on('child_changed', function(newVal, old){
          console.log('VES FIREBASE', newVal, old)
          // will respond with instance data
          cb(null, newVal)
        });
      });
    }
  },

  device: {
    add: function ( deviceId ) {
      var o = {}
      o[ deviceId ] = 1;
      firebase.set( o );
    },
    get: function ( deviceId, cb ) {
      firebase.child( deviceId ).on( 'value', function ( s ) {
        if ( !_.isNull( s.val() ) ) cb( null, s.val() )
      }, function ( e ) {
        if ( !_.isNull( s.val() ) ) cb( e )
      } )
    },
    remove: function ( deviceId, cb ) {
      firebase.child( deviceId ).remove( cb );
    }
  },

  app: {
    add: function ( deviceId, appId, config ) {
      firebase.child( deviceId ).child( appId ).set( config )
    },
    set: function ( deviceId, appId, config ) {
      firebase.child( deviceId ).child( appId ).set( config )
    },
    update: function ( deviceId, appId, config ) {
      firebase.child( deviceId ).child( appId ).update( config )
    },
    get: function ( deviceId, appId, cb ) {
      firebase.child(  '/' + deviceId + '/' + appId ).on( 'value', function ( s ) {
        if ( !_.isNull( s.val() ) ) cb( null, s.val() )
      }, function ( e ) {
        if ( !_.isNull( s.val() ) ) cb( e )
      } )
    },
    remove: function ( deviceId, appId, cb ) {
      firebase.child( deviceId ).child( appId ).remove( cb );
    },
    onInstall: function( deviceId, cb ){
      firebase.child( deviceId ).on('child_added', function(n){
        cb();
      });
    },
    onChange: function( deviceId, appId, cb ){
      firebase.child( deviceId ).child( appId ).on('child_changed', function(n){
        cb();
      });
    }
  }
}
