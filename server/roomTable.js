var log = require("./logger");

var roomTable;
var roomCols = "r.r_id, r.room_name, r.room_pass, r.width, r.height, r.layers, r.max_users"

function update(db, timeout) {
	setTimeout(function () {
	
		db.query("SELECT "+roomCols+", u.u_id AS id FROM rooms AS r LEFT JOIN users AS u ON r.r_id = u.r_id "
				+"UNION DISTINCT "
				+"SELECT "+roomCols+", g.g_id AS id FROM rooms AS r LEFT JOIN guests AS g ON r.r_id = g.r_id "
				+"ORDER BY r_id ASC",
			function (err, results) {
				if (err) log.error("Failed to update room directory from database " + err);
				else {
					roomTable = {};
					var entry;
					for (var i in results) {
						entry = results[i];
						if (!roomTable[entry.r_id]) roomTable[entry.r_id] = {
							roomName: entry.room_name,
							password:(entry.room_pass ? true : false),
							width: entry.width,
							height: entry.height,
							layers: entry.layers,
							users:0,
							maxUsers: entry.max_users};
						if (entry.id) {
							roomTable[entry.r_id].users++;
						}
					}
				}
				//log.debug(JSON.stringify(roomTable));
				update(db, timeout);
			});
		// end db.query SELECT
	}, timeout);
}

function init(db, timeout) {
	update(db, timeout);
    log.info("Room directory initialized");
}

exports.init = init;
exports.get = function () {	return roomTable; }