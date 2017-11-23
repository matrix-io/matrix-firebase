var refs = require('./util').refs;


var debug = new DebugLog('firebase:deviceapps')

module.exports = {
  validate: function(record){
    if ( !_.has(record, 'meta') ){
      debug('app record has no meta')
      return false;
    }
    if ( !_.has(record, 'config') ){
      debug('app record has no config')
      return false;
    }
    if ( !_.has(record, 'acl') ){
      debug('app record has no acl')
      return false;
    }
    if ( !_.has(record, 'policy') ){
      debug('app record has no policy')
      return false;
    }
    if ( !_.has(record, 'runtime') ){
      debug('app record has no runtime')
      return false;
    }
    return true
  },
  watchForNewApp: function(appId, cb){
    if (_.isArray(refs.deviceApps)) {
      async.map(refs.deviceApps, function (ref, callback) {
        ref.child(appId + '/public/').on('value', function (app) {
          debug('DEVICE APPS>'.red, app.val());
          if ( app.exists() ){
            callback(null, app.val());
          }
        }, function(err){ console.log(err); });
      }, function (err, results) {
        if (err) return cb(err);
        else return cb(results);
      });
    }
    else {
      refs.deviceApps.child(appId + '/public/').on('value', function (app) {
        debug('DEVICE APPS>'.red, app.val());
        if ( app.exists() ){
          cb(app.val());
        }
      }, function(err){ console.log(err); });
    }
  },
  get: function (appId, cb) {
    if (_.isArray(refs.deviceApps)) {
      async.map(refs.deviceApps, function (ref, callback) {
        ref.child(appId + '/public/').once('value', function (data) {
          if ( data.exists() ) {
            callback(null, data.val())
          }
        });
      }, function (err, results) {
        if (err) return cb(err);
        else return cb(results);
      });
    }
    else {
      refs.deviceApps.child(appId + '/public/').once('value', function (data) {
        if ( data.exists() ) {
          cb(data.val())
        }
      });
    }
    
  },
  getInstalls: function(cb){
    if (_.isArray(refs.deviceApps)) {
      async.map(refs.deviceApps, function (ref, callback) {
        ref.once('value', function(data){
          if ( data.exists()){
            callback(data.val())
          }
        })
      }, function (err, results) {
        if (err) return cb(err);
        else return cb(results);
      });
    }
    else {
      refs.deviceApps.once('value', function(data){
        if ( data.exists()){
          cb(data.val())
        }
      });
    }
    
  }
}
