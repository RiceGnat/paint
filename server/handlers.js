var url = require("url");

var log = require("./logger");

var intRegex = /^\d+$/;
var wordRegex = /^\w+$/;
var complRegex = /^[\x21-\x7E]+$/;
var uniRegex = /(?=^.+$)(?=^[^\u0000-\u001f]+$)/;

var CANVAS_MAX_WIDTH = 2048;
var CANVAS_MAX_HEIGHT = 2048;
var MAX_LAYER_COUNT = 16;
var MAX_MAX_USERS = 8;

var jsonHeader = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*"
};

function generateId(r_id, head_n, tail_n) {
	var id = r_id.toString(36);
	var ch = (Math.random().toString(36)).substring(2,tail_n+2);
	return new Array(head_n-id.length+1).join('_') + id + ch + new Array(tail_n-ch.length+1).join('_')
}

function returnError(code, req, res) {
    var pathname = url.parse(req.url).pathname;
    switch (code) {
		case 400:
			res.writeHead(400, {"Content-Type": "text/plain"});
			res.end("400 Bad Request");
			break;
        case 405:
            log.error("[405] Request method " + req.method + " not allowed for " + pathname);
            res.writeHead(405, {
                "Content-Type": "text/plain",
                "Allow": "POST"
            });
            res.end("405 Method Not Allowed");
            break;
		case 500:
			res.writeHead(500, {"Content-Type": "text/plain"});
			res.end("500 Internal Server Error");
			break;
        default:
            res.writeHead(200, jsonHeader);
            res.end(JSON.stringify({ "error": code }));
    }
}

function client(res) {
	log.info("client() called");
}

function addGuest(req, res, db) {
    if (req.method == "POST") {
        req.addListener("data", function (chunk) {
            log.debug("POST data received");
            req.data += chunk;
        });
        req.addListener("end", function () {
            log.debug(req.data);
            var entry = JSON.parse(req.data);
            //entry.online = 'Y';
            if (!wordRegex.test(entry.name)) {
                log.error("Invalid input");
                returnError(8, req, res);
            } else {
                log.debug("Adding guest user to database");
                db.query("INSERT INTO guests SET ?", entry,
                    function (err, results) {
                        //log.info(JSON.stringify(results));
                        if (err) {
                            log.error("Failed to insert new guest\n\t"+err);
                            returnError(7, req, res);
                        } else {
                            db.query("SELECT g_id, name FROM guests WHERE g_id = ?", [results.insertId],
                                function (err, results) {
                                    if (err) {
                                        log.error("Failed to retrieve new guest\n\t"+err);
                                        returnError(7, req, res);
                                    } else {
                                        log.info("Successfully added new guest: " + JSON.stringify(results));
                                        res.writeHead(200, jsonHeader);
                                        res.end(JSON.stringify(results[0]));
                                    }
                                });
                            // end db.query SELECT
                        }
                    });
                // end db.query INSERT
            }
        });
    } else {
        returnError(405, req, res);
    }
}

function loginAuth(req, res, db, ex) {
    if (req.method == "POST") {
        req.addListener("data", function (chunk) {
            log.debug("POST data received");
            req.data += chunk;
        });
        req.addListener("end", function () {
            log.debug(req.data);
            var entry = JSON.parse(req.data);
            if (!wordRegex.test(entry.username) ||
                !complRegex.test(entry.password)) {
                log.error("Invalid input");
                returnError(8, req, res);
            } else {
                log.debug("Looking up username in database");
                db.query("SELECT u_id, username FROM users WHERE username = ? AND password = ?",
                    [entry.username, entry.password],
                    function (err, results) {
                        if (err) {
                            log.error("Error retrieving user\n\t"+err);
                            returnError(7, req, res);
                        } else if (results.length == 0) {
                            log.error("No users matching credentials");
                            returnError(9, req, res);
						} else if (results.length > 1) {
                            log.error("Duplicate user record... Something went VERY wrong");
                            returnError(7, req, res);
                        } else {
                            log.info("Successfully retrieved user: " + JSON.stringify(results));
							entry = results[0];
							if (ex.onlineStatus[entry.u_id]) ex.onlineStatus[entry.u_id]++;
							else ex.onlineStatus[entry.u_id] = 1;
							
							log.info("Logged in user " + entry.u_id + " (" + ex.onlineStatus[entry.u_id] + ")");
							res.writeHead(200, jsonHeader);
							res.end(JSON.stringify(entry));
							/*
							db.query("UPDATE users SET online = 'Y' WHERE u_id = ?", [entry.u_id],
								function (err, results) {
									if (err) {
										log.error("Error setting user as online\n\t"+err);
										returnError(7, req, res);
									} else {
										log.info(entry.username + " is now online");
										res.writeHead(200, jsonHeader);
										res.end(JSON.stringify(entry));
									}
								});
							// end of db.query UPDATE
							*/
                        }
                    });
                // end db.query SELECT
            }
        });
    } else {
        returnError(405, req, res);
    }
}

