var Color = function (r, g, b, a) {
	this.r = r;
	this.g = g;
	this.b = b;
	this.a = a;
}
Color.prototype = {
	toString: function () { return "rgba("+this.r+", "+this.g+", "+this.b+", "+this.a+")"; },
	toRGB: function () { return "rgb("+this.r+", "+this.g+", "+this.b+")"; },
	toRGBA: function () { return "rgba("+this.r+", "+this.g+", "+this.b+", "+this.a/255+")"; }
}

var Brush = function (diameter, color, opacity, hardness) {
	this.diameter = 0;
	this.radius = 0;
	this.hardness = 0;
	this.spacing = 0;
	this.mask = new Float32Array();
	this.setSize(diameter, hardness);
	this.color = color;  // color.a is flow
	this.opacity = opacity;
	this.flow = 0;
	this.imageData = null;
	this.stamp = null;
}
Brush.prototype = {
	toString: function () { return this.diameter+"px " + this.color.toString(); },
	setMask: function () {
		this.mask = new Float32Array(this.diameter*this.diameter);
		if (this.diameter < 2) {
			this.mask[0] = 1;
		} else {
			for (var i = 0, len = this.diameter*this.diameter; i < len; i++) {
				// this.mask[i] = 1.0;
				var r = this.radius;
				var dsq = Math.pow(i%this.diameter-r,2) + Math.pow(Math.floor(i/this.diameter)-r,2);
				this.mask[i] = Math.min(1, dsq < r*r ? Math.pow((dsq)/-(r*r) + 1, 2)*(1+Math.pow(this.hardness,4)/1250000) : 0);
			}
		}
	},
	setSize: function (diameter, hardness) {
		this.diameter = diameter;
		this.radius = diameter/2;  // setMask wants non-rounded radius
		this.hardness = hardness;
		this.spacing = Math.max(1,diameter * 0.15 / Math.pow(hardness,.25));
		this.setMask();
		this.radius = Math.floor(this.radius);
	},
	initBrush: function () {
		/*
		this.stamp = document.createElement("canvas");
		this.imageData = this.stamp.getContext('2d').createImageData(this.diameter,this.diameter);
		for (var i = 0; i < this.mask.length; i++) {
			var i4 = i*4;
			this.imageData.data[i4]   = this.color.r;
			this.imageData.data[i4+1] = this.color.g;
			this.imageData.data[i4+2] = this.color.b;
			//this.imageData.data[i4+3] = Math.ceil(this.color.a*this.mask[i]*(.5-this.hardness/500));
			this.imageData.data[i4+3] = Math.ceil(255*this.mask[i]);
		}
		this.stamp.width = this.stamp.height = this.diameter;
		this.stamp.getContext('2d').putImageData(this.imageData,0,0);
		*/
		this.flow = this.color.a*(.5-this.hardness/500);
		var stamp = new Float32Array(this.diameter*this.diameter*4);
		for (var i = 0,
				 i4 = 0,
				 len = this.mask.length,
				 r = this.color.r/255,
				 g = this.color.g/255,
				 b = this.color.b/255; i < len; i++) {
			i4 = i*4;
			stamp[i4]	= r;
			stamp[i4+1]	= g;
			stamp[i4+2]	= b;
			stamp[i4+3]	= this.mask[i]*this.flow;
		}
		this.stamp = stamp;
		return this;
	}
}

var LayerObject = function (id, name, visible) {
	this.id = id;
	this.name = name;
	this.visible = visible;
	this.u_id = 0;
	
}
LayerObject.prototype = {
	toString: function () { return "Layer "+this.id+": "+this.name+ " ("+(this.visible ? "" : "not ")+"visible)"; },
	
}

var CanvasObject = function (width, height, numLayers, layerData) {
	this.width = width;
	this.height = height;
	this.layers = numLayers;
	this.layerList = {};
	this.layerOrder = new Array(numLayers);
	this.canvas = document.createElement("canvas");
	this.canvas.className = "noselect";
	this.canvas.width = width;
	this.canvas.height = height;
	this.canvas.style.width = width + "px";
	this.canvas.style.height = height + "px";
	this.canvas.style.marginLeft = -width/2 + "px";
	this.canvas.style.marginTop = -height/2 + "px";
	
	var createProgram = function (gl, vertSrc, fragSrc) {
		gl.useProgram(null);
		var vert = gl.createShader(gl.VERTEX_SHADER);
		var frag = gl.createShader(gl.FRAGMENT_SHADER);
		gl.shaderSource(vert, vertSrc);
		gl.shaderSource(frag, fragSrc);
		gl.compileShader(vert);
		gl.compileShader(frag);
		
		var prog = gl.createProgram();
		gl.attachShader(prog, vert);
		gl.attachShader(prog, frag);
		
		gl.linkProgram(prog);
		gl.useProgram(prog);
		
		var tLoc = gl.getAttribLocation(prog, "a_texCoord");
		var tBuff = gl.createBuffer();
		gl.bindBuffer(gl.ARRAY_BUFFER, tBuff);
		gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
		  0.0,  1.0,
		  0.0,  0.0,
		  1.0,  0.0,
		  1.0,  1.0]), gl.STATIC_DRAW);
		gl.enableVertexAttribArray(tLoc);
		gl.vertexAttribPointer(tLoc, 2, gl.FLOAT, false, 0, 0);
		
		return prog;
	}
	
	function createTexture(gl) {
		var texture = gl.createTexture();
		gl.bindTexture(gl.TEXTURE_2D, texture);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
		return texture;
	}
	
	var glOptions = {preserveDrawingBuffer: true,
					 premultipliedAlpha: false};
	var gl = this.canvas.getContext("webgl", glOptions) ||
			 this.canvas.getContext("experimental-webgl", glOptions);
	gl.getExtension("OES_texture_float");
	
	gl.viewport(0, 0, width, height);
	
	// gl.blendFuncSeparate(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA,
						 // gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
	gl.disable(gl.BLEND);
	gl.disable(gl.DEPTH_TEST);
	
	var vertSrc = 
	"attribute vec2 a_position;" +
	"attribute vec2 a_texCoord;" +
	"uniform vec2 u_resolution;" +
	"varying vec2 v_texCoord;" +
	"varying vec2 v_texCoord2;" +
	"void main() {" +
	"	vec2 normalized = a_position/u_resolution;" +
	"	vec2 clipCoords = (normalized*2.0-1.0);" +
	"	gl_Position = vec4(clipCoords, 0, 1);" + 
	"	v_texCoord = a_texCoord;" +
	"	v_texCoord2 = normalized;" +
	"}";
	var fragSrc = 
	"precision highp float;" +
	"uniform sampler2D u_image;" +
	"uniform sampler2D u_back;" +
	"uniform int u_mode;" +
	"varying vec2 v_texCoord;" +
	"varying vec2 v_texCoord2;" +
	"void main() {" +
	"	vec4 src = texture2D(u_image, v_texCoord);" +
	"	vec4 dst = texture2D(u_back, v_texCoord2);" +
	"	vec4 c0 = vec4(0,0,0,0);" +
	"	if (u_mode == 0) {" +
	"	c0.a = src.a + dst.a*(1.0-src.a);" +
	"	c0.rgb = (src.rgb*src.a + dst.rgb*dst.a*(1.0-src.a))/c0.a;" +
	"	} else if (u_mode == 1) {" +
	"	c0.a = dst.a*(1.0-src.a);" +
	"	c0.rgb = dst.rgb;" +
	"	} else if (u_mode == 2) {" +
	"	vec3 Sca = src.rgb*src.a;" +
	"	vec3 Dca = dst.rgb*dst.a;" +
	"	c0.a = src.a + dst.a*(1.0-src.a);" +
	"	c0.rgb = (Sca*Dca+Sca*(1.0-dst.a)+Dca*(1.0-src.a))/c0.a;" +
	"	} else if (u_mode == 3) {" +
	"	vec3 Sca = src.rgb*src.a;" +
	"	c0.a = src.a + dst.a*(1.0-src.a);" +
	"	c0.rgb = (Sca+dst.rgb*dst.a*(1.0-Sca))/c0.a;" +
	"	} else if (u_mode == 4) {" +
	"	vec3 Sca = src.rgb*src.a;" +
	"	vec3 Dca = dst.rgb*dst.a;" +
	"	c0.a = src.a + dst.a*(1.0-src.a);" +
	"	c0.r = (dst.r <= 0.5 ? 2.0*Sca.r*Dca.r+Sca.r*(1.0-dst.a)+Dca.r*(1.0-src.a) : Sca.r*(1.0+dst.a)+Dca.r*(1.0+src.a)-2.0*Dca.r*Sca.r-dst.a*src.a)/c0.a;" +
	"	c0.g = (dst.g <= 0.5 ? 2.0*Sca.g*Dca.g+Sca.g*(1.0-dst.a)+Dca.g*(1.0-src.a) : Sca.g*(1.0+dst.a)+Dca.g*(1.0+src.a)-2.0*Dca.g*Sca.g-dst.a*src.a)/c0.a;" +
	"	c0.b = (dst.b <= 0.5 ? 2.0*Sca.b*Dca.b+Sca.b*(1.0-dst.a)+Dca.b*(1.0-src.a) : Sca.b*(1.0+dst.a)+Dca.b*(1.0+src.a)-2.0*Dca.b*Sca.b-dst.a*src.a)/c0.a;" +
	"	}" +
	"	gl_FragColor = c0;" +
	//"	gl_FragColor = vec4(0,0,0,1);" +
	"}";
	// for (var i = 0; i < numLayers; i++) {
		// fragSrc[0] += "uniform sampler2D u_brush"+i+";";
		// fragSrc[1] += ((i > 0) ? "else " : "") + "if (u_layer=="+i+") src = texture2D(u_brush"+i+", v_texCoord);";
	// }
	//fragSrc = fragSrc.join("");
	
	var brushProg = createProgram(gl, vertSrc, fragSrc);
	
	vertSrc = 
	"attribute vec2 a_position;" +
	"attribute vec2 a_texCoord;" +
	"uniform vec2 u_resolution;" +
	"varying vec2 v_texCoord;" +
	"void main() {" +
	"	vec2 normalized = a_position/u_resolution;" +
	"	gl_Position = vec4((normalized*2.0-1.0)*vec2(1,-1), 0, 1);" +
	"	v_texCoord = a_texCoord;" +
	"	v_texCoord = normalized;" +
	"}";
	
	fragSrc = [
	"precision highp float;",
	"varying vec2 v_texCoord;" +
	"void main() {" +
	"	vec4 src, dst, c0;" +
	"	dst = vec4(1,1,1,1);",
	"	gl_FragColor = dst;" +
	"}"];
	for (var i = 0; i < numLayers; i++) {
		fragSrc[0] += "uniform sampler2D u_image"+i+";";
		fragSrc[1] += 
	"	src = texture2D(u_image"+i+", v_texCoord);" +
	"	c0.a = src.a + dst.a*(1.0-src.a);" +
	"	c0.rgb = (src.rgb*src.a + dst.rgb*dst.a*(1.0-src.a))/c0.a;" +
	"	dst = c0;";
	}
	fragSrc = fragSrc.join("");
	
	var layerProg = createProgram(gl, vertSrc, fragSrc);
	
	for (var i = 0; i < numLayers; i++) {
		var layer = new LayerObject(
			layerData[i].layer_id,
			layerData[i].name,
			true);
		
		// Set up framebuffers
		var texture = createTexture(gl);
		gl.texImage2D(
			gl.TEXTURE_2D, 0, gl.RGBA, width, height, 0, gl.RGBA, gl.FLOAT, null);
		layer.texture = texture;
		
		var fbo = gl.createFramebuffer();
		gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
		gl.framebufferTexture2D(
			gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, layer.texture, 0);
		gl.clearColor(0,0,0,0);
		gl.clear(gl.COLOR_BUFFER_BIT);
		layer.fbo = fbo;
		gl.bindFramebuffer(gl.FRAMEBUFFER, null);
		gl.bindTexture(gl.TEXTURE_2D, null);
		
		// Create textures for brush
		texture = createTexture(gl);
		layer.brushTex = texture;
		
		this.layerList[layer.id] = layer;
		this.layerOrder[i] = layer.id;
	}
	
	
		
	var pLoc = gl.getAttribLocation(layerProg, "a_position");
	gl.enableVertexAttribArray(pLoc);
	gl.vertexAttribPointer(pLoc, 2, gl.FLOAT, false, 0, 0);
	var pBuff = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, pBuff);
	gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
		0,  height,
	  0, 0,
	   width, 0,
	   width,  height]), gl.STATIC_DRAW);
	this.layerPBuff = pBuff;
	
	// pBuff = gl.createBuffer();
	// this.brushPBuff = pBuff;
	
	this.blankTexture = createTexture(gl);
	gl.texImage2D(
		gl.TEXTURE_2D, 0, gl.RGBA, width, height, 0, gl.RGBA, gl.FLOAT, null);

	var fbo = gl.createFramebuffer();
	gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
	gl.framebufferTexture2D(
		gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this.blankTexture, 0);
	gl.clearColor(0,0,0,0);
	gl.clear(gl.COLOR_BUFFER_BIT);
	gl.bindFramebuffer(gl.FRAMEBUFFER, null);
	gl.bindTexture(gl.TEXTURE_2D, null);
		
	for (var i = 0; i < numLayers; i++) {
		gl.uniform1i(gl.getUniformLocation(layerProg, "u_image"+i), i);
		gl.activeTexture(gl.TEXTURE0 + i);
		gl.bindTexture(gl.TEXTURE_2D, this.layerList[this.layerOrder[i]].texture);
	}
	gl.uniform2f(gl.getUniformLocation(layerProg, "u_resolution"), width, height);
	
	gl.useProgram(brushProg);
	gl.uniform2f(gl.getUniformLocation(brushProg, "u_resolution"), width, height);
	gl.uniform1i(gl.getUniformLocation(brushProg, "u_image"), numLayers);
	gl.uniform1i(gl.getUniformLocation(brushProg, "u_back"),numLayers+1);
	
	pLoc = gl.getAttribLocation(brushProg, "a_position");
	gl.enableVertexAttribArray(pLoc);
	gl.vertexAttribPointer(pLoc, 2, gl.FLOAT, false, 0, 0);
	
	this.gl = gl;
	this.brushProg = brushProg;
	this.layerProg = layerProg;
	// this.brushModes = {
		// "source_over": 0,
		// "destination_out": 1,
		// "multiply": 2
	// }
}
CanvasObject.prototype = {
	switchToLayers: function () {
		var gl = this.gl;
		gl.useProgram(this.layerProg);
		
		var pLoc = gl.getAttribLocation(this.layerProg, "a_position");
		// gl.bindBuffer(gl.ARRAY_BUFFER, this.layerPBuff);
		gl.enableVertexAttribArray(pLoc);
		gl.vertexAttribPointer(pLoc, 2, gl.FLOAT, false, 0, 0);
		/*
		for (var i = 0; i < this.layers; i++) {
			// gl.uniform1i(gl.getUniformLocation(this.layerProg, "u_image"+i), i);
			// gl.activeTexture(gl.TEXTURE0 + i);
			// gl.bindTexture(gl.TEXTURE_2D, this.layerList[this.layerOrder[i]].texture);
		}*/
	},
	switchToBrush: function () {
		var gl = this.gl;
		gl.useProgram(this.brushProg);
		
		var pLoc = gl.getAttribLocation(this.brushProg, "a_position");
		// gl.bindBuffer(gl.ARRAY_BUFFER, this.brushPBuff);
		gl.enableVertexAttribArray(pLoc);
		gl.vertexAttribPointer(pLoc, 2, gl.FLOAT, false, 0, 0);
		
		// gl.uniform2f(gl.getUniformLocation(this.brushProg, "u_resolution"), this.width, this.height);
		// gl.uniform1i(gl.getUniformLocation(this.brushProg, "u_image"), this.layers);
		// gl.uniform1i(gl.getUniformLocation(this.brushProg, "u_back"),this.layers+1);
	},
	drawLayers: function (w, h) {
		var gl = this.gl;
		this.switchToLayers();
		
		// gl.bindFramebuffer(gl.FRAMEBUFFER, this.fbo);
		// gl.clearColor(1,1,1,1);
		// gl.clear(gl.COLOR_BUFFER_BIT);
		// gl.activeTexture(gl.TEXTURE1);
		// gl.bindTexture(gl.TEXTURE_2D, this.texture);
		// gl.activeTexture(gl.TEXTURE0);
		// for (var i = 0; i < this.layers; i++) {
			// var layer = this.layerList[this.layerOrder[i]];
			// gl.bindTexture(gl.TEXTURE_2D, layer.texture);
			// gl.drawArrays(gl.TRIANGLE_FAN, 0, 4);
		// }
		gl.bindFramebuffer(gl.FRAMEBUFFER, null);
		// gl.activeTexture(gl.TEXTURE1);
		// gl.bindTexture(gl.TEXTURE_2D, null);
		// gl.activeTexture(gl.TEXTURE0);
		// gl.bindTexture(gl.TEXTURE_2D, this.layerList[0].texture);
		//gl.clearColor(0,0,0,0);
		//gl.clear(gl.COLOR_BUFFER_BIT);
		gl.drawArrays(gl.TRIANGLE_FAN, 0, 4);
		// gl.bindBuffer(gl.ARRAY_BUFFER, null);
	},
	loadBrush: function (imgBuffer, w, h, id) {
		var gl = this.gl;
		//gl.useProgram(this.brushProg);
		gl.activeTexture(gl.TEXTURE0+this.layers);
		gl.bindTexture(gl.TEXTURE_2D, this.layerList[this.layerOrder[id]].brushTex);
		gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, w, h, 0, gl.RGBA, gl.FLOAT, imgBuffer);
	},
	drawBrush: function (x, y, w, h, id, m) {
		var gl = this.gl;
		var layer = this.layerList[this.layerOrder[id]];
		this.switchToBrush();
		gl.uniform1i(gl.getUniformLocation(this.brushProg, "u_mode"), m);
		gl.activeTexture(gl.TEXTURE0+this.layers);
		gl.bindTexture(gl.TEXTURE_2D, layer.brushTex);
		gl.activeTexture(gl.TEXTURE1+this.layers);
		gl.bindTexture(gl.TEXTURE_2D, layer.texture);
		gl.bindFramebuffer(gl.FRAMEBUFFER, layer.fbo);
		// var lLoc = gl.getUniformLocation(this.brushProg, "u_layer");
		// gl.uniform1i(lLoc,id);
		
		// gl.clearColor(0,0,1,.5);
		// gl.clear(gl.COLOR_BUFFER_BIT);
		// gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
			// -.5,   .5,
			// -.5,   -.5,
			// .5, -.5,
			// .5,   .5]), gl.STATIC_DRAW);
		gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
			x,   y+h,
			x,   y,
			x+w, y,
			x+w,   y+h]), gl.STATIC_DRAW);
		gl.drawArrays(gl.TRIANGLE_FAN, 0, 4);
		this.drawLayers();
	},
	setVisible: function (id, state) {
		var gl = this.gl;
		//gl.useProgram(this.layerProg);
		for (var i = 0; i < this.layers; i++) {
			if (this.layerOrder[i] == id) {
				gl.activeTexture(gl.TEXTURE0 + i);
				if (state) gl.bindTexture(gl.TEXTURE_2D, this.layerList[id].texture);
				else gl.bindTexture(gl.TEXTURE_2D, this.blankTexture);
				break;
			}
		}
		gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
			0,   this.height,
			0,   0,
			this.width, 0,
			this.width,   this.height]), gl.STATIC_DRAW);
		this.drawLayers(this.width, this.height);
	}
}

var Player = function (id, name, canvas, brush) {
	this.id = id;
	this.name = name;
	this.canvas = canvas ? canvas : null; //CanvasObject
	this.brush = brush ? brush : null;
}
Player.prototype = {
	toString: function () { return this.id + ": " + this.name+((this.brush != null) ? ("\n"+ this.brush.toString()) : "")+((this.canvas != null) ? ("\n"+this.canvas.toString()) : ""); }
}

var Room = function (r) {
	this.id = r.r_id;
	this.name = r.room_name;
	this.width = r.width;
	this.height = r.height;
	this.layers = r.layers;
	this.channel = r.channel;
	this.layerData = r.layerData;
}
Room.prototype = {
	toString: function () {
		return "Room "+this.id + ": "+this.name+"\n"+this.width+"x"+this.height+"x"+this.layers+" ; "+this.channel;
	}
}