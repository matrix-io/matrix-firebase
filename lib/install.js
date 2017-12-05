var refs = require('./util').refs;


var debug = new DebugLog('install')

module.exports = {
  watch: function(deviceId, appId, cb){
    // backwards compatibility
    if (!_.isFunction(cb)) {
      cb = appId;
      appId = deviceId;
    }

    const ref = _.isFunction(refs.deviceApps) ? refs.deviceApps(deviceId) : refs.deviceApps;

    ref.child(appId + '/public').on('child_changed', function(deviceApp){
      var install = deviceApp.val();
      debug('watch>', install);
      if (install.runtime.status === 'pending'){
        console.log('Application installing...');
      } else if ( install.runtime.status === 'inactive'){
        cb(null, 'Application install successful');
      } else if ( install.runtime.status === 'error'){
        cb('Application install error')
      }
    });
  }
}