function dropGuest(req, res, db) {
    if (req.method == "POST") {
        req.addListener("data", function (chunk) {
            log.debug("POST data received");
            req.data += chunk;
        });
        req.addListener("end", function () {
            var entry = JSON.parse(req.data);
			log.debug("Dropping guest " + entry.g_id + " from the guests table");
            db.query("DELETE FROM guests WHERE g_id = ?", [entry.g_id],
				function (err, results) {
					if (err) {
						// Responds with an error code instead of 200
						// because user won't see it anyway
						log.error("Error deleting guest\n\t"+err);
						returnError(400, req, res);
					}
					else {
						log.info("Guest successfully dropped from guest table");
						res.writeHead(200, {"Content-Type": "text/plain"});
						res.end("Guest successfully dropped from guest table");
					}
				});
			// end db.query DELETE
        });
    } else {
        returnError(405, req, res);
    }
}

function userLogout(req, res, db, ex) {
    if (req.method == "POST") {
        req.addListener("data", function (chunk) {
            log.debug("POST data received");
            req.data += chunk;
        });
        req.addListener("end", function () {
            var entry = JSON.parse(req.data);
			ex.onlineStatus[entry.u_id]--;
			log.info("Logged out user " + entry.u_id + " (" + ex.onlineStatus[entry.u_id] + ")");
			res.writeHead(200, {"Content-Type": "text/plain"});
			res.end("User successfully logged out");
			/*
			db.query("UPDATE users SET online = 'N' WHERE u_id = ?", [entry.u_id],
				function (err, results) {
					if (err) {
						log.error("Error setting user as offline\n\t"+err);
						returnError(7, req, res);
					} else {
						log.info(entry.username + " is now offline");
						res.writeHead(200, {"Content-Type": "text/plain"});
						res.end("User successfully logged out");
					}
				});
			// end of db.query UPDATE
			*/
        });
    } else {
        returnError(405, req, res);
    }
}

function makeRoom(req, res, db) {
    if (req.method == "POST") {
        req.addListener("data", function (chunk) {
            log.debug("POST data received");
            req.data += chunk;
        });
        req.addListener("end", function () {
            log.debug(req.data);
            var entry = JSON.parse(req.data);
			var u_id = entry.u_id;
            if (u_id < 1 ||
				entry.room_name == "" ||
				!uniRegex.test(entry.room_name) ||
				entry.room_pass && !complRegex.test(entry.room_pass) ||
				!(entry.width > 0 && entry.width <= CANVAS_MAX_WIDTH) ||
				!(entry.height > 0 && entry.height <= CANVAS_MAX_HEIGHT) ||
				!(entry.layers > 0 && entry.layers <= MAX_LAYER_COUNT) ||
				!(entry.max_users > 0 && entry.max_users <= MAX_MAX_USERS)) {
                log.error("Invalid input");
                returnError(118, req, res);
            } else {
                log.info("Adding new room to database");
				//if (!entry.room_pass) delete entry.room_pass;
                db.query("INSERT INTO rooms SET ?", entry,
                    function (err, results) {
                        //log.info(JSON.stringify(results));
                        if (err) {
                            log.error("Failed to create new room\n\t"+err);
                            returnError(117, req, res);
                        } else {
                            db.query("SELECT r_id, room_name, width, height, layers, channel FROM rooms WHERE r_id = ?", [results.insertId],
                                function (err, results) {
                                    if (err) {
                                        log.error("Failed to retrieve new room\n\t"+err);
                                        returnError(117, req, res);
                                    } else {
                                        log.info("Successfully added new room: " + JSON.stringify(results));
										entry = results[0];
										entry.channel = generateId(entry.r_id,8,8);
										db.query("UPDATE rooms SET channel = ? WHERE r_id = ?", [entry.channel,entry.r_id],
											function (err, results) {
												if (err) log.error("Failed to assign WebSocket channel to room\n\t"+err);
											});
										var q = "INSERT INTO layers (r_id, layer_id, position, name) VALUES ";
										var vals = new Array(entry.layers);
										for (var i = 0; i < entry.layers; i++) {
											vals[i] = "("+entry.r_id+","+i+","+i+","+"'Layer "+i+"')";
										}
										db.query(q+vals.join(',')+";", [],
											function (err, results) {
												if (err) log.error("Failed creating layers\n\t"+err);
												else {
													db.query("SELECT layer_id, name FROM layers WHERE r_id = ? ORDER BY position ASC", [entry.r_id],
														function (err, results) {
															if (err) log.error(err);
															else {
																log.debug(JSON.stringify(results));
																entry.layerData = results;
															}
														});
													// end db.query SELECT
												}
											});
										// end db.query INSERT
										db.query("UPDATE users SET r_id = ? WHERE u_id = ?", [entry.r_id, u_id],
											function (err, results) {
												if (err) {
													log.error("Failed to update user's current room\n\t"+err);
													returnError(117, req, res);
												} else {
													db.query("INSERT INTO moderators SET u_id = ?, r_id = ?", [u_id, entry.r_id],
														function (err, results) {
															if (err) {
																log.error("Failed to add user to moderators table\n\t"+err);
																returnError(117, req, res);
															} else {
																log.info("User "+u_id+" is now moderator of room "+entry.r_id);
																res.writeHead(200, jsonHeader);
																res.end(JSON.stringify(entry));
															}
														});
													// end db.query INSERT
												}
											});
										// end db.query UPDATE
                                    }
                                });
                            // end db.query SELECT
                        }
                    });
                // end db.query INSERT
            }
        });
    } else {
        returnError(405, req, res);
    }
}

