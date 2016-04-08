var firebase;
var _ = require( 'lodash' );

// application keys as names
var fbx = {};



// use child to maintain position
module.exports = {
  init: function ( userId ) {
    var F = require( 'firebase' );
    firebase = new F( 'https://flickering-torch-1209.firebaseio.com/' );
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

  user: {
    add: function ( userId ) {
      firebase.child( userId ).set( {
        e: Math.random()
      } );
    },
    get: function ( userId, cb ) {
      firebase.child( userId ).on( 'value', function ( s ) {
        if ( !_.isNull( s.val() ) ) cb( null, s.val() )
      }, function ( e ) {
        if ( !_.isNull( e ) ) cb( e )
      } )
    },
    remove: function ( userId, cb ) {
      firebase.child( userId ).remove( cb );
    }
  },

  device: {
    add: function ( userId, deviceId ) {
      var o = {}
      o[ deviceId ] = 1;
      firebase.child( userId ).set( o );
    },
    get: function ( userId, deviceId, cb ) {
      firebase.child( userId + '/' + deviceId ).on( 'value', function ( s ) {
        if ( !_.isNull( s.val() ) ) cb( null, s.val() )
      }, function ( e ) {
        if ( !_.isNull( s.val() ) ) cb( e )
      } )
    },
    remove: function ( userId, deviceId, cb ) {
      firebase.child( userId ).child( deviceId ).remove( cb );
    }
  },

  app: {
    add: function ( userId, deviceId, appId, config ) {
      firebase.child( userId ).child( deviceId ).child( appId ).set( config )
    },
    get: function ( userId, deviceId, appId, cb ) {
      firebase.child( userId + '/' + deviceId + '/' + appId ).on( 'value', function ( s ) {
        if ( !_.isNull( s.val() ) ) cb( null, s.val() )
      }, function ( e ) {
        if ( !_.isNull( s.val() ) ) cb( e )
      } )
    },
    remove: function ( userId, deviceId, appId, cb ) {
      firebase.child( userId ).child( deviceId ).child( appId ).remove( cb );
    }
  }
}
