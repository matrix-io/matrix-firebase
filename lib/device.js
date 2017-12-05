var refs = require('./util').refs;

var debug = new DebugLog('firebase:device');

module.exports = {
  updateNetwork : function(deviceId, netInfo, cb){
    // backwards compatibility
    if (!_.isFunction(cb)) {
      cb = netInfo;
      netInfo = deviceId;
    }

    const ref = _.isFunction(refs.device) ? refs.device(deviceId) : refs.device;

     ref.child('/runtime').child('netinfo').set(netInfo, cb);
  },
  add: function (options, events) {
    require('./helpers').startDeviceRegister( options, events );
  },
  delete: function (id, events) {
    require('./helpers').startDeviceDelete( id, events );
  },
  get: function (deviceId, cb ) {
     // backwards compatibility
     if (!_.isFunction(cb)) {
      cb = deviceId;
    }

    const ref = _.isFunction(refs.device) ? refs.device(deviceId) : refs.device;

    ref.once( 'value', function ( s ) {
        if ( s.exists() ) cb( null, s.val() )
      }, function ( e ) {
        cb( e )
      } );
  },
  getConfig: function (deviceId, cb ) {
    // backwards compatibility
    if (!_.isFunction(cb)) {
      cb = deviceId;
    }

    const ref = _.isFunction(refs.device) ? refs.device(deviceId) : refs.device;

    ref.child('/config').once( 'value', function ( s ) {
        if ( s.exists() ) cb( null, s.val() );
        return callback(null)
      }, function ( e ) {
        cb( e );
      } );
  },
  getRuntime: function (deviceId, cb ) {
    // backwards compatibility
    if (!_.isFunction(cb)) {
      cb = deviceId;
    }

    const ref = _.isFunction(refs.device) ? refs.device(deviceId) : refs.device;

    ref.child('/runtime').once( 'value', function ( s ) {
        if ( s.exists() ) cb( null, s.val() )
      }, function ( e ) {
        cb( e )
      }) 
  },
  meta: function(deviceId, cb ){
    // backwards compatibility
    if (!_.isFunction(cb)) {
      cb = deviceId;
    }

    const ref = _.isFunction(refs.device) ? refs.device(deviceId) : refs.device;

    ref.child('meta').once('value',  function ( s ) {
        if ( s.exists() ) cb( null, s.val() )
      }, function ( e ) {
        cb( e )
      })
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
