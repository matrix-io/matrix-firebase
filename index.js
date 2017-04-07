require('colors');

_ = require('lodash');
async = require('async');
DebugLog = require('debug');

var debug = new DebugLog('firebase')

var fs = require('fs');
var e = {};

// add lib contents to export
// only do files that end in .js
var files = require('fs').readdirSync(__dirname + '/lib').filter(
  function(f) { return (f.indexOf('.js') === f.length - 3) }
);

_.each(files, function(f) {
  e[f.slice(0, -3)] = require('./lib/' + f);
})

/**
 * Compares the current isntalled version against the lastest remote version available
 * @param {Function} cb Returns the following:
 * {Error} err Error details
 * {Object} version object that contains the following parameters:
 *   - {String} local The version of the installed module
 *   - {String} remote The latest version available of the module
 *   - {bool} updated Boolean indicating wether the version is up to date or not
 */
e.checkVersion = function (cb) {
  var info = JSON.parse(require('fs').readFileSync(__dirname + '/package.json'));
  var currentVersion = info.version;
  require('https').get(
    'https://raw.githubusercontent.com/matrix-io/matrix-firebase/master/package.json',
    function (res) {
      var write = '';
      res.on('data', function (c) {
        write += c;
      });
      res.on('end', function () {
        var msg = '';
        var remoteVersion = JSON.parse(write).version;
        if (currentVersion === remoteVersion) {
          msg = '(current)'.grey;
          e.current = true;
        } else {
          e.current = false;
          msg = '(can upgrade to '.yellow + remoteVersion + ')'.yellow
        }
        debug('🔥  [ MATRIX ] Firebase v'.red + currentVersion.grey, msg)
        cb(undefined, { local: currentVersion, remote: remoteVersion, updated: currentVersion === remoteVersion });
      });
    }).on('error', function (e) {
      var errorMessage;
      if (e.code === 'ENOTFOUND') errorMessage = 'Firebase version check failed, unable to reach module repository';
      else errorMessage = 'Firebase upgrade check error: ' + e.message;
      cb(errorMessage);
    }) 
}

// shortcut for API sanity
e.init = e.util.init;

module.exports = e;

