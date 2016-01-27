var log = require("./logger");

var layersTable = {};

function set(roomId, layerId, userId) {
	if (!layersTable[roomId]) layersTable[roomId] = {};
	layersTable[roomId][layerId] = userId;
}

function check(roomId, layerId) {
	if (!layersTable[roomId]) return true;		// room not yet recorded
	else if (layersTable[roomId][layerId]) return false;	// layer taken
	else return true;	// layer free or not yet recorded
}

function getRoom(roomId) {
	return layersTable[roomId];
}

exports.set = set;
exports.check = check;
exports.getRoom = getRoom;