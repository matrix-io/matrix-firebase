require('colors');

_ = require('lodash');
async = require('async');
DebugLog = require('debug');

var debug = new DebugLog('firebase')

var fs = require('fs');
var e = {};

// add lib contents to export
// only do files that end in .js
var files = fs.readdirSync(__dirname + '/lib').filter(
  function(f) { return (f.indexOf('.js') === f.length - 3) }
);

_.each(files, function(f) {
  e[f.slice(0, -3)] = require('./lib/' + f);
})

var msg;
// var info = JSON.parse(fs.readFileSync(__dirname + '/package.json'));
// var currentVersion = info.version;
// require('request').get(
//   'https://raw.githubusercontent.com/matrix-io/matrix-firebase/master/package.json',
//   function(err, resp, body) {
//     if (err) return console.error(err);
//     var remoteVersion = JSON.parse(body).version;
//     if (currentVersion === remoteVersion) {
//       msg = '(current)'.grey;
//       e.current = true;
//     } else {
//       e.current = false;
//       msg = '(can upgrade to '.yellow + remoteVersion + ')'.yellow
//     }
//     debug('🔥  [ MATRIX ] Firebase v'.red + currentVersion.grey, msg)
//   });

// shortcut for API sanity 
e.init = e.util.init;

module.exports = e;