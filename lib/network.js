var util = require('util');
var EventEmitter = require('events').EventEmitter;
var exec = require('child_process').exec;
var _ = require('underscore');

var Wireless = function(config) {

    EventEmitter.call(this);

    // List of networks (key is address)
    this.networks = {};

    // True if we're connected to a network
    this.connected = false;

    this.scanTimer;

    this.connectTimer;

    // Interface to listen on. TODO: handle multiple
    this.iface = config.iface || 'wlan0';

    this.commands = _.extend({}, this.COMMANDS, config.commands);

    // Translates each individual command
    for (var command in this.commands) {
        this.commands[command] = this._translate(this.commands[command], {
            'interface': this.iface,
        });
    }
};

util.inherits(Wireless, EventEmitter);

Wireless.prototype.COMMANDS = {
    scan: 'sudo iwlist :INTERFACE scan', //scan networks
    stat: 'sudo iwconfig :INTERFACE',   //get network information
    disable: 'sudo ifconfig :INTERFACE down', //disable network interface
    enable: 'sudo ifconfig :INTERFACE up',  //enable network interface
    interfaces: 'sudo iwconfig', //get wireless interfaces
    leave: 'sudo iwconfig :INTERFACE essid ""' //disconnect network
};

// Translates strings. Looks for :SOMETHING in string, and replaces is with data.something.
Wireless.prototype._translate = function(string, data) {
    for (var index in data) {
        if (!data.hasOwnProperty(index)) break;
        string = string.replace(':' + index.toUpperCase(), data[index]);
    }

    return string;
};

// Start listening, runs in a loop
Wireless.prototype.start = function() {
    var self = this;

    // Are we connected?
    this._executeTrackConnection();
    this.connectTimer = setInterval(function() {
        self._executeTrackConnection();
    }, this.connectionSpyFrequency * 1000);
};

// Every time we find a network during a scan, we pass it through this function
Wireless.prototype._seeNetwork = function(network) {
    if (this.networks[network.address]) {
        var oldNetwork = this.networks[network.address];

        if (oldNetwork.ssid != network.ssid || oldNetwork.encryption_any != network.encryption_any) {
            this.emit('change', network);
        } else if (oldNetwork.strength != network.strength || oldNetwork.quality != network.quality) {
            this.emit('signal', network);
        }

        this.networks[network.address] = network;
    } else {
        this.networks[network.address] = network;

        this.emit('appear', network);
    }
};

// Stop listening
Wireless.prototype.stop = function(callback) {
    this.killing = true;
    clearInterval(this.scanTimer);
    clearInterval(this.connectTimer);

    this.emit('stop');

    callback && callback();
};

// Returns a listing of networks from the last scan
// Doesn't need a callback, just getting the last list, not doing a new scan
Wireless.prototype.list = function() {
    return this.networks;
};

//Returns the current network status
Wireless.prototype.status = function(callback){
    var self = this;

    this.emit('command', this.commands.stat);

    exec(this.commands.stat, function(err, stdout, stderr) {

        var content = stdout.toString();
        self.network = self._parseScan(content);

        return callback(err, self.network);
    });
}


// Enables the interface (ifconfig UP)
Wireless.prototype.enable = function(callback) {
    var self = this;

    this.emit('command', this.commands.enable);

    exec(this.commands.enable, function(err, stdout, stderr) {
        if (err) {
            if (err.message.indexOf("No such device")) {
                self.emit('error', "The interface " + self.iface + " does not exist.");
                callback && callback(err);
                return;
            }

            self.emit('error', "There was an unknown error enabling the interface" + err);
            callback && callback(err);
            return;
        }

        if (stdout || stderr) {
            self.emit('error', "There was an error enabling the interface" + stdout + stderr);
            callback && callback(stdout || stderr);
            return;
        }

        callback && callback(null);
    });
};

// Disables the interface (ifconfig DOWN)
Wireless.prototype.disable = function(callback) {
    var self = this;

    this.emit('command', this.commands.disable);

    exec(this.commands.disable, function(err, stdout, stderr) {
        if (err) {
            this.emit('error', "There was an unknown error disabling the interface" + err);
            callback && callback(err);
            return;
        }

        if (stdout || stderr) {
            this.emit('error', "There was an error disabling the interface" + stdout + stderr);
            callback && callback(stdout || stderr);
        }

        callback && callback(null);
    });
};


// Attempts to disconnect from the specified network
Wireless.prototype.leave = function(callback) {
    var self = this;

    this.emit('command', this.commands.leave);
    exec(this.commands.leave, function(err, stdout, stderr) {
        if (err) {
            self.emit('error', "There was an error when we tried to disconnect from the network");
            callback && callback(err);
            return;
        }

        callback && callback(null);
    });
};

