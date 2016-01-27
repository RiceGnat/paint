var http = require("http");
var url = require("url");

var log = require("./logger");

function router(handle, pathname, req, res, db, ex) {
    if (typeof handle[pathname] === "function") {
        log.debug("Routing " + req.method + " request for " + pathname);
		handle[pathname](req,res,db,ex);
	} else {
		log.error("[404] No handler for " + pathname);
		res.writeHead(404, {"Content-Type": "text/plain"});
		res.end("404 Not Found");
	}
}

module.exports = router;