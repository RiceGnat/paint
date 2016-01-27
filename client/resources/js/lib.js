function createButton(options) {
	var b = document.createElement("input");
	b.type = "button";
	if (options.className) b.className = options.className;
	if (options.value) b.value = options.value;
	if (options.disabled) b.disabled = true;
	if (options.onclick) b.onclick = options.onclick;
	b.style.marginRight = "5px";
	return b;
}

function createTextbox(options) {
	var t = document.createElement("input");
	t.type = "text";
	if (options.className) t.className = options.className;
	if (options.value) t.value = options.value;
	if (options.placeholder) t.placeholder = options.placeholder;
	if (options.disabled) t.disabled = true;
	if (options.maxLength) t.maxLength = options.maxLength;
	if (options.name) t.name = options.name;
	t.style.marginRight = "10px";
	t.style.width = "150px";
	return t;
}

function createCheck(options) {
	var d = document.createElement("div");
	var c = document.createElement("input");
	c.type = "checkbox";
	c.className = "check";
	c.id = options.id;
	if (options.name) c.name = options.name;
	var l = document.createElement("label");
	l.htmlFor = c.id;
	l.className = "noselect";
	var s = document.createElement("span");
	s.className = options.dark ? "flat dark" : "flat";
	if (options.flip) {
		s.style.marginLeft = "6px";
		l.appendChild(document.createTextNode((options.label) ? options.label : ""));
		l.appendChild(s);
	} else {
		s.style.marginRight = "6px";
		l.appendChild(s);
		l.appendChild(document.createTextNode((options.label) ? options.label : ""));
	}
	if (options.display) {
		d.style.display = options.display;
	}
	d.appendChild(c);
	d.appendChild(l);
	return {
		div: d,
		check: c,
		label: l
	};
}

function createRadio(options) {
	var d = document.createElement("div");
	var c = document.createElement("input");
	c.type = "radio";
	c.className = "check round";
	c.id = options.id;
	if (options.name) c.name = options.name;
	var l = document.createElement("label");
	l.htmlFor = c.id;
	l.className = "noselect";
	var s = document.createElement("span");
	s.className = "flat";
	if (options.flip) {
		s.style.marginLeft = "8px";
		l.appendChild(document.createTextNode((options.label) ? options.label : ""));
		l.appendChild(s);
	} else {
		s.style.marginRight = "8px";
		l.appendChild(s);
		l.appendChild(document.createTextNode((options.label) ? options.label : ""));
	}
	if (options.display) {
		d.style.display = options.display;
	}
	d.appendChild(c);
	d.appendChild(l);
	return {
		div: d,
		radio: c,
		label: l
	};
}

function insertSpacer(pad) {
	var spacer = document.createElement("div");
	spacer.className = "spacer";
	if (pad) spacer.marginBottom = pad+"px";
	return spacer;
}

function swipeAwayLeft(selector, callback) {
	$(selector).animate({
		left: "-200px",
		right: "200px",
		opacity: "0"},
		fadeSpeed,
		function () {
			$(this).remove();
			if (typeof callback === 'function') callback();
		}
	);
}

function swipeAwayRight(selector, callback) {
	$(selector).animate({
		left: "200px",
		right: "-200px",
		opacity: "0"},
		fadeSpeed,
		function () {
			$(this).remove();
			if (typeof callback === 'function') callback();
		}
	);
}

function fadeAway(selector, callback) {
	$(selector).fadeOut(fadeSpeed,
		function () {
			$(this).remove();
			if (typeof callback === 'function') callback();
		}
	);
}

function fadeInto(selector, callback) {
	$(selector).fadeOut(0, function () {
		$(this).fadeIn(fadeSpeed, callback);
	});
}

function hexFromRGB(r, g, b) {
	var hex = [
		r.toString( 16 ),
		g.toString( 16 ),
		b.toString( 16 )
	];
	$.each( hex, function( nr, val ) {
		if ( val.length === 1 ) {
		hex[ nr ] = "0" + val;
		}
	});
	return hex.join( "" ).toUpperCase();
}

function randomName(mode) {
	var key = Math.floor(Math.random()*10)+mode*10;
	var name;
	switch (key) {
		case 0: name = "Solo room"; break;
		case 1: name = "So lonely..."; break;
		case 2: name = "Oh bears"; break;
		case 3: name = "Who needs friends"; break;
		case 4: name = "All by yourself"; break;
		case 5: name = "You're the best around"; break;
		case 6: name = "Nothing's ever gonna keep you down"; break;
		case 7: name = "Dominating the solo queue ladder"; break;
		case 8: name = "Real rooms get more options"; break;
		case 9: name = "This space intentionally left blank"; break;
			
	}
	return name;
}

var _tic;
function tic() {
	_tic = new Date();
}
function toc() {
	var _toc = (new Date() - _tic)
	console.log(_toc + "ms");
	return _toc;
}

function escapeString(str) {
	return str.replace(/[&]/g,"&amp;").replace(/[<]/g,"&lt;").replace(/[>]/g,"&gt;");
}