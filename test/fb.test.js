log = console.log;
var should = require( 'should' );
var assert = require( 'assert' );
var _ = require( 'lodash' );
var API = require( 'matrix-node-sdk' );


var fb = require( '../index.js' );
describe( 'matrix firebase module', function () {
  var token;
  it( 'can connect to firebase', function ( done ) {
    fb.init('testuser','123456','eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiJ9.eyJjbGFpbXMiOnsiZGlkIjoiMTIzNDU2IiwiZGtleSI6IjU3NzQ2YTA4M2NhZWFmNjA1ODBjNDIxMiJ9LCJ1aWQiOiI1NzcxYTQ1NWMyM2JlYzFmMDBkMGYzNmMiLCJpYXQiOjE0Njk0ODUyNDYsImV4cCI6MTQ2OTQ4ODg0NiwiYXVkIjoiaHR0cHM6Ly9pZGVudGl0eXRvb2xraXQuZ29vZ2xlYXBpcy5jb20vZ29vZ2xlLmlkZW50aXR5LmlkZW50aXR5dG9vbGtpdC52MS5JZGVudGl0eVRvb2xraXQiLCJpc3MiOiJhZG1vYmlsaXplLWFwaUBhZG1vYmlsaXplLXRlc3RpbmcuaWFtLmdzZXJ2aWNlYWNjb3VudC5jb20iLCJzdWIiOiJhZG1vYmlsaXplLWFwaUBhZG1vYmlsaXplLXRlc3RpbmcuaWFtLmdzZXJ2aWNlYWNjb3VudC5jb20ifQ.kT0sy-TigtVKiVnCwaxfE0JjVAVFmlXzjim5BNTBlsi8e_QkskCZFCb-qB2S_eFABHqbRlDr5sClpI-ClhKUbcoogTmPHY8CgaN61phQKIt_xEspR2nc3t9F8mMKJsFnD89TpGShojC5U7Hfbel7fnVMW5RoK1A4Q9g4GOPZb57jhTvxwHO26aQbnz_6axgKZ1q8c6NksqJ_qdUMU7jStD5GIVF6y8Oohuv2xLuRmbyYn1PyDgtAEQJBS4O9IjmteFgKa-imZWFnSTaIcnZ4j9n6mu8Vb0K4W7avJD8G8JS8g8kJ1-bajAMuc4bsiHqWX3HaQU-7bQL2-nl0ROZ6wA', done);
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
