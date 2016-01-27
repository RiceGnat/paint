var http = require("http");
var url = require("url");
//var path = require("path");
var fs = require("fs");
var mysql = require("mysql");
//var faye = require("faye");

var log = require("./logger");
var route = require("./router");
var handle = require("./handlers");
var clientTable = require("./clientTable");
var roomTable = require("./roomTable");
var wsHandler = require("./wsHandler");

var onlineStatus = {};

var db = new mysql.createConnection({
	hostname: "localhost",
	user: "paintapp",
	password: "PCh47$",
	database: "paint"
});

var getClientIp = function (req) {
    var ipAddress = null;
    var forwardedIpsStr = req.headers['x-forwarded-for'];
    if (forwardedIpsStr) {
        ipAddress = forwardedIpsStr[0];
    }
    if (!ipAddress) {
        ipAddress = req.connection.remoteAddress;
    }
    return ipAddress;
};

// var bayeux = new faye.NodeAdapter({
	// mount: "/faye",
	// timeout: 60
// });

var server = http.createServer(function (req, res) {
    var client = getClientIp(req);
    if (clientTable.hit(client)) {
		var pathname = url.parse(req.url).pathname;
		log.info("Received " + req.method + " request for " + pathname + " from " + client);
		req.data = "";
		if (req.method == "GET") req.data = url.parse(req.url,true).query;
		route(handle, pathname, req, res, db, {"client":client, "clientTable":clientTable, "roomTable":roomTable.get(), "onlineStatus":onlineStatus});
    } else {
        log.error("[429] Connection refused for " + client);
        res.writeHead(429, { "Content-Type": "text/plain" });
        res.end("429 Too many requests");
    }
}).on("upgrade", function (req, socket, body) {
	var client = getClientIp(req);
	wsHandler.handle(client,req,socket,body);
});



clientTable.init(100,1000);
db.connect(function (err) {
	if (err != null) {
		log.error("Could not connect to server ("+err+")");
	} else {
		log.info("Connected to database");
		roomTable.init(db, 1000);
		wsHandler.init(db);
		server.listen(8888);
		log.info("Started server");
	}
});
// bayeux.attach(server);
// log.info("Mounting Faye");

//db.end();
