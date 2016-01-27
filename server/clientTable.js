var log = require("./logger");

var clientTable = {};
var cap;

function hit(client) {
    if (clientTable[client] == null) {
		clientTable[client] = 0;
		log.info("Adding " + client + " to client table");
	}
    clientTable[client]++;
    log.debug("Clients table hit from "+client+" ("+clientTable[client]+")");
    if (clientTable[client] > cap) return false;
    else return true;
}

function drop(client) {
	log.info("Dropping " + client + " from client table");
	delete clientTable[client];
}

function flush(timeout) {
    setTimeout(function () {
        //log.info("Flushing clients table");
        for (var i in clientTable) {
			clientTable[i] = 0;
		}
        flush(timeout);
    }, timeout);
}

function init(_cap, timeout) {
    cap = _cap;
    log.info("Clients table initialized");
    flush(timeout);
}

exports.hit = hit;
exports.drop = drop;
exports.init = init;