var refs = require('./util').refs;

module.exports = {
  watchForNewApp: function(appId, cb){
    refs.deviceApps.child(appId + '/public/').on('value', function(app){
      debug('DEVICE APPS>'.red, app.val());
      if ( app.exists() ){
        cb(app.val());
      }
    }, function(err){ console.log(err); });
  },
  getInstalls: function(cb){
    refs.deviceApps.once('value', function(data){
      if ( data.exists()){
        cb(data.val())
      }
    })
  }
}
