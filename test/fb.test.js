log = console.log;
var should = require( 'should' );
var assert = require( 'assert' );
var _ = require( 'lodash' );

var fb = require( '../index.js' );
describe( 'matrix firebase module', function () {
  it( 'can connect to firebase', function ( done ) {
    fb.init();
    done();
  })
  it( 'can add an app configuration', function ( done ) {
    fb.app.add( 'testuser', 'testdevice', 'testapp', {
      config: true
    });
    done();
  });


  describe( 'lookups', function () {
    var ip;
    beforeEach( function () {
      ip = true;
    });
    afterEach( function () {
      ip = false;
    });

    it( 'can get devices for a user', function ( done ) {
      fb.user.get( 'testuser', function ( err, u ) {
        // log(u);
        assert( _.has( u, 'testdevice' ) );
        if ( ip ) done();
      });
    });

    it( 'can get apps for a device', function ( done ) {
      fb.device.get( 'testuser', 'testdevice', function ( err, u ) {
        // log( u );
        assert( _.has( u, 'testapp' ) );
        if ( ip ) done();
      });
    });

    it( 'can get an config for an app', function ( done ) {
      fb.app.get( 'testuser', 'testdevice', 'testapp', function ( err, c ) {
        // log( c )
        assert( _.has( c, 'config' ) );
        if ( ip ) done();
      })
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
