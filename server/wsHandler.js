var url = require("url");
var WebSocket = require("faye-websocket");

var log = require("./logger");
var layersTable = require("./layersTable");

var ws = {};
var chanDir = {};
// Identifier caches
var chById = {};
var nameById = {};
var roomById = {};
var db;
var mirror;

function addConnection(client,req,socket,body) {
	if (WebSocket.isWebSocket(req)) {
		var query = url.parse(req.url,true).query;
		var id = parseInt(query.u_id);
		log.debug(query.u_id);
		var upgrade = function () {
			log.info("Upgrading to WebSocket connection for ID "+id+" on "+client);
			ws[id] = new WebSocket(req, socket, body);
			ws[id].on("message", messages)
			.on("close", function (event) {
				log.info("ID "+id+" on " + client + " closed WebSocket connection ["+event.code+"]");
				var rl = layersTable.getRoom(roomById[id]);
				var layersTaken = new Array();
				for (var i in rl) {
					if (rl[i] == id) {	// Find all just in case
						layersTaken.push(i);
						layersTable.set(roomById[id],i,0);
					}
				}
				delete ws[id];
				sendAllOthers(id, chById[id], JSON.stringify(['leave', nameById[id], layersTaken]));
				delete chById[id];
				delete nameById[id];
				delete roomById[id];
				if (event.code != 4000) {
					db.query("UPDATE " + ((id < 0) ? "guests" : "users") + " users SET r_id = null WHERE " + ((id < 0) ? "g_id" : "u_id") + " = ?", [Math.abs(id)],
						function (err, results) {
							if (err) log.error(err);
							else 
								log.info("Set " + ((id < 0) ? "guest " : "user ") + Math.abs(id) + "'s room to null");
						});
					// end of db.query UPDATE
				}
			});
		}
		if (ws[id]) {
			log.info("Closing existing WebSocket connection");
			ws[id].on("close", upgrade)
				  .close(4001);
		} else upgrade();
	}
}

function sendAllOthers(id, ch, msg) {
	for (var i = chanDir[ch].length; i >= 0 ; i--) {
		var _id = chanDir[ch][i];
		if (ws[_id] == null) chanDir[ch].splice(i,1);	// clean up disconnected users
		else if (_id != id) ws[_id].send(msg);
	}
}

function messages(event) {
	var msg = JSON.parse(event.data);
	//log.debug(JSON.stringify(msg));
	var ch = msg[0];
	var id = msg[1];
	switch (msg[2]) {
		case 'join':
			log.debug(msg);
			if (chanDir[ch] == null) chanDir[ch] = new Array();
			nameById[id] = msg[3];
			sendAllOthers(id, ch, JSON.stringify(msg.slice(2)));
			chanDir[ch].push(id);
			ws[id].send(ch);
			chById[id] = ch;
			break;
		case 'sync':
			roomById[id] = msg[3];
			var l = layersTable.getRoom(msg[3]);
			var data = {
				layers: new Array()
			}
			for (var i in l) {
				if (l[i] != 0) data.layers.push([i, l[i], nameById[l[i]]]);
			}
			msg[3] = data;
			ws[id].send(JSON.stringify(msg.slice(2)));
			break;
		// case 'start':
		// case 'brush':
		// case 'erase':
			// msg.push(msg[1]);
		case 'text':
			msg[3] = nameById[id];
			ws[id].send(JSON.stringify(msg.slice(2)));
		case 'visible':
		case 'stroke':
			sendAllOthers(id, ch, JSON.stringify(msg.slice(2)));
			break;
		case 'layer':
			log.debug(JSON.stringify(msg));
			if (layersTable.check(msg[3], msg[4])) {
				layersTable.set(msg[3], msg[4], id);
				if (msg[5]!=null) layersTable.set(msg[3], msg[5], 0);
				msg.splice(3,1,id,nameById[id]);
				sendAllOthers(id, ch, JSON.stringify(msg.slice(2)));
			}
			break;
		case 'bench':
			log.info("Bench request from user "+id+" in room "+roomById[id]);
			var n = msg.splice(3,1);
			var stroke = msg.slice(2);
			var set = new Array(n);
			log.debug("Building set from "+n+" copies of last stroke");
			for (var i = 0; i < n; i++) {
				set[i] = stroke;
			}
			ws[id].send(JSON.stringify(['bench',set]))
			log.debug("Sent nuke");
	}
}

function init(_db) {
	db = _db;
	log.info("WebSocket handler ready");
}

exports.handle	= addConnection;
exports.init = init;