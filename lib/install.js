var refs = require('./util').refs;


var debug = new DebugLog('install')

module.exports = {
  watch: function(appId, cb){
    if (_.isArray(refs.deviceApps)) {
      async.map(refs.deviceApps, function (ref, callback) {
        ref.child(appId + '/public').on('child_changed', function(deviceApp){
          var install = deviceApp.val();
          debug('watch>', install);
          if (install.runtime.status === 'pending'){
            console.log('Application installing...');
          } else if ( install.runtime.status === 'inactive'){
            callback(null, 'Application install successful');
          } else if ( install.runtime.status === 'error'){
            callback('Application install error')
          }
        });
      }, function (err, results) {
        if (err) return cb(err);
        else return cb(null, results);
      });
    }
    else {
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
      });
    }
  }
}
