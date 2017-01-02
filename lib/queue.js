//  ,adPPYb,d8  88       88   ,adPPYba,  88       88   ,adPPYba,
// a8"    `Y88  88       88  a8P_____88  88       88  a8P_____88
// 8b       88  88       88  8PP"""""""  88       88  8PP"""""""
// "8a    ,d88  "8a,   ,a88  "8b,   ,aa  "8a,   ,a88  "8b,   ,aa
//  `"YbbdP'88   `"YbbdP'Y8   `"Ybbd8"'   `"YbbdP'Y8   `"Ybbd8"'
//          88
//          88

var refs = require('./util').refs;


var debug = new DebugLog('firebase:queue')
//Worker tasks specs
var specs = {
  device_register: {
    error_state: 'error',
    finished_state: 'device-register-completed',
    in_progress_state: 'device-register-in-progress',
    retries: 3,
    start_state: 'device-register',
    timeout: 10000
  },
  device_delete: {
    error_state: 'error',
    finished_state: 'device-delete-completed',
    in_progress_state: 'device-delete-in-progress',
    retries: 3,
    start_state: 'device-delete',
    timeout: 10000
  },
  status_update: {
    error_state: 'error',
    finished_state: 'status-update-completed',
    in_progress_state: 'status-update-in-progress',
    retries: 3,
    start_state: 'status-update',
    timeout: 10000
  },
  application_install: {
    error_state: 'error',
    finished_state: 'application-install-completed',
    in_progress_state: 'application-install-in-progress',
    retries: 3,
    start_state: 'application-install',
    timeout: 10000
  },
  application_deploy: {
    error_state: 'error',
    in_progress_state: 'application-deploy-in-progress',
    retries: 3,
    start_state: 'application-deploy',
    timeout: 10000
  },
  application_create: {
    error_state: 'error',
    finished_state: 'application-create-completed',
    in_progress_state: 'application-create-in-progress',
    retries: 3,
    start_state: 'application-create',
    timeout: 10000
  },
  application_uninstall: {
    error_state: 'error',
    finished_state: 'application-uninstall-completed',
    in_progress_state: 'application-uninstall-in-progress',
    retries: 3,
    start_state: 'application-uninstall',
    timeout: 10000
  },
  user_update: {
    error_state: 'error',
    finished_state: 'user-update-completed',
    in_progress_state: 'user-update-in-progress',
    retries: 3,
    start_state: 'user-update',
    timeout: 10000
  },
};

/**
 *@method processTask
 *@parameter {Object} spec Json object that follows Firebase worker specs format
 *@parameter {Object} options Json object sent to the worker task
 *@parameter {Object} events Json object with function exectued for each respective worker state (start, progress, finished, error)
 *@description Copy a file from a specific path to another.
 */
var processTask = function (spec, options, events) {
  options.token = require('./util').token;

  debug('Processing a task with ', spec);
  debug('OPTIONS: ', JSON.stringify(options));
  //These events are optional
  var error = !_.has(events, 'error') ? function (err) { } : events.error; //Called when the task finishes in an error state, includes the error (Timeout included)
  var finished = !_.has(events, 'finished') ? function () { } : events.finished; //Called whenever the tasks reaches its final state
  var start = !_.has(events, 'start') ? function () { } : events.start; //Called whenever the task is on its initial state (can happen more than once if spec.retries > 0)
  var progress = !_.has(events, 'progress') ? function () { } : events.progress; //Called whenever the task state changes to progress (can happen more than once if spec.retries > 0)

  var key = refs.queue.push().key;
  var update = {};
  update[key] = options;

  debug('update>', update)

  refs.queue.update(update);
  var timeoutTimer = setTimeout(function () {
    var errorData = new Error('Timeout processing worker task ' + key)
    errorData.details = {
      code: 'TIMEOUT'
    };
    return error(errorData);
  }, spec.timeout + (spec.timeout * spec.retries));

  var taskFinished = false;

  refs.queue.child(key).on('value', function (dataSnapshot) {
    var task = dataSnapshot.val();

    debug('Task Queue>', task)

    if (
      !dataSnapshot.exists() ||
      _.isNull(task) ||
      _.isUndefined(task) ||
      (spec.hasOwnProperty('finished_state') && task._state === spec.finished_state
    )) {
      debug('task finished!')
      if ( !taskFinished ){
        taskFinished = true;
          finished();
      }
    } else {
      switch (task._state) {
        case spec.start_state:
          start();
          break;
        case spec.in_progress_state:
          clearTimeout(timeoutTimer);
          progress();
          break;
        case spec.error_state:
          clearTimeout(timeoutTimer);
          var generatedError = new Error('Error processing task ' + key);
          generatedError.state = task._state;
          if (task.hasOwnProperty('_error_details')) generatedError.details = task._error_details;
          error(generatedError);
          break;
        default:
          clearTimeout(timeoutTimer);
          debug( 'uncaught task state', task._state );
          var generatedError = new Error('Unknown state for task ' + key);
          generatedError.state = task._state;
          if (task.hasOwnProperty('_error_details')) generatedError.details = task._error_details;
          error(generatedError);
      }
    }
  });

  // send this back to setup watcher
  return key;
}

module.exports = {
  specs: specs,
  processTask: processTask,
  // TODO: refreshSpecs: refreshSpecs,
}
