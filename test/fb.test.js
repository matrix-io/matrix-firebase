log = console.log;
var should = require( 'should' );
var assert = require( 'assert' );
var _ = require( 'lodash' );
var API = require( 'matrix-node-sdk' );
var jwt = require('jsonwebtoken')

var fb = require( '../index.js' );
describe( 'matrix firebase module', function () {
  var token;
  it( 'can connect to firebase with a device token', function ( done ) {
    if ( !_.has(process.env, 'MATRIX_DEVICE_ID') || !_.has(process.env, 'MATRIX_DEVICE_SECRET') ){
      done(' needs device secret and device id to test firebase')
    }
    API.device.getToken({
      apiServer: 'http://dev.admobilize.com',
      deviceId: process.env['MATRIX_DEVICE_ID'],
      deviceSecret: process.env['MATRIX_DEVICE_SECRET'],
    }, function(err, token){
      if (err) console.error(err);
      var uid = jwt.decode(token).d.uid;
      fb.init(uid, process.env['MATRIX_DEVICE_SECRET'], token, done );
  })
  it( 'can add an app configuration', function ( done ) {
    fb.app.add('testapp', {
      config: true
    });
    done();
  });


  describe( 'lookups', function () {
    var ip;

    // this is because FB loves to throw more data
    beforeEach( function () {
      ip = true;
    });
    afterEach( function () {
      ip = false;
    });

    it.skip( 'can get devices for a user', function ( done ) {
      fb.user.get( 'testuser', function ( err, u ) {
        // log(u);
        assert( _.has( u, 'testdevice' ) );
        if ( ip ) done();
      });
    });

    it( 'can get apps for a device', function ( done ) {
      fb.app.getAll( function ( err, u ) {
        // log( u );
        assert( u.apps.length === 1  );
        if ( ip ) done();
      });
    });

    it( 'can get an config for an app', function ( done ) {
      fb.app.get( 'testapp', function ( err, c ) {
        // log( c )
        assert( _.has( c, 'config' ) );
        if ( ip ) done();
      })
    })

    it('can lookup the configuration for an app name', function(done){
      fb.app.getConfigByName('testapp', function(err, config){
        assert(config);
        done();
      })
    })

    it('can lookup all apps', function(done){
      fb.app.getAll(function(err, apps){
        assert(apps.length === 1);
        done();
      })
    });
  })


  describe('events', function(){

    it('supports onInstall to watch for app installs', function(done){
      var ip = true;
      fb.app.onInstall( 'testuser', 'testdevice', function(){
        if (ip) done();
        ip = false;
      });

      fb.app.add( 'testuser', 'testdevice', 'testapp2', {
        config: true
      });
    })

    it('supports onChange to watch for app config changes', function(done){
      fb.app.onChange('testuser', 'testdevice', 'testapp2', function(){
        done();
      });

      fb.app.update( 'testuser', 'testdevice', 'testapp2', {
        config: 'it\'s quite complicated really'
      });
    })
  })


  // need to do cleanup
  after( function ( done ) {
    fb.user.remove( 'testuser', function ( err ) {
      assert( _.isNull( err ) );
      done();
    });
  })

});
