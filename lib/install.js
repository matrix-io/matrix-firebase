var refs = require('./util').refs;


var debug = new DebugLog('install')

module.exports = {
  watch: function(appId, cb){
    refs.deviceApps.child(appId + '/public').on('child_changed', function(deviceApp){
      var install = deviceApp.val();
      debug('watch>', install);
      if (install.runtime.status === 'pending'){
        console.log('Application installing...');
      } else if ( install.runtime.status === 'inactive'){
        cb(null, 'Application install successful');
      } else if ( install.runtime.status === 'error'){
        cb('Application install error')
      }
    })
  }
}