// Parses the output from `iwlist IFACE scan` and returns a pretty formattted object
Wireless.prototype._parseScan = function(scanResults) {
    var lines = scanResults.split(/\r\n|\r|\n/);
    var networks = [];
    var network = {};
    var networkCount = 0;
    _.each(lines, function(line) {
        line = line.replace(/^\s+|\s+$/g,"");

        // a "Cell" line means that we've found a start of a new network
        if (line.indexOf('Cell') !== -1) {
            networkCount++;
            if (!_.isEmpty(network)) {
                networks.push(network);
            }

            network = {
                //speeds: []
                last_tick: 0,
                encryption_any: false,
                encryption_wep: false,
                encryption_wpa: false,
                encryption_wpa2: false,
            };

            network.address = line.match(/([0-9a-fA-F]{2}:){5}[0-9a-fA-F]{2}/)[0];
        } else if (line.indexOf('Channel') !== -1) {
            network.channel = line.match(/Channel:([0-9]{1,2})/)[1];
        } else if (line.indexOf('Quality') !== -1) {
            // observed versions of this line:
            //   Quality=100/100  Signal level=47/100
            //   Quality:23  Signal level:0  Noise level:0
            var qMatch = line.match(/Quality(:|=)(\d+)[^\d]/),
                sMatch = line.match(/Signal level(:|=)(-?\d+)[^\d]/);
            if (qMatch && qMatch.length >= 3) {
                network.quality = parseInt(qMatch[2], 10);
            }
            if (sMatch && sMatch.length >= 3) {
                network.strength = parseInt(sMatch[2], 10);
            }
        } else if (line.indexOf('Encryption key') !== -1) {
            var enc = line.match(/Encryption key:(on|off)/)[1];
            if (enc === 'on') {
                network.encryption_any = true;
                network.encryption_wep = true;
            }
        } else if (line.indexOf('ESSID') !== -1) {
            network.ssid = line.match(/ESSID:"(.*)"/)[1];
        } else if (line.indexOf('Mode') !== -1) {
            network.mode = line.match(/Mode:(.*)/)[1];
        } else if (line.indexOf('IE: IEEE 802.11i/WPA2 Version 1') !== -1) {
            network.encryption_wep = false;
            network.encryption_wpa2 = true;
        } else if (line.indexOf('IE: WPA Version 1') !== -1) {
            network.encryption_wep = false;
            network.encryption_wpa = true;
        }
    });

    if (!_.isEmpty(network)) {
        networks.push(network);
    }

    // TODO: Deprecated, will be removed in 0.5.0 release
    if (networkCount === 0) {
        this.emit('empty');
    }

    return networks;
};

// Executes a scan, reporting each network we see
Wireless.prototype._executeScan = function() {
    var self = this;

    // Make this a non annonymous function, run immediately, then run interval which runs function
    this.emit('command', this.commands.scan);

    exec(this.commands.scan, function(err, stdout, stderr) {
        if (err) {
            if (self.killing) {
                // Of course we got an error the main app is being killed, taking iwlist down with it
                return;
            }

            self.emit('error', "Got some major errors from our scan command:" + err);
            // TODO: Destroy
            return;
        }

        if (stderr) {
            if (stderr.match(/Device or resource busy/)) {
                self.emit('error', "Scans are overlapping; slow down update frequency");
                return;
            } else if (stderr.match(/Allocation failed/)) {
                self.emit('error', "Too many networks for iwlist to handle");
                return;
            } else {
                self.emit('error', "Got some errors from our scan command: ", stderr);
            }
        }

        if (!stdout) {
            return;
        }

        var content = stdout.toString();
        var networks = self._parseScan(content);

        // emit the raw data TODO: Deprecated, removed in 0.5.0
        self.emit('batch', networks);

        _.each(networks, function(network) {
            self._seeNetwork(network);
        });

    });
};

// Checks to see if we are connected to a wireless network and have an IP address
Wireless.prototype._executeTrackConnection = function() {
    var self = this;

    this.emit('command', this.commands.stat);

    exec(this.commands.stat, function(err, stdout, stderr) {
        if (err) {
            self.emit('error', "Error getting wireless devices information");
            // TODO: Destroy
            return;
        }

        var content = stdout.toString();
        var lines = content.split(/\r\n|\r|\n/);
        var foundOutWereConnected = false;
        var networkAddress = null;

        _.each(lines, function(line) {
            /*
            if (line.match(/inet (\b(?:\d{1,3}\.){3}\d{1,3}\b)/) || line.match(/inet6 ([a-f0-9:]*)/)) {
                // looks like we're connected
                foundOutWereConnected = true;
            }
            */
            if (line.indexOf('Access Point') !== -1) {
                networkAddress = line.match(/Access Point: ([a-fA-F0-9:]*)/)[1] || null;

                if (networkAddress) {
                    foundOutWereConnected = true;
                }
            }
        });

        // guess we're not connected after all
        if (!foundOutWereConnected && self.connected) {
            self.connected = false;
            self.emit('leave');
        } else if (foundOutWereConnected && !self.connected) {
            self.connected = true;
            var network = self.networks[networkAddress];

            if (network) {
                self.emit('join', network);
                return;
            }
        }
    });
};

module.exports = {
    Wireless : Wireless,
    Wired : '' //pending
};