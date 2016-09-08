require('colors');

_ = require( 'lodash' );
async = require('async');
var D = require('debug');
debug = new D('firebase')

var fs = require('fs');
var e = {};

// add lib contents to export
var files = fs.readdirSync(__dirname + '/lib')

  _.each(files, function (f) {
    e[f.slice(0, -2)] = require('./lib/' + f);
  })

// shortcut for API sanity
e.init = e.util.init;

module.exports = e;
