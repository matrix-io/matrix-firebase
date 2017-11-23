var refs = require('./util').refs;

var debug = new DebugLog('firebase:device');

module.exports = {
  updateNetwork : function(netInfo, cb){
    if (_.isArray(refs.device)) {
      async.map(refs.device, function (ref, callback) {
        ref.child('/runtime').child('netinfo').set(netInfo, callback); 
      }, function (err, results) {
        if (err) return cb(err);
        else return cb(null, results);
      });
    }
    else {
      refs.device.child('/runtime').child('netinfo').set(netInfo, cb);
    }
  },
  add: function (options, events) {
    require('./helpers').startDeviceRegister( options, events );
  },
  delete: function (id, events) {
    require('./helpers').startDeviceDelete( id, events );
  },
  get: function ( cb ) {
    if (_.isArray(refs.device)) {
      async.map(refs.device, function (ref, callback) {
        ref.once( 'value', function ( s ) {
            if ( s.exists() ) callback( null, s.val() );
          }, function ( e ) {
            callback( e );
          } );
      }, function (err, results) {
        if (err) return cb(err);
        else return cb(null, results);
      });
    }
    else {
      refs.device.once( 'value', function ( s ) {
          if ( s.exists() ) cb( null, s.val() )
        }, function ( e ) {
          cb( e )
        } );
    }
    
  },
  getConfig: function ( cb ) {

    if (_.isArray(refs.device)) {
      async.map(refs.device, function (ref, callback) {
        ref.child('/config').once( 'value', function ( s ) {
            if ( s.exists() ) callback( null, s.val() );
          }, function ( e ) {
            callback( e );
          } ); 
      }, function (err, results) {
        if (err) return cb(err);
        else return cb(null, results);
      });
    }
    else {
      refs.device.child('/config').once( 'value', function ( s ) {
          if ( s.exists() ) cb( null, s.val() );
        }, function ( e ) {
          cb( e );
        } );
    }
    
  },
  getRuntime: function ( cb ) {
    if (_.isArray(refs.device)) {
      async.map(refs.device, function (ref, callback) {
        ref.child('/runtime').once( 'value', function ( s ) {
          if ( s.exists() ) callback( null, s.val() )
        }, function ( e ) {
          callback( e )
        }) 
      }, function (err, results) {
        if (err) return cb(err);
        else return cb(null, results);
      });
    }
    else {
      refs.device.child('/runtime').once( 'value', function ( s ) {
          if ( s.exists() ) cb( null, s.val() )
        }, function ( e ) {
          cb( e )
        }) 
    }
    
  },
  meta: function( cb ){
    if (_.isArray(refs.device)) {
      async.map(refs.device, function (ref, callback) {
        ref.child('meta').once('value',  function ( s ) {
          if ( s.exists() ) callback( null, s.val() )
        }, function ( e ) {
          callback( e )
        })
      }, function (err, results) {
        if (err) return cb(err);
        else return cb(null, results);
      });
    }
    else {
      refs.device.child('meta').once('value',  function ( s ) {
          if ( s.exists() ) cb( null, s.val() )
        }, function ( e ) {
          cb( e )
        })
    }
    
  },

  // called by Matrix device
  goCompleted : function(cb){
    //set device on disconnecti event
    require('./helpers').setDisconnection({_state: "status-update", online: false});
    //set status to online
    require('./helpers').statusUpdate( { online : true} );
  },

  list: function(cb){
    refs.userDevices.once('value', function( resp ){
      if (resp.exists()){
        cb(resp.val());
      } else {
        cb();
      }
    })
  },

  lookup: function( deviceId, cb ){
    refs.base.ref('devices/' + deviceId + '/public').once('value', function (resp) {
      if ( !resp.exists() ){
        return cb('Device record not found ' + deviceId);
      }
      cb(null, resp.val())
    }, cb)
  }
}
