var refs = require('./util').refs;


var debug = new DebugLog('firebase:appstore')

module.exports = {
  init: function(rs){
    // localize firebase references
    refs = rs;
  },
  get: function(appId, cb){
    refs.appstore.child(appId).on('value', function (data) {
      if ( !_.isNull(data.val())){
        cb(data.val())
      }
    })
  },
  watchForAppCreated: function (appName, cb) {
    refs.appstore.orderByChild('meta/name').equalTo(appName).limitToFirst(1).on('child_added', function (app) {
      if (app.exists()) {
        debug('App added triggered for ', appName, app.key );
        cb({
          key: app.key,
          data: app.val()
        });
      }
    });
  },
  watchForAppUpdated: function (appName, cb) {
    refs.appstore.orderByChild('meta/name').equalTo(appName).limitToFirst(1).on('child_changed', function (app) {
      debug('App change triggered for ' + appName);
      debug(app);
      if (app.exists()) {
        debug('App ' + appName + ' present')
        var app = {
          key: app.key,
          data: app.val()
        }
        cb(app);
      }
    });
  }

}
