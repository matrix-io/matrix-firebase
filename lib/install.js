var refs = require('./init').refs;

module.exports = {
  watch: function(appId, cb){
    refs.deviceApps.child(appId + '/public').on('child_changed', function(deviceApp){
      var install = deviceApp.val();
      debug('install.watch>', install);
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
