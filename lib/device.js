var refs = require('./util').refs;
var network = require('network');
var Wireless = require('./network').Wireless
var os =  require('os');

var debug = new DebugLog('firebase:device');

module.exports = {
  ping: function(){
    var d = new Date();
    var now = Math.round(d.getTime() / 1000);
    refs.device.child('/runtime/lastConnectionEvent').set(now);
  },
  updateNetwork : function(){

    var self = this;

    network.get_active_interface((error, networkInfo) => {
      if(!error && networkInfo.type === 'Wired'){
        network.get_public_ip((error, ip) =>{
          if(!error){
            var netInfo = os.networkInterfaces()[networkInfo.name] || {}
            refs.device.child('/runtime').child('netinfo').update({
              'gateway' : networkInfo.gateway_ip || '',
              'localAddress' : netInfo[0].address || '',
              'macAddress' : netInfo[0].mac || '',
              'netmask' : netInfo[0].netmask || '',
              'publicAddress' : ip || '',
              'ssid' : 'ethernet'
            });
          }
        });
      }else if(!error && networkInfo.type === 'Wireless'){
        var wifi = new Wireless({ iface : networkInfo.name});

        //wifi.start(); //start to watch network changes

        var netInfo = os.networkInterfaces()[networkInfo.name] || {}
        network.get_public_ip((error, ip) =>{
          //try to get wifi information
          if(!error){
            wifi.status((error, wifiData) => {
              if(!error){
                refs.device.child('/runtime').child('netinfo').update({
                  'localAddress' : netInfo[0].address || '',
                  'macAddress' : netInfo[0].mac || '',
                  'netmask' : netInfo[0].netmask || '',
                  'gateway' : null,
                  'publicAddress' : ip || '',
                  'ssid' : wifiData[0].ssid
                });
              }
            });
          }
        });

        //listen wireless network changes to update firebase information
        wifi.on('change', function(){
          wifi.stop(); //stop to watch network
          self.updateNetwork(); //update with the new information
        });
      }
    });
  },
  add: function (options, events) {
    require('./helpers').startDeviceRegister( options, events );
  },
  delete: function (id, events) {
    require('./helpers').startDeviceDelete( id, events );
  },
  get: function ( cb ) {
    refs.device.once( 'value', function ( s ) {
      if ( s.exists() ) cb( null, s.val() )
    }, function ( e ) {
       cb( e )
    } )
  },
  getConfig: function ( cb ) {
    refs.device.child('/config').once( 'value', function ( s ) {
      if ( s.exists() ) cb( null, s.val() )
    }, function ( e ) {
      cb( e )
    } )
  },
  getRuntime: function ( cb ) {
    refs.device.child('/runtime').once( 'value', function ( s ) {
      if ( s.exists() ) cb( null, s.val() )
    }, function ( e ) {
      cb( e )
    })
  },
  meta: function( cb ){
    refs.device.child('meta').once('value',  function ( s ) {
      if ( s.exists() ) cb( null, s.val() )
    }, function ( e ) {
      cb( e )
    })
  },

  // called by Matrix device
  goCompleted : function(cb){
    //set device on disconnecti event
    require('./helpers').setDisconnection({_state: "status-update", online: false});
    //set status to online
    require('./helpers').statusUpdate( { online : true} );
  },

  list: function(cb){
    refs.userDevices.once('value', function( resp ){
      if (resp.exists()){
        cb(resp.val());
      } else {
        cb();
      }
    })
  },

  lookup: function( deviceId, cb ){
    refs.base.ref('devices/' + deviceId + '/public').once('value', function (resp) {
      if ( !resp.exists() ){
        return cb('Device record not found ' + deviceId);
      }
      cb(null, resp.val())
    }, cb)
  }
}
