var NONE	= 0,
	ERROR	= 1,
	INFO	= 2,
	DEBUG	= 3;
var level = DEBUG;

function thetime() {
	var d = new Date().toJSON();
	return "["+/*d.substring(0,10)+" "+*/d.substring(11,19)+"] ";
}

function debug(str) {
	if (level >= DEBUG) console.log(thetime()+str);
}

function info(str) {
	if (level >= INFO) console.log(thetime()+str);
}

function error(str) {
	if (level >= ERROR) console.log(thetime()+"ERROR: "+str);
}

exports.debug = debug;
exports.info = info;
exports.error = error;