var specs = require('./queue').specs;

var processTask = require('./queue').processTask;

var userToken = require('./init').token;

module.exports = {
  startDeviceRegister: function(options, events){
    var o = {
      _state: specs.device_register.start_state,
      token: userToken,
      device: { meta: {} }
    };

    _.extend(o.device.meta, options);

    options = o;

    // TODO: Watch for register finish
    processTask(specs.device_register, options, events);
  },
  startAppInstall: function(options, events){
    options.token = userToken;
    options._state = specs.application_install.start_state;
    processTask(specs.application_install, options, events);
  },
  startAppDeploy: function(options, events){
    options._state = specs.application_create.start_state;
    options.token = userToken;
    processTask(specs.application_create, options, events);
  }
}