function getRoomList(req, res, db, ex) {
	var roomDir = ex.roomTable;
	if (req.method == "GET") {
		var data = {};
		data.aaData = new Array();
		var entry;
		for (var i in roomDir) {
			entry = roomDir[i];
			data.aaData.push({
				r_id: i,
				room_name: entry.roomName,
				password: entry.password,	// true/false
				canvas: [entry.width,entry.height],
				layers: entry.layers,
				users: [entry.users, entry.maxUsers]}
			);
			log.debug(data);
		}
		res.writeHead(200, jsonHeader);
		res.end(JSON.stringify(data));
    } else {
        returnError(405, req, res);
    }
}

function getRoomCreator(req, res, db) {
	if (req.method == "GET") {
		var reply = {};
		var r_id = parseInt(req.data.r_id);
		log.debug(r_id);
		if (r_id <= 0) {
			returnError(400, req, res);
		} else {
			log.info("Fetching creator name for room " + r_id);
			db.query("SELECT users.username FROM rooms INNER JOIN users ON rooms.u_id = users.u_id WHERE rooms.r_id = ?", [r_id],
				function (err, results) {
					if (err) {
						log.error(err);
						returnError(400, req, res);
					} else {
						log.debug(JSON.stringify(results));
						reply.creatorName = (results.length > 0) ? results[0].username : "natural causes";
						res.writeHead(200, jsonHeader);
						res.end(JSON.stringify(reply));
					}
				});
			// end db.query SELECT
		}
		//res.writeHead(200, jsonHeader);
		//res.end(JSON.stringify(data));
    } else {
        returnError(405, req, res);
    }
}

function getRoomUsers(req, res, db) {
	if (req.method == "GET") {
		var r_id = parseInt(req.data.r_id);
		log.debug(r_id);
		if (r_id <= 0) {
			returnError(400, req, res);
		} else {
			log.info("Fetching users for room " + r_id);
			db.query("SELECT username AS name FROM users WHERE r_id = ? UNION ALL SELECT name FROM guests WHERE r_id = ? ORDER BY name", [r_id, r_id],
				function (err, results) {
					if (err) {
						log.error(err);
						returnError(400, req, res);
					} else {
						log.debug(JSON.stringify(results));
						res.writeHead(200, jsonHeader);
						res.end(JSON.stringify(results));
					}
				});
			// end db.query SELECT
		}
		//res.writeHead(200, jsonHeader);
		//res.end(JSON.stringify(data));
    } else {
        returnError(405, req, res);
    }
}

