//                                              88
//                                              88
//                                              88
// 8b      db      d8   ,adPPYba,   8b,dPPYba,  88   ,d8   ,adPPYba,  8b,dPPYba,  ,adPPYba,
// `8b    d88b    d8'  a8"     "8a  88P'   "Y8  88 ,a8"   a8P_____88  88P'   "Y8  I8[    ""
//  `8b  d8'`8b  d8'   8b       d8  88          8888[     8PP"""""""  88           `"Y8ba,
//   `8bd8'  `8bd8'    "8a,   ,a8"  88          88`"Yba,  "8b,   ,aa  88          aa    ]8I
//     YP      YP       `"YbbdP"'   88          88   `Y8a  `"Ybbd8"'  88          `"YbbdP"'

var refs = require('./init').refs;
//Worker tasks specs
var specs = {
  device_register: {
    error_state: "error",
    finished_state: "device-register-completed",
    in_progress_state: "device-register-in-progress",
    retries: 3,
    start_state: "device-register",
    timeout: 15000
  },
  application_install: {
    error_state: "error",
    in_progress_state: "application-install-in-progress",
    retries: 3,
    start_state: "application-install",
    timeout: 15000
  },
  application_create: {
    error_state: "error",
    in_progress_state: "application-create-in-progress",
    retries: 3,
    start_state: "application-create",
    timeout: 15000
  }
};

/**
 *@method processTask
 *@parameter {Object} spec Json object that follows Firebase worker specs format
 *@parameter {Object} options Json object sent to the worker task
 *@parameter {Object} events Json object with function exectued for each respective worker state (start, progress, finished, error)
 *@description Copy a file from a specific path to another.
 */
var processTask = function (spec, options, events) {
  debug('Processing a task with ', spec);
  debug('OPTIONS: ', JSON.stringify(options));
  //These events are optional
  var error = !_.has(events, 'error') ? function (err) { } : events.error; //Called when the task finishes in an error state, includes the error (Timeout included)
  var finished = !_.has(events, 'finished') ? function () { } : events.finished; //Called whenever the tasks reaches its final state
  var start = !_.has(events, 'start') ? function () { } : events.start; //Called whenever the task is on its initial state (can happen more than once if spec.retries > 0)
  var progress = !_.has(events, 'progress') ? function () { } : events.progress; //Called whenever the task state changes to progress (can happen more than once if spec.retries > 0)

  var key = firebaseQueueRef.push().key;
  var update = {};
  update[key] = options;
  firebaseQueueRef.update(update);
  var timeoutTimer = setTimeout(function () {
    return error(new Error('Timeout processing worker task ' + key));
  }, spec.timeout + (spec.timeout * spec.retries));

  firebaseQueueRef.child(key).on('value', function (dataSnapshot) {
    var task = dataSnapshot.val();

    debug('Task Queue>', task)

    if (_.isNull(task) || _.isUndefined(task) || (spec.hasOwnProperty('finished_state') && task._state == spec.finished_state)) {
      finished();
    } else {
      switch (task._state) {
        case spec.start_state:
          start();
          break;
        case spec.in_progress_state:
          clearTimeout(timeoutTimer);
          progress('Installing...');
          break;
        case spec.error_state:
          clearTimeout(timeoutTimer);
          var generatedError = new Error('Error processing task ' + key);
          if (task.hasOwnProperty('_error_details')) generatedError.details = task._error_details;
          error(generatedError);
          break;
        default:
          clearTimeout(timeoutTimer);
          var generatedError = new Error('Unable to create task ' + key);
          if (task.hasOwnProperty('_error_details')) generatedError.details = task._error_details;
          error(generatedError);
      }
    }
  });

  // send this back to setup watcher
  return key;
}

module.exports = {
  processTask: processTask
}
