var specs = require('./queue').specs;

var processTask = require('./queue').processTask;

var userToken = require('./util').token;



/**
 * starts - these put an event onto the worker queue
 * options are written to the queue
 * events are the handlers
 * .start - fired once on start
 * .progress(msg) - fired every update to value from worker process
 * .finished - matches end state
 * .error(err) - something goes wrong
 */
module.exports = {
  startDeviceRegister: function (options, events) {
    //Just using userToken was returning an error
    userToken = require('./util').token;
    var o = {
      _state: specs.device_register.start_state,
      token: userToken,
      device: { meta: {} }
    };

    _.extend(o.device.meta, options);

    options = o;

    processTask(specs.device_register, options, events);
  },
  startAppInstall: function(options, events){
    userToken = require('./util').token;
    options.token = userToken;
    options._state = specs.application_install.start_state;
    processTask(specs.application_install, options, events);
  },
  startAppDeploy: function(options, events){
    userToken = require('./util').token;
    options._state = specs.application_create.start_state;
    options.token = userToken;
    processTask(specs.application_create, options, events);
  }
}
