var refs = require('./util').refs;

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
  }
}
