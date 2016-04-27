var firebase;
var _ = require( 'lodash' );

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

    var path = '/' + userId +'/'+ deviceId;

    debug('Init Firebase', userId, deviceId, path )


    var F = require( 'firebase' );
    firebase = new F( 'https://admobilize.firebaseio.com/appconf' + path);

    firebase.authWithCustomToken(token, function(err, authData) {
      if(err) {
        if(err.code === 'INVALID_CREDENTIALS') {
          return cb('Invalid Firebase credentials', err);
        }
        debug('Unhandled Firebase error condition', err);
        return cb(err);
      }

      debug('Firebase auth successful for user %s', authData.auth.uid);

      var authData = firebase.getAuth();
      if (authData) {
        debug("Firebase:", firebase.toString());
      } else {
        debug("User is logged out");
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

  device: {
    get: function ( cb ) {
      firebase.on( 'value', function ( s ) {
        if ( !_.isNull( s.val() ) ) cb( null, s.val() )
      }, function ( e ) {
        if ( !_.isNull( s.val() ) ) cb( e )
      } )
    }
  },

  app: {
    add: function ( appId, config ) {
      if (arguments.length === 2){
        // device level
        firebase.child( appId ).set( config )
      }
    },
    set: function ( appId, config ) {
      firebase.child( appId ).set( config )
    },
    update: function ( appId, config ) {
      firebase.child( appId ).update( config )
    },
    get: function (  appId, cb ) {
      firebase.child( appId ).on( 'value', function ( s ) {
        if ( !_.isNull( s.val() ) ) cb( null, s.val() )
      }, function ( e ) {
        if ( !_.isNull( s.val() ) ) cb( e )
      } )
    },
    remove: function ( appId, cb ) {
      firebase.child( appId ).remove( cb );
    },
    onInstall: function( cb ){
      firebase.on('child_added', function(n){
        cb();
      });
    },
    onChange: function( appId, cb ){
      firebase.child( appId ).on('child_changed', function(n){
        cb();
      });
    }
  }
}
