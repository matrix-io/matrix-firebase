var refs = require('./util').refs;

module.exports = {
  getAllApps: function(cb){
    refs.userDevices.on('value', function(data){
      if ( data.exists() ){
        cb(null, data.val());
      } else {
        cb( null );
      }
    })
  },
  checkDevice: function( deviceId, cb ){
    refs.userDevices.child(deviceId).once('value',  function (resp) {
      if ( resp.exists() ){
        cb( null, resp.val() );
      } else {
        cb( null );
      }
    })
  },
  watchForNewApps: function( deviceId, cb ){
    refs.userDevices.child(deviceId).child('apps').on('child_added',
  function(app){
    if ( app.exists()){
      debug('app updated')
      cb(app.key, app.val());
    }
  })
  }
}