function joinRoom(req, res, db) {
    if (req.method == "POST") {
        req.addListener("data", function (chunk) {
            log.debug("POST data received");
            req.data += chunk;
        });
        req.addListener("end", function () {
            log.debug(req.data);
            var entry = JSON.parse(req.data);
            if (entry.r_id <= 0 ||
				entry.room_pass && !complRegex.test(entry.room_pass) ||
				entry.u_id == 0) {
                log.error("Invalid input");
                returnError(218, req, res);
            } else {
				db.query("SELECT r_id, room_name, width, height, layers, channel FROM rooms WHERE r_id = ? AND room_pass = ?", [entry.r_id, entry.room_pass],
					function (err, results) {
						log.debug(JSON.stringify(results));
						if (err) {
							log.error("Failed to retrieve room data");
							returnError(217, req, res);
						} else if (results.length == 0) {
							log.error("User provided incorrect password");
							returnError(219, req, res);
						} else if (results.length > 1) {
                            log.error("Duplicate room record... Something went VERY wrong");
                            returnError(217, req, res);
                        } else {
							db.query("SELECT layer_id, name FROM layers WHERE r_id = ? ORDER BY position ASC", [results[0].r_id],
								function (err, r) {
									if (err) log.error(err);
									else results[0].layerData = r;
								});
							// end db.query SELECT
							var query;
							if (entry.u_id > 0) {
								query = "UPDATE users SET r_id = ? WHERE u_id = ?";
							} else if (entry.u_id < 0) {
								query = "UPDATE guests SET r_id = ? WHERE g_id = ?";
							}
							db.query(query, [entry.r_id, Math.abs(entry.u_id)],
								function (err) {
									if (err) {
										log.error("Failed to update user/guest entry with target room ID");
										returnError(217, req, res);
									} else {
										// subscribe client to correct websocket channel
										// synchronize client
										log.info(((entry.u_id > 0) ? "User " : "Guest ") + Math.abs(entry.u_id) + " successfully joined room " + results[0].r_id);
										res.writeHead(200, jsonHeader);
										res.end(JSON.stringify(results[0]));
									}
								});
							// end db.query UPDATE
						}
					});
				// end db.query SELECT
            }
        });
    } else {
        returnError(405, req, res);
    }
}

function leaveRoom(req, res, db) {
	if (req.method == "POST") {
        req.addListener("data", function (chunk) {
            log.debug("POST data received");
            req.data += chunk;
        });
        req.addListener("end", function () {
            var entry = JSON.parse(req.data);
			if (entry.u_id > 0) {
				db.query("UPDATE users SET r_id = null WHERE u_id = ?", [entry.u_id],
					function (err, results) {
						if (err) {
							log.error("Failed to update user's current room\n\t"+err);
							returnError(117, req, res);
						} else {
							log.info("Successfully set user "+entry.u_id+"'s room to null");
							res.writeHead(200, {"Content-Type": "text/plain"});
							res.end("Successfully left room");
						}
					});
				// end db.query UPDATE
			} else if (entry.u_id < 0) {
				db.query("UPDATE guests SET r_id = null WHERE g_id = ?", [-entry.u_id],
					function (err, results) {
						if (err) {
							log.error("Failed to update guest's current room\n\t"+err);
							returnError(117, req, res);
						} else {
							log.info("Successfully set guest "+entry.u_id+"'s room to null");
							res.writeHead(200, {"Content-Type": "text/plain"});
							res.end("Successfully left room");
						}
					});
				// end db.query UPDATE
			} else {
				log.error("Invalid user ID");
				returnError(400, req, res);
			}
		});
    } else {
        returnError(405, req, res);
    }
}

function disconnect(req, res, db, ex) {
	if (req.method == "POST") {
		var clientTable = ex.clientTable;
		var client = ex.client;
		clientTable.drop(client);
		res.writeHead(200, {"Content-Type": "text/plain"});
		res.end("Client successfully dropped from client table");
	} else {
        returnError(405, req, res);
    }
}
/*
function faye(req, res, db, ex) {
	if (req.method == "POST") {
		req.addListener("data", function (chunk) {
            log.debug("POST data received");
            req.data += chunk;
        });
        req.addListener("end", function () {
			var bayeux = ex.bayeux;
			var entry = req.data;
			bayeux.getClient().publish("/channel", {text: "faye response"});
			log.info("broadcasting bayeux message to /channel");
			res.writeHead(200);
			res.end();
		});
	} else {
        returnError(405, req, res);
    }
}*/

var handle = new Array();
//handle["/paint"] = client;
handle["/"] = function (req, res, db) {
    res.writeHead(200, { "Content-Type": "text/plain" });
    res.end("hi c: <3");
}
handle["/guestLogin"]   = addGuest;
handle["/loginAuth"]    = loginAuth;
handle["/guestLogout"]  = dropGuest;
handle["/userLogout"]	= userLogout;
handle["/makeRoom"]		= makeRoom;
handle["/getRoomList"]	= getRoomList;
handle["/getRoomCreator"]= getRoomCreator;
handle["/getRoomUsers"]	= getRoomUsers;
handle["/joinRoom"]		= joinRoom;
handle["/leaveRoom"]	= leaveRoom;
handle["/disconnect"]	= disconnect;
//handle["/message"]		= faye;

module.exports = handle;