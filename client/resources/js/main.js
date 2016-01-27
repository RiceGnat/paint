// Consts
var fadeSpeed = 400;
var intRegex = /^\d+$/;
var wordRegex = /^\w+$/;
var complRegex = /^[\x21-\x7E]+$/;
var uniRegex = /(?=^.+$)(?=^[^\u0000-\u001f]+$)/;

//var DOMAIN = "agarest.dyndns.org";
var DOMAIN = "localhost:8888"
var HTTP_URL = "http://"+DOMAIN;
var WS_URL = "ws://"+DOMAIN;

var CANVAS_DEFAULT_WIDTH = 640;
var CANVAS_DEFAULT_HEIGHT = 480;
var DEFAULT_LAYER_COUNT = 4;
var DEFAULT_MAX_USERS = 4;
var CANVAS_MAX_WIDTH = 2048;
var CANVAS_MAX_HEIGHT = 2048;
var MAX_LAYER_COUNT = 16;
var MAX_MAX_USERS = 8;
var MAX_ZOOM = 4;
var MIN_ZOOM = 0.25;
var ZOOM_STEP = 0.25;
var ROTATE_STEP = -15;
var TRANS_STEP = 10;

var MOUSE_LEFT = 0;
var MOUSE_RIGHT = 2;
var MOUSE_MIDDLE = 1;

var cos = Math.cos;
var sin = Math.sin;
var abs = Math.abs;
var sqrt = Math.sqrt;
function rad (deg) { return deg*Math.PI/180; }
function log10(val) { return Math.log(val) / Math.LN10; }

// Globals
var canvasProp;
var canvasSize = {	width: CANVAS_DEFAULT_WIDTH,
					height: CANVAS_DEFAULT_HEIGHT };
var glCanvas;
var player;
var room;
var ws;
var mouseDown = [0, 0, 0];
var stroke;
var brushMode = 0;

document.oncontextmenu = function () {return false};

window.onload = function () {
	loadHelloScreen();
}

window.onbeforeunload = function () {
	if (room) roomCleanup();
	if (player) logout();
}

window.onunload = function () {
	$.ajax({
		type: "POST",
		url: HTTP_URL+"/disconnect"
	});
}

function loadHelloScreen() {
	var welc = document.createElement("div");
	welc.id = "welcome";
	welc.className = "wrapper indent middle noselect";
	var title = document.createElement("div");
	title.id = "title";
	title.className = "reallybig content";
	title.innerHTML = "Hi there";
	var menu = document.createElement("div");
	menu.id = "login-prompt";
	var b1 = createButton({
				className: "flat action",
				value: "Log in",
				onclick: function () { showLogin("login"); }});
	var b2 = createButton({
				className: "flat",
				value: "Sign up",
				disabled: "disabled",
				onclick: function () { $("input").attr("disabled","disabled");}});
	var b3 = createButton({
				className: "flat",
				value: "I'm a guest",
				onclick: function () { showLogin("guest"); }});
	$(menu).append(b1,b2,b3);
	$(welc).append(title, menu);
	$("#main").append(welc);
	fadeInto(welc);
	$("#sidebar").animate({width: "70%"}, fadeSpeed);
}

function showLogin(mode) {
	$("#sidebar").empty();
	var login = document.createElement("div");
	login.id = "login";
	login.className = "wrapper middle indent";
	var span = document.createElement("span");
	span.className = "biggish";
	var form = document.createElement("form");
	form.id = "loginForm";
	form.action = "javascript:void(0)";
	switch (mode) {
		case "login":
			span.innerHTML = "Enter your credentials<br>";
			var name = createTextbox({
						className: "flat",
						name: "name",
						maxLength: 16,
						placeholder: "Username"});
			name.id = "name";
			var pass = createTextbox({
						className: "flat",
						name: "pass",
						maxLength: 24,
						placeholder: "Password"});
			pass.type = "password";
			pass.id = "password";
			var go = createButton({
						className: "flat action border",
						value: "Log me in",
						onclick: function () {
							$(this).attr("disabled","disabled");
							$("#loginForm").submit();
						}});
			go.id = "login-button";
			form.onsubmit = loginAuth;
			$(form).append(span,name,"<br>",pass, go);
			$(form).on("keydown", function (e) {
				if (e.keyCode == 13) $(this).submit();
			});
			$(login).append(form);
			break;
		case "guest":
			login.style.paddingTop = "15px";
			span.innerHTML = "Type a name for yourself<br>";
			var name = createTextbox({
						className: "flat",
						name: "name",
						placeholder: "Guest name",
			            maxLength: 16});
			name.id = "name";
			var go = createButton({
						className: "flat action border",
						value: "Get started",
						onclick: function () {
							$(this).attr("disabled","disabled");
							$("#loginForm").submit();
						}});
			go.id = "login-button";
			form.onsubmit = guestAuth;
			$(form).append(span,name, go);
			$(login).append(form);
			break;
	}
	$("#sidebar").append(login);
	fadeInto("#login", function () { $("#name").focus(); });
}

function loginAuth(event) {
    var retval = 0;
	var nameStr = $("#name").val();
	var passStr = $("#password").val();
	if (nameStr == "") retval = 1;
	else if (!wordRegex.test(nameStr)) retval = 2;
	else if (passStr == "") retval = 3;
	else if (!complRegex.test(passStr)) retval = 10;
	else {
	    $.ajax({
	        type: "POST",
	        url: HTTP_URL + "/loginAuth",
	        data: JSON.stringify({ "username": nameStr, "password": passStr }),
	        dataType: "json",
	        success: function (response) {
	            if (response.error) {
	                errorCode(response.error);
	                $("#login-button").blur().removeAttr("disabled");
	            }
	            else {
	                var data = response;
	                loginCleanup(response.u_id, response.username);
	            }
	        },
	        error: function () {
	            errorCode(6);
	            $("#login-button").blur().removeAttr("disabled");
	        },
			async: false
	    });
	}
	if (retval != 0) $("#login-button").removeAttr("disabled");
	return errorCode(retval);
}

function guestAuth(event) {
	var retval = 0;
	var nameStr = $("#name").val();
	if (nameStr == "") retval = 4;
	else if (!wordRegex.test(nameStr)) retval = 5;
	else {
		$.ajax({
			type: "POST",
			url: HTTP_URL+"/guestLogin",
			data: JSON.stringify({"name":nameStr}),
			dataType: "json",
			success: function (response) {
			    if (response.error) {
			        errorCode(response.error);
			        $("#login-button").blur().removeAttr("disabled");
			    }
			    else {
			        var data = response;
			        loginCleanup(-response.g_id, response.name);
			    }
			},
			error: function () {
			    errorCode(6);
			    $("#login-button").blur().removeAttr("disabled");
			},
			async: false
		});
	}
	if (retval != 0) $("#login-button").removeAttr("disabled");
	return errorCode(retval);
}

function loginCleanup(id, name) {
    player = new Player(id, name);
    //console.log(player.toString());
	fadeAway("#login");
	swipeAwayLeft("#welcome", function () {
		$("#sidebar").animate({width: "200px"}, function () {
			prepSidebar();
			loadLobby();
		});
	});
}

function prepSidebar() {
	var side = document.createElement("div");
	side.id = "sidebar-table";
	side.className = "panel-container";
	
	// static sidebar header
	var stat = document.createElement("div");
	stat.id = "sidebar-static";
	stat.className = "panel noselect";
	var name = document.createElement("div");
	name.className = "biggish";
	$(name).text(player.name);
	var loggedIn = document.createElement("div");
	loggedIn.id = "logged-in";
	$(loggedIn).append("Logged in" + (player.id < 0 ? " as a guest" : ""));
	
	// dynamic sidebar body
	var dyna = document.createElement("div");
	dyna.id = "sidebar-dynamic";
	dyna.className = "panel";
	
	$(stat).append(name, loggedIn);
	$(side).append(stat,dyna);
	$("#sidebar").append(side);
	fadeInto(side);
}

function loadLobby() {	// aka the real welcome screen
	var welc = document.createElement("div");
	welc.id = "welcome";
	welc.className = "wrapper indent middle";
	var title = document.createElement("div");
	title.id = "title";
	title.className = "reallybig content noselect";
	title.innerHTML = "Welcome to PaintChat";
	var menu = loadMainMenu();
	$(welc).append(title, menu);
	
	var lobbyControls = document.createElement("div");
	lobbyControls.id = "lobby-controls";
	lobbyControls.className = "panel-container";
	
	var body = document.createElement("div");
	body.className = "panel noselect";
	body.style.height = "100%";
	
	var buttons = document.createElement("div");
	buttons.id = "lobby-buttons";
	buttons.className = "panel noselect";
	var logoutButton = createButton({
				className: "flat border",
				value: "Log out",
				onclick: function () { 
					$("input").attr("disabled","disabled");
					logout();
					fadeAway("#sidebar > div");
					swipeAwayRight("#welcome", function () {
					loadHelloScreen();
						/*$("#sidebar").animate({width: "100%"}, function () {
							
						});*/
					});
				}});
	logoutButton.style.width = "100%";
	logoutButton.style.marginRight = "0";
	$(buttons).append(logoutButton);
	$(lobbyControls).append(body,buttons);
	$("#sidebar-dynamic").append(lobbyControls);
	
	$("#main").append(welc);
	fadeInto(welc);
	fadeInto(lobbyControls);
}

function loadMainMenu() {
	var menu = document.createElement("div");
	menu.id = "main-menu";
	menu.className = "content indent noselect";
	var span = document.createElement("span");
	span.className = "big content";
	span.innerHTML = "What would you like to do?<br>";
	var b1 = createButton({
				className: "flat action",
				value: "Make a room",
				onclick: function () { gameSetup(); }});
	var b2 = createButton({
				className: "flat",
				value: "Find a room",
				onclick: function () { listRooms(); }});
	var b3 = createButton({
				className: "flat",
				value: "Fly solo",
				onclick: function () {
					lobbyCleanup({
						r_id: 0,
						room_name: randomName(0),
						width: CANVAS_DEFAULT_WIDTH,
						height: CANVAS_DEFAULT_HEIGHT,
						layers: DEFAULT_LAYER_COUNT,
						layerData: function () {
						    var l = new Array(DEFAULT_LAYER_COUNT);
						    for (var i = 0; i < DEFAULT_LAYER_COUNT; i++) {
						        l[i] = { layer_id: i, name: "Layer " + i };
						    }
						    return l;
						}()
					});}});
	
	$(menu).append(span,b1,b2,b3);
	if (player.id < 1) {
		$(b1).attr("disabled","disabled");
		var guest = document.createElement("div");
		guest.className = "tip content noselect";
		guest.innerHTML = "Guests cannot create their own rooms";
		$(menu).append(guest);
	}
	return menu;
}

function gameSetup() {
	$("#main-menu input").attr("disabled","disabled");
	swipeAwayLeft("#main-menu", function () {
		var setup = document.createElement("div");
		setup.id = "game-setup";
		setup.className = "content indent";
		var span = document.createElement("span");
		span.className = "big content noselect";
		span.innerHTML = "Set up your room";
		
		var form = document.createElement("form");
		form.id = "setupForm";
		form.action = "javascript:void(0)";
		form.onsubmit = setupValid;
		
		var roomName = createTextbox({
							className: "flat",
							name: "roomName",
							placeholder: "Room name",
							maxLength: 48});
		roomName.id = "room-name";
		var roomPass = createTextbox({
							className: "flat",
							name: "roomPass",
							placeholder: "Password (optional)",
							maxLength: 24});
		roomPass.type = "password";
		roomPass.id = "room-password";
		
		var go = createButton({
					className: "flat action noselect",
					value: "Let's go",
					onclick: function () {
						$(this).attr("disabled","disabled");
						$("#setupForm").submit();
					}});
		go.id = "make-button";

		var back = createButton({
					className: "flat noselect",
					value: "Nevermind",
					onclick: function () {
						swipeAwayRight("#game-setup", function () {
							var menu = loadMainMenu();
							$("#welcome").append(menu);
							fadeInto(menu);
						});
					}});

		var spacer = document.createElement("div");
		spacer.id = "setup-space";
		spacer.style.height = "20px";
		
		var canvSize = document.createElement("div");
		canvSize.style.display = "inline-block";
		canvSize.style.marginRight = "20px";
		var szLbl = document.createElement("div");
		szLbl.className = "biggish noselect";
		szLbl.innerHTML = "Canvas size"
		var width = createTextbox({
						className: "flat",
						name: "canvasWidth",
						value: canvasSize.width,
						placeholder: "Width",
						maxLength: 4});
		width.id = "canvas-width";
		width.type = "number";
		width.style.width = "55px";
		width.style.marginRight = "0";
		var x = document.createElement("div");
		x.className = "biggish noselect";
		x.style.display = "inline-block";
		x.style.width = "20px";
		x.style.marginTop = "1px";
		x.style.textAlign = "center";
		x.innerHTML = "&times;";
		var height = createTextbox({
						className: "flat",
						name: "canvasHeight",
						value: canvasSize.height,
						placeholder: "Height",
						maxLength: 4});
		height.id = "canvas-height";
		height.type = "number";
		height.style.width = "55px";
		var sizeTip = document.createElement("span");
		sizeTip.className = "tip noselect";
		sizeTip.innerHTML = "Max "+CANVAS_MAX_WIDTH+"&times;"+CANVAS_MAX_HEIGHT;
		$(canvSize).append(szLbl,width,x,height,sizeTip);
		
		var layerCnt = document.createElement("div");
		layerCnt.style.display = "inline-block";
		layerCnt.style.marginRight = "10px";
		var lyLbl = document.createElement("div");
		lyLbl.className = "biggish noselect";
		lyLbl.innerHTML = "Layers";
		var numLayers = createTextbox({
							className: "flat",
							name: "layerCount",
							value: DEFAULT_LAYER_COUNT,
							placeholder: "Layers",
							maxLength: 2});
		numLayers.id = "layer-count";
		numLayers.type = "number";
		numLayers.style.width = "55px";
		var layersTip = document.createElement("span");
		layersTip.className = "tip noselect";
		layersTip.innerHTML = "Max "+MAX_LAYER_COUNT;
		$(layerCnt).append(lyLbl,numLayers,layersTip);
		
		var maxUsers = document.createElement("div");
		maxUsers.style.display = "inline-block";
		maxUsers.style.marginRight = "10px";
		var usLbl = document.createElement("div");
		usLbl.className = "biggish noselect";
		usLbl.innerHTML = "Max users"
		var numUsers = createTextbox({
							className: "flat",
							name: "maxUsers",
							value: DEFAULT_MAX_USERS,
							placeholder: "Users",
							maxLength: 2});
		numUsers.id = "max-users";
		numUsers.type = "number";
		numUsers.style.width = "55px";
		var usersTip = document.createElement("span");
		usersTip.className = "tip noselect";
		usersTip.innerHTML = "Up to " + MAX_MAX_USERS+"&#x2003;(You should have at least one layer per user)";
		$(maxUsers).append(usLbl,numUsers,usersTip);
		
		$(form).append(roomName,roomPass,go,back,spacer,canvSize,layerCnt,maxUsers);
		$(setup).append(span,form);
		$(form).on("keydown", function (e) {
			if (e.keyCode == 13) $(this).submit();
		});
		$("#welcome").append(setup);
		fadeInto(setup, function () { $("#room-name").focus(); });
	});
}

function setupValid(event) {
	var retval = 0;
	var nameStr = $("#room-name").val();
	nameStr = nameStr.trim();
	var passStr = $("#room-password").val();
	var widthStr = $("#canvas-width").val();
	var heightStr = $("#canvas-height").val();
	var layersStr = $("#layer-count").val();
	var usersStr = $("#max-users").val();
	if (nameStr == "") retval = 100;
	else if (!uniRegex.test(nameStr)) retval = 101;
	else if (passStr && !complRegex.test(passStr)) retval = 111;
	else if (!intRegex.test(widthStr)) retval = 102;
	else if (!intRegex.test(heightStr)) retval = 103;
	else if (!intRegex.test(layersStr)) retval = 104;
	else if (!intRegex.test(layersStr)) retval = 112;
	else if (Number(widthStr) == 0) retval = 105;
	else if (Number(heightStr) == 0) retval = 106;
	else if (Number(layersStr) == 0) retval = 107;
	else if (Number(usersStr) == 0) retval = 113;
	else if (Number(widthStr) > CANVAS_MAX_WIDTH) retval = 108;
	else if (Number(heightStr) > CANVAS_MAX_HEIGHT) retval = 109;
	else if (Number(layersStr) > MAX_LAYER_COUNT) retval = 110;
	else if (Number(usersStr) > MAX_MAX_USERS) retval = 114;
	else {
		$.ajax({
			type: "POST",
			url: HTTP_URL+"/makeRoom",
			data: JSON.stringify({
				"room_name":nameStr,
				"room_pass":passStr,
				"width":Number(widthStr),
				"height":Number(heightStr),
				"layers":Number(layersStr),
				"max_users":Number(usersStr),
				"u_id":player.id
			}),
			dataType: "json",
			success: function (response) {
				if (response.error) {
					retval = response.error;
				}
				else {
					//console.log(JSON.stringify(response));
					lobbyCleanup(response);
				}
			},
			error: function () {
				retval = 116;
			},
			async: false
		});
	}
	if (retval != 0) $("#make-button").blur().removeAttr("disabled");
	return errorCode(retval);
}

function listRooms() {
	$("#main-menu input").attr("disabled","disabled");
	swipeAwayLeft("#main-menu", function () {
		$("#welcome").removeClass("middle", fadeSpeed, function () {
			var find = document.createElement("div");
			find.id = "find-room";
			find.className = "content indent";
			var span = document.createElement("span");
			span.className = "big noselect";
			span.innerHTML = "Select a room";
			
			var buttons = document.createElement("div");
			buttons.id = "find-room-buttons";
			var go = createButton({
						className: "flat action noselect",
						value: "I want in",
						disabled: true,
						onclick: function () {
							$(this).attr("disabled","disabled");
							return joinValid($("#room-details-id").val());
						}});
			go.id = "join-button";
			var back = createButton({
						className: "flat noselect",
						value: "Nevermind",
						onclick: function () {
							window.onresize = null;
							fadeAway("#room-list");
							swipeAwayRight("#find-room", function () {
								var menu = loadMainMenu();
								$("#welcome").addClass("middle", fadeSpeed, function () {
									$("#welcome").append(menu);
									fadeInto(menu);
								});
							});
						}});
			var passField = createTextbox({
				className: "flat",
				maxLength: 24,
				name: "roomPass",
				placeholder: "Password for locked rooms",
				disabled: true
			});
			passField.id = "find-room-password";
			passField.type = "password";
			passField.style.width = "210px";
			$(buttons).append(passField,go,back);
			
			var roomDetails = document.createElement("div");
			roomDetails.id = "room-details";
			
			var preview = document.createElement("div");
			preview.className = "thumbnail";
					  
			var properties = document.createElement("div");
			properties.className = "properties";
			var p = document.createElement("div");
			p.id = "room-details-name";
			p.className = "content big noselect";
			$(properties).append(p);
			p = document.createElement("div");
			p.id = "room-details-creator";
			p.className = "content biggish noselect";
			$(properties).append(p);
			p = document.createElement("input");
			p.id = "room-details-id";
			p.type = "hidden";
			$(properties).append(p);
			
			$(roomDetails).append(preview,properties);
						
			$(find).append(span,roomDetails,buttons);
						
			var listDiv = document.createElement("div");
			listDiv.id = "room-list";
			
			var t = document.createElement("table");
			t.cellpadding = "0";
			t.cellspacing = "0";
			t.border = "0";
			t.id = "room-table";
			t.className = "noselect";
			var thead = document.createElement("thead");
			var tbody = document.createElement("tbody");
			var tr = document.createElement("tr");
			var headings = ["ID",
							"Room name",
							"Canvas",
							"Layers",
							"Users",
							"Lock"];
			for (var i = 0; i < headings.length; i++) {
				var th = document.createElement("th");
				th.className = "biggish";
				$(th).append(headings[i]);
				$(tr).append(th);
			}
			thead.appendChild(tr);
			$(t).append(thead,tbody);
			$(listDiv).append(t);
			
			jQuery.fn.dataTableExt.oSort['canvas-size-asc'] = function (x, y) {
				var areax = x[0]*x[1];
				var areay = y[0]*y[1];
				return ((areax < areay) ? -1 : ((areax > areay) ? 1 : 0))
			};
			jQuery.fn.dataTableExt.oSort['canvas-size-desc'] = function (x, y) {
				var areax = x[0]*x[1];
				var areay = y[0]*y[1];
				return ((areax < areay) ? 1 : ((areax > areay) ? -1 : 0))
			};
			
			jQuery.fn.dataTableExt.oSort['users-asc'] = function (x, y) {
				if (x[0] < y[0]) return -1;
				else if (x[0] > y[0]) return 1;
				else if (x[1] < y[1]) return -1;
				else if (x[1] > y[1]) return 1;
				else return 0;
			};
			jQuery.fn.dataTableExt.oSort['users-desc'] = function (x, y) {
				if (x[0] < y[0]) return 1;
				else if (x[0] > y[0]) return -1;
				else if (x[1] < y[1]) return 1;
				else if (x[1] > y[1]) return -1;
				else return 0;
			};
			
			var oTable = $(t).dataTable({
				"bLengthChange": false,
				"bAutoWidth": false,
				"bPaginate": false,
				"bProcessing": true,	
				"bDestroy": true,
				"sAjaxSource": HTTP_URL+"/getRoomList",
				"sScrollY": "500px",	// dummy value
				"sDom": "<fi>rt",
				"oLanguage": {
					"sInfo": "_TOTAL_ rooms",
					"sInfoEmpty": "0 rooms",
					"sInfoFiltered": "(out of _MAX_)",
					"sSearch": ""
				},
				"aoColumns": [
					{ "mData": "r_id",
					  "sClass": "number-col"},
					{ "mData": "room_name",
					  "sClass": "name-col"},
					{ "mData": "canvas",
					  "mRender": function (data) {return data[0]+" &times; "+data[1];},
					  "sClass": "canvas-col",
					  "sType": "canvas-size"},
					{ "mData": "layers",
					  "sClass": "number-col"},
					{ "mData": "users",
					  "mRender": function (data) {return data[0]+" / "+data[1];},
					  "sClass": "number-col",
					  "sType": "users"},
					{ "mData": "password",
					  "mRender": function (data) {return (data ? "&#x1f512;" : "");},
					  "sClass": "char-col smallish"}
					],
				"fnRowCallback": function (nRow, aData, iDisplayIndex, iDisplayIndexFull) {
					$("td:eq(1)", nRow).text(aData.room_name);
				},
				"aaSorting": [[0,'desc']]
			});
			
			var updateScrollbars = function () {
				$("#room-list div.dataTables_scrollBody").perfectScrollbar('update');
			}
			
			$(find).append(listDiv);
			$("#welcome").append(find);
			$(find).fadeOut(0);
			oTable.fnAdjustColumnSizing();
					  
			var row = document.createElement("div");
			row.style.height = "100%";
			var rel = document.createElement("div");
			rel.className = "content fill";
			$(row).append(rel);
			$("#room-list div.dataTables_scrollBody").appendTo(rel);
			$("#room-list div.dataTables_wrapper").append(row);
			$("#room-list div.dataTables_wrapper>div").addClass("panel",0);
			$("#room-list div.dataTables_filter input")
				.attr("class", "flat")
				.attr("placeholder", "Filter room list")
				.bind("keyup", updateScrollbars);
			$("#room-list div.dataTables_info").addClass("biggish noselect",0);
			$("#room-list div.dataTables_processing").addClass("tip noselect",0);
			
			$("#room-list div.dataTables_scrollBody").perfectScrollbar({
				minScrollbarLength: 20,
				bindContent: $("#room-table")});
			window.onresize = updateScrollbars;
			
			fadeInto(find, function () {
				updateScrollbars();
				$("#room-list tbody tr").not(":has(td.dataTables_empty)").click( function (e) {
					if (!$(this).hasClass("selected")) {
						oTable.$("tr.selected").removeClass("selected",0);
						$(this).addClass("selected",0);
						var entry = oTable.fnGetData(this);
						if (entry.password) {
							$("#find-room-password").removeAttr("disabled");
						} else {
							$("#find-room-password").val(null)
													.attr("disabled","disabled");
						}
						$("#room-details").fadeOut(fadeSpeed/2, function () {
							$("#room-details-name").text(entry.room_name);
							$("#room-details>.thumbnail").css("opacity","1.0");
							$("#room-details-id").val(entry.r_id);
							$.ajax({
								type: "GET",
								url: HTTP_URL+"/getRoomCreator?r_id="+entry.r_id,
								dataType: "json",
								success: function (results) {
									$("#room-details-creator").html("Created by "+results.creatorName);
								},
								complete: function () {
									$("#room-details").fadeIn(fadeSpeed/2);
									$("#join-button").removeAttr("disabled");
								}
							});
						});
					}
				}).filter(":first").click();
			});
		});
	});
}

function joinValid(r_id) {
	var retval = 0;
	var passStr = $("#find-room-password").val();
	if (passStr && !complRegex.test(passStr)) retval = 211;
	else {
		$.ajax({
			type: "POST",
			url: HTTP_URL+"/joinRoom",
			data: JSON.stringify({
				"r_id":r_id,
				"room_pass":passStr,
				"u_id":player.id
			}),
			dataType: "json",
			success: function (response) {
				if (response.error) {
					retval = response.error;
				}
				else {
					//console.log(JSON.stringify(response));
					lobbyCleanup(response);
				}
			},
			error: function () {
				retval = 216;
			},
			async: false
		});
	}
	if (retval != 0) $("#join-button").blur().removeAttr("disabled");
	return errorCode(retval);
}

function setupWebSocket(callback) {
	if (room.id > 0) {
		$("#room-buttons > input").removeAttr("disabled");
		$("#ws-status").html("Requesting connection...");
		ws = new WebSocket(WS_URL+"/?u_id="+player.id);
		ws.onopen = function () {
			$("#ws-status").html("Opening connection...");
			ws.send(JSON.stringify([room.channel,player.id,'join',player.name]));
		}
		ws.onerror = function (error) {
			console.log("WebSocket error");
			$("#ws-status").html("Something broke");
			roomCleanup();
		}
		ws.onclose = function (error) {
			console.log("WebSocket connection closed");
			$("#ws-status").html("Connection closed");
			// only call roomCleanup if it hasn't been yet
			// this facilitates forcible eviction
			ws = null;
			if (error.code == 4001) room = null;
			if (canvasProp) roomCleanup();
		}
		ws.onmessage = function (event) {
			if (event.data === room.channel) {
				$("#ws-status").html("Connection ready");
				$("#room-buttons > input").attr("disabled","disabled");
				callback();
			}
		}
	} else callback();
}

function lobbyCleanup(response) {
	$("input").attr("disabled","disabled");
	fadeAway("#sidebar-dynamic > div");
	swipeAwayLeft("#welcome", function () {
		initRoom(response);
	});
}

function initRoom(response) {
	player.brush = new Brush(51, new Color(85, 76, 121, .5), 1, 100);
	
	room = new Room(response);
	//console.log(room.toString());
	
	// #sidebar
	var s = document.createElement("div");
	s.id = "room-controls";
	s.className = "panel-container";
	var rname = document.createElement("div");
	rname.id = "room-title";
	rname.className = "panel noselect";
	$(rname).text(room.name);
	
	var wsStatus = document.createElement("div");
	wsStatus.id = "ws-status";
	wsStatus.className = "noselect tip";
	if (room.id != 0)
		wsStatus.innerHTML = "Not connected";
	$(rname).append(wsStatus);
	
	var body = document.createElement("div");
	body.id = "user-list-panel";
	body.className = "panel noselect";
	
	var chat = document.createElement("div");
	chat.id = "chat";
	chat.className = "panel noselect";
	
	var chatText = document.createElement("div");
	chatText.className = "panel";
	
	if (room.id > 0) {
		var rel = document.createElement("div");
		rel.className = "content";
		var ul = document.createElement("ul");
		ul.id = "user-list";
		$(rel).append(ul);
		$(body).append(rel);
		
		$(rel).perfectScrollbar({
			minScrollbarLength: 20,
			bindContent: $(ul),
			extraClasses: "dark"
		});
		
		rel = document.createElement("div");
		rel.className = "content fill";
		var abs = document.createElement("div");
		abs.className = "wrapper";
		var msgs = document.createElement("div");
		msgs.id = "messages";
		msgs.className = "content";
		$(abs).append(msgs);
		$(rel).append(abs);
		$(chat).append(rel);
		
		$(abs).perfectScrollbar({
			minScrollbarLength: 20,
			bindContent: $(msgs),
			extraClasses: "dark"
		});
		
		var t = createTextbox({
			className: "flat"
		});
		t.id = "chat-textbox";
		t.style.marginRight = 0;
		t.style.width = "100%";
		
		t.onkeydown = function (e) {
			var str = this.value.trim();
			if (e.keyCode == 13 && this.value != "") {
				ws.send(JSON.stringify([room.channel,player.id,'text',player.id,str]));
				this.value = "";
			}
		}
		
		$(chatText).append(t);
	}
	
	var buttons = document.createElement("div");
	buttons.id = "room-buttons";
	buttons.className = "panel noselect";
	var exit = createButton({
				className: "flat border",
				value: "Leave room",
				disabled: true,
				onclick: function () { roomCleanup(); }});
	exit.style.width = "100%";
	exit.style.marginRight = "0";
	$(buttons).append(exit);
	$(s).append(rname,body,chat,chatText,buttons);
	$("#sidebar-dynamic").append(s);
	fadeInto(s);
	
	loadCanvasFrame();
}

function appendMsg(str) {
	$("#messages").append("<div class='tight'>"+str+"</div>");
	$("#chat .ps-container").perfectScrollbar('moveY',1.0);
}

function loadCanvasFrame() {
	// #main
	var f = document.createElement("div");
	f.id = "frame";
	f.className = "content fill";
	
	var view = document.createElement("div");
	view.id = "viewport";
	view.className = "wrapper noselect";
	view.tabIndex = 0;
	f.onkeydown = keyListener;
	view.oncontextmenu = function () { console.log("contextmenu"); };
	/*
	var paper = document.createElement("canvas");
	paper.id = "paper";
	paper.innerHTML = "HTML5 canvas is not supported by your browser.";
	paper.width = room.width;
	paper.height = room.height;
	paper.style.width = paper.width + "px";
	paper.style.height = paper.height + "px";
	paper.style.marginLeft = -paper.width/2 + "px";
	paper.style.marginTop = -paper.height/2 + "px";
	paper.style.zIndex = -1;
	paper.style.pointerEvents = "none";
	var ptx = paper.getContext('2d');
	ptx.fillStyle = "#ffffff";
	ptx.fillRect(0,0,paper.width,paper.height);
	
	backdrop = document.createElement("canvas");
	backdrop.width = paper.width;
	backdrop.height = paper.height;
	
	view.appendChild(paper);
	
	for (var i = 0; i < room.layers; i++) {
		var layer = new LayerObject(
			room.layerData[i].layer_id,
			room.layerData[i].name,
			true);
		glCanvas.layerList[layer.id] = layer;
		glCanvas.layerOrder.push(layer.id);
		//$(view).append(layer.canvas, layer.stroke);
	}
	*/
	
	glCanvas = new CanvasObject(
		room.width,
		room.height,
		room.layers,
		room.layerData);
	glCanvas.canvas.id = "paper";
	glCanvas.canvas.style.pointerEvents = "none";
	$(view).append(glCanvas.canvas);
	
	canvasProp = {
		scale: 1,
		rotate: 0,
		trans: {x:0, y:0},
		flip: false
	};
	
	var ctls = document.createElement("div");
	ctls.id = "controls";
	ctls.className = "wrapper";
	var ctlsContent = document.createElement("div");
	ctlsContent.className = "panel-container";
	
	var rgb = setupColorCtl();
	var bctl = setupBrushCtl();
	var lctl = setupLayersCtl();
	$(ctlsContent).append(rgb,bctl,lctl);
	ctls.appendChild(ctlsContent);
	
	f.appendChild(view);
	f.appendChild(ctls);
	
	$("#main").append(f);
	$("#viewport > canvas, #controls > div").fadeOut(0);
	$("#main").css("background-color", "#444444");
	fadeInto(f, function () {
		/*$("#viewport").animate({
			left: "200px"
		}, fadeSpeed);*/
		setupWebSocket(function() {
			if (ws) {
				ws.onmessage = wsMsgHandler;
				updateUserList();
				ws.send(JSON.stringify([room.channel,player.id,'sync',room.id]));
			}
			else canvasReady({});
		});
	});
	
	var info = document.createElement("div");
	info.id = "info";
	info.className = "panel small noselect";
	var zoomDiv = document.createElement("div");
	zoomDiv.id = "zoom";
	var rotDiv = document.createElement("div");
	rotDiv.id = "rotation";
	var flipDiv = document.createElement("div");
	flipDiv.id = "flipped";
	var coordDiv = document.createElement("div");
	coordDiv.id = "coords";
	$(info).append(zoomDiv,rotDiv,flipDiv,coordDiv);
	$(ctlsContent).append(info);
	
	// Do this for visible canvas only
	view.onmousemove = mouseMoveHandler;
	glCanvas.canvas.onmousedown = mouseDownHandler;
	document.onmouseup   = mouseUpHandler;
	view.onmouseout = function () { $("#coords").html("--"); };
	// -------------------------------
	view.onmouseout();
	transformCanvas({});
	
	player.brush.initBrush();
	$("#primary").attr("data-value",JSON.stringify(player.brush.color))
				 .css("background-color",player.brush.color.toRGB())
				 .addClass("active-color",0);
	$("#secondary").attr("data-value",JSON.stringify(new Color(255,255,255,255)))
				   .css("background-color","#ffffff");
	//console.log(player.toString());
	
	view.focus();
}

function canvasReady(data) {
	$("#controls").animate({
		width: "200px"
	}, fadeSpeed, function () {
		var updateScrollbars = function () {
			$(".ps-container:not(#chat>.wrapper)").perfectScrollbar('update');
		}
		$("#viewport > canvas, #controls > div").fadeIn(fadeSpeed, function () {
			updateScrollbars();
		});
		window.onresize = updateScrollbars;
		
		glCanvas.drawLayers(glCanvas.width, glCanvas.height);
		for (var i in data.layers) {
			var id = data.layers[i][0];
			glCanvas.layerList[id].u_id = data.layers[i][1];
			$("#"+id+">.layer-user").text(data.layers[i][2]);
		}
		for (var i in glCanvas.layerOrder) {
			if (glCanvas.layerList[glCanvas.layerOrder[i]].u_id == 0) {
				$("#"+glCanvas.layerOrder[i]).click();
				$("#visible").attr("checked",player.canvas.visible);
				$("#layer-list-wrapper .wrapper").perfectScrollbar('moveY',(room.layers-i-1)/(room.layers-1));
				$("#paper").css("pointer-events","auto");
				break;
			}
		}
		if (!player.canvas) 
			appendMsg("<span class='tip'>There are no layers for you</span>");
		$("#room-buttons > input").removeAttr("disabled");
	});
}

function updateUserList() {
	$.ajax({
		type: "GET",
		url: HTTP_URL+"/getRoomUsers?r_id="+room.id,
		dataType: 'json',
		success: function (results) {
			var newList = document.createElement("ul");
			//newList.className = "wrapper";
			for (var i = 0, len = results.length; i < len; i++) {
				var li = document.createElement("li");
				li.className = "tight";
				$(li).append(results[i].name);
				$(newList).append(li);
			}
			newList.id = "user-list";
			$("#user-list").replaceWith(newList);
			$("#user-list-panel>div").perfectScrollbar('update');
		}
	});
}
function wsMsgHandler(event) {
	//console.log("Server: " + event.data);
	var msg = JSON.parse(event.data);
	
	switch (msg[0]) {
		case 'join':
			//console.log(msg[1]+" joined the room");
			appendMsg("<span class='tip'>"+msg[1]+" joined the room</span>");
			updateUserList();
			break;
		case 'sync':
			canvasReady(msg[1]);
			break;
		case 'leave':
			appendMsg("<span class='tip'>"+msg[1]+" left the room</span>");
			updateUserList();
			for (var i in msg[2]) {
				glCanvas.layerList[msg[2][i]].u_id = 0;
				$("#"+msg[2][i]+">.layer-user").html("&nbsp;");
			}
			break;
		case 'stroke':
			console.log("Drawing stroke");
			_stroke((new Brush(msg[1],msg[2],msg[3],msg[4])).initBrush(),msg[5],msg[6],msg[7]);
			break;
		case 'layer':
			//console.log(JSON.stringify(msg));
			_layer(msg[1],msg[2],msg[3],msg[4]); break;
		case 'visible':
			glCanvas.setVisible(msg[1], msg[2]); break;
		case 'text':
			appendMsg("<span class='strong'>"+msg[1]+":&nbsp;</span>"+escapeString(msg[2]));
			break;
		case 'bench':
			var m = msg[1];
			var len = m.length;
			console.log("Rendering "+len+" strokes of "+m[0][7].length+" points each");
			tic();
			var i = 0;
			var s;
			var draw = function() {
				s = m[i];
				console.log("stroke");
				_stroke((new Brush(s[1],s[2],s[3],s[4])).initBrush(),s[5],s[6],s[7]);
				i++;
				if (i < len) setTimeout(draw,0);
				else {console.log("Done");toc();}
			}
			setTimeout(draw,0);
			// for (i = 0; i < len; i++) {
				// s = msg[1][i]
				// console.log("stroke");
				// _stroke((new Brush(s[1],s[2],s[3],s[4])).initBrush(),s[5],s[6],s[7]);
			// }
			// console.log("Done");
			toc();
	}
}

function roomCleanup() {
	$("#viewport").get(0).onmousemove = null;
	window.onresize = null;
	// Housekeeping
	canvasProp = null;
	glCanvas = null;
	mouseDown = [0, 0, 0];
	stroke = null;
	brushMode = 0;
	if (ws) {
		ws.close(4000);
		ws = null;
	}
	player.canvas = null;
	if (room && room.id > 0) {
		$.ajax({
			type: "POST",
			url: HTTP_URL+"/leaveRoom",
			data: JSON.stringify({u_id:player.id}),
			async: false
		});
	}
	room = null;
	
	fadeAway("#room-controls");
	$("#viewport > canvas, #controls > div").fadeOut(fadeSpeed, function () {

		$("#controls").animate({
			width: "100%"
		}, fadeSpeed, function () {
			fadeAway("#frame", function () {
				$("#main").css("background-color", "#f0f0f0");
				loadLobby();
			});
		});
	});
}

function setupColorCtl() {
	var rgb = document.createElement("div");
	rgb.id = "color";
	rgb.className = "panel noselect";
	var mode = document.createElement("div");
	mode.innerHTML = "RGB";
	var sliders = document.createElement("div");
	sliders.className = "noselect";
	var r = document.createElement("div");
	r.id = "red";
	var g = document.createElement("div");
	g.id = "green";
	var b = document.createElement("div");
	b.id = "blue";
	$([r, g, b]).slider({
		orientation: "horizontal",
		animate: 200,
		max: 255,
		min: 0,
		step: 1,
		value: 0
	});
	$(r).slider("value", player.brush.color.r);
	$(g).slider("value", player.brush.color.g);
	$(b).slider("value", player.brush.color.b);
	$([r, g, b]).slider("option", "change",
		function () {
			player.brush.color = new Color(
				$("#red").slider("value"),
				$("#green").slider("value"),
				$("#blue").slider("value"),
				player.brush.color.a
			);
			player.brush.initBrush();
			$(".active-color").attr("data-value",JSON.stringify(player.brush.color))
							  .css("background-color",player.brush.color.toRGB());
		}
	).slider("option", "slide",
		function () {
			$(".active-color").css("background-color","rgb("+$("#red").slider("value")+","+$("#green").slider("value")+","+$("#blue").slider("value")+")");
		}
	);
	var swatch = document.createElement("div");
	swatch.id = "swatch";
	swatch.className = "content noselect";
	var prim = document.createElement("div");
	prim.id = "primary";
	var sec = document.createElement("div");
	sec.id = "secondary";
	$(swatch).append(prim,sec);
	$(rgb).append(mode,r,g,b,swatch,insertSpacer());
	return rgb;
}

function setupBrushCtl() {
	var bctl = document.createElement("div");
	bctl.id = "brush";
	bctl.className = "panel noselect";
	var size = document.createElement("div");
	size.id = "size";
	var opac = document.createElement("div");
	opac.id = "opacity";
	var flow = document.createElement("div");
	flow.id = "flow";
	var hard = document.createElement("div");
	hard.id = "hardness";
	$(size).slider({
		orientation: "horizontal",
		animate: 200,
		max: 500,
		min: 1,
		step: 1,
		value: player.brush.diameter,
		slide: function () {
			$("#size-val").html($(this).slider("value") + "px");
		},
		change: function () {
			player.brush.setSize($(this).slider("value"), player.brush.hardness);
			player.brush.initBrush();
			$("#size-val").html(player.brush.diameter + "px");
		}
	});
	$(opac).slider({
		orientation: "horizontal",
		animate: 200,
		max: 100,
		min: 1,
		step: 1,
		value: 100,
		slide: function () {
			$("#opac-val").html($(this).slider("value") + "%");
		},
		change: function () {
			player.brush.opacity = $(this).slider("value")/100;
			//player.canvas.stroke.style.opacity = player.brush.opacity;
			$("#opac-val").html(Math.round(player.brush.opacity*100)+"%");
		}
	});
	$(flow).slider({
		orientation: "horizontal",
		animate: 200,
		max: 100,
		min: 1,
		step: 1,
		value: Math.round(player.brush.color.a*100),
		slide: function () {
			$("#flow-val").html($(this).slider("value") + "%");
		},
		change: function () {
			player.brush.color = new Color(
				player.brush.color.r,
				player.brush.color.g,
				player.brush.color.b,
				$(this).slider("value")/100
			);
			player.brush.initBrush();
			$("#flow-val").html(Math.round(player.brush.color.a*100) + "%");
		}
	});
	$(hard).slider({
		orientation: "horizontal",
		animate: 200,
		max: 100,
		min: 1,
		step: 1,
		value: player.brush.hardness,
		slide: function () {
			$("#hard-val").html($(this).slider("value") + "%");
		},
		change: function () {
			player.brush.setSize(player.brush.diameter, $(this).slider("value"));
			player.brush.initBrush();
			$("#hard-val").html(player.brush.hardness + "%");
		}
	});
	
	var sizeLabel = document.createElement("div");
	sizeLabel.className = "content noselect";
	var sizeVal = document.createElement("span");
	sizeVal.id = "size-val";
	sizeVal.style.position = "absolute";
	sizeVal.style.right = "0";
	sizeVal.innerHTML = player.brush.diameter + "px";
	var sizeCheck = createCheck({
		id: "size-dyn",
		dark: true,
		label: "Size",
		display: "inline-block"
	});
	$(sizeLabel).append(sizeCheck.div, sizeVal);
	
	var opacLabel = document.createElement("div");
	opacLabel.className = "content noselect";
	var opacVal = document.createElement("span");
	opacVal.id = "opac-val";
	opacVal.style.position = "absolute";
	opacVal.style.right = "0";
	opacVal.innerHTML = "100%";
	var opacCheck = document.createElement("div");
	opacCheck.className = "noselect";
	opacCheck.style.marginLeft = "24px";
	opacCheck.style.height = "18px";
	opacCheck.style.display = "inline-block";
	opacCheck.innerHTML = "Opacity";
	$(opacLabel).append(opacCheck, opacVal);
	
	var flowLabel = document.createElement("div");
	flowLabel.className = "content noselect";
	var flowVal = document.createElement("span");
	flowVal.id = "flow-val";
	flowVal.style.position = "absolute";
	flowVal.style.right = "0";
	flowVal.innerHTML = Math.round(player.brush.color.a*100) + "%";
	var flowCheck = createCheck({
		id: "flow-dyn",
		dark: true,
		label: "Flow",
		display: "inline-block"
	});
	$(flowLabel).append(flowCheck.div, flowVal);
	
	var hardLabel = document.createElement("div");
	hardLabel.className = "content noselect";
	var hardVal = document.createElement("span");
	hardVal.id = "hard-val";
	hardVal.style.position = "absolute";
	hardVal.style.right = "0";
	hardVal.innerHTML = player.brush.hardness + "%";
	var hardCheck = createCheck({
		id: "hard-dyn",
		dark: true,
		label: "Hard",
		display: "inline-block"
	});
	$(hardLabel).append(hardCheck.div, hardVal);
	
	$(bctl).append(sizeLabel,size)
		   .append(opacLabel,opac)
		   .append(flowLabel,flow)
		   .append(hardLabel,hard)
		   .append(insertSpacer());
	return bctl;
}

function setupLayersCtl() {
	var layers = document.createElement("div");
	layers.id = "layers";
	layers.className = "panel noselect";
	var layersTable = document.createElement("div");
	var ctl = document.createElement("div");
	ctl.id = "layer-controls";
	var visible = createCheck({
		id: "visible",
		dark: true,
		label: "Visible",
		display: "inline-block"
	});
	visible.check.onchange = function () {
		player.canvas.visible = (this.checked) ? true : false;
		glCanvas.setVisible(player.canvas.id, player.canvas.visible);
		if (ws) ws.send(JSON.stringify([room.channel, player.id, 'visible', player.canvas.id, player.canvas.visible]));
		/*if (this.checked) {
			$(player.canvas.canvas).removeClass("hidden",0);
		} else {
			$(player.canvas.canvas).addClass("hidden",0);
		}*/
	}
	visible.check.disabled = true;
	ctl.appendChild(visible.div);
	var listDiv = document.createElement("div");
	listDiv.id = "layer-list-wrapper";
	var rel = document.createElement("div");
	rel.style.position = "relative";
	rel.className = "fill";
	var abs = document.createElement("div");
	abs.className = "wrapper";
	var ul = document.createElement("ul");
	ul.className = "layer-list";
	for (var i = glCanvas.layerOrder.length-1; i >= 0; i--) {
		var li = document.createElement("li");
		var id = glCanvas.layerOrder[i];
		li.innerHTML = glCanvas.layerList[id].name+"<div class='layer-user small tip'>&nbsp;</div>";
		li.id = id;
		li.onclick = selectLayer;
		ul.appendChild(li);
	}
	abs.appendChild(ul);
	rel.appendChild(abs);
	listDiv.appendChild(rel);	// I'm so sorry
	$(layersTable).append(ctl,listDiv);
	$(layers).append(layersTable);
	$(abs).perfectScrollbar({
		minScrollbarLength: 20,
		bindContent: $(ul),
		extraClasses: "dark"
	});
	return layers;
}

function selectLayer() {
	if (glCanvas.layerList[this.id].u_id == 0) {
		if (ws) ws.send(JSON.stringify([room.channel, player.id, 'layer', room.id, parseInt(this.id), player.canvas ? player.canvas.id : null]));
	
		if (player.canvas) {
			//player.canvas.stroke.style.opacity = 1.0;
			player.canvas.u_id = 0;
			$("#"+player.canvas.id+">.layer-user").html("&nbsp;");
		} else {
			$("#paper").css("pointer-events","auto");
		}
		$("#layers ul.layer-list>li").removeClass("selected",0);
		
		$(this).addClass("selected",0);
		$(this).children(".layer-user").text(player.name);
		player.canvas = glCanvas.layerList[this.id];
		player.canvas.u_id = player.id;
		$("#visible").removeAttr("disabled")
					 .prop('checked',player.canvas.visible);
		//player.canvas.stroke.style.opacity = player.brush.opacity;
		
		
	} else return false;
}

function keyListener(e) {
	//e.preventDefault();
	if (mouseDown[MOUSE_LEFT]) return false;
	console.log(e.keyCode + " " + e.shiftKey);
	var key = e.keyCode;
	if (!e.ctrlKey) {
		switch (key) {
			case 90:	// z
				transformCanvas({dscale:(e.shiftKey ? -1 : 1)*ZOOM_STEP});
				break;
			case 82:	// r
				transformCanvas({drotate:(e.shiftKey ? -1 : 1)*ROTATE_STEP});
				break;
			case 37:	// left
				transformCanvas({dtrans:{x:(e.shiftKey ? -5 : -1)*TRANS_STEP, y:0}});
				break;
			case 38:	// up
				transformCanvas({dtrans:{x:0, y:(e.shiftKey ? -5 : -1)*TRANS_STEP}});
				break;
			case 39:	// right
				transformCanvas({dtrans:{x:(e.shiftKey ? 5 : 1)*TRANS_STEP, y:0}});
				break;
			case 40:	// down
				transformCanvas({dtrans:{x:0, y:(e.shiftKey ? 5 : 1)*TRANS_STEP}});
				break;
			case 72:	// h
				transformCanvas({flip:true});
				break;
			case 27:	// esc
				canvasProp = {
					scale: 1,
					rotate: 0,
					trans: {x:0, y:0},
					flip: false
				};
				transformCanvas({});
				break;
			case 66:	// b
				brushMode = 0;
				$("#swatch").css("opacity","1");
				break;
			case 69:	// e
				brushMode = 1;
				$("#swatch").css("opacity","0");
				break;
			case 88:	// x
				$("#primary,#secondary").toggleClass("active-color");
				var color = JSON.parse($(".active-color").attr("data-value"));
				color.a = player.brush.color.a;
				player.brush.color = color;
				player.brush.initBrush();
			case 77:	// m
				brushMode = 2;
				break;
			case 83:	// s
				brushMode = 3;
				break;
			case 79:	// o
				brushMode = 4;
				break;
		}
	} else {
		switch (key) {
			case 32:	// space
				if (e.shiftKey) benchmark(10000);
		}
	}
}

function mouseMoveHandler(e) {
	var c = getCanvasCoord(e);
	$("#coords").html("(" + c[0] + "," + c[1] + ")");
	if (mouseDown[MOUSE_LEFT]) {
		//interp.postMessage({"c": c, "spacing": player.brush.spacing});
	
		var cp = stroke[stroke.length-1];
		var dx = c[0] - cp[0];
		var dy = c[1] - cp[1];
		var a = (dx != 0) ? abs(Math.atan(dy/dx)) : Math.PI/2;
		var dr = sqrt(dx*dx+dy*dy);
		var rstep = player.brush.spacing;
		if (dx != 0) dx /= abs(dx);
		if (dy != 0) dy /= abs(dy);
		var cc;
		dx *= cos(a);
		dy *= sin(a);
		for (var r = rstep; r <= dr; r += rstep) {
			cc = [Math.round(cp[0] + dx*r),
				  Math.round(cp[1] + dy*r)];
			drawBrush(cc);
			stroke.push(cc);
		}
	
	}
}

function mouseDownHandler(e) {
	var c = getCanvasCoord(e);
	//console.log("mousedown " + e.button);
	mouseDown[e.button]++;
	//mouseMoveHandler(e);
	if (mouseDown[MOUSE_LEFT] && player.canvas.visible) {
		_start(player.canvas, brushMode, player.brush);
		drawBrush(c);
		stroke = new Array();
		stroke.push(c);
	}
}

function mouseUpHandler(e) {
	if (mouseDown[e.button]) {
		//console.log("mouseup " + e.button);
		mouseDown[e.button]--;
		//if (ws) ws.send(JSON.stringify([room.channel,player.id,'end']));
		_end(player.canvas, player.brush.opacity, brushMode);
		
		if (ws) {
			ws.send(JSON.stringify([room.channel,player.id,'stroke',
						player.brush.diameter,
						player.brush.color,
						player.brush.opacity,
						player.brush.hardness,
						player.canvas.id,
						brushMode,
						stroke]));
		}			
	}
}

function getCanvasCoord(e) {
	// In canvas space (visible canvas only)
	var o = $("#viewport > canvas").offset();
	var x = (e.clientX - o.left + $(document).scrollLeft())/canvasProp.scale;
	var y = (e.clientY - o.top + $(document).scrollTop()) /canvasProp.scale;
	
	var w = $("#viewport > canvas").innerWidth();
	var h = $("#viewport > canvas").innerHeight();
	var a = Number(rad(canvasProp.rotate).toFixed(3));
	
	var xm = (w*abs(cos(a)) + h*abs(sin(a))) / 2;
	var ym = (h*abs(cos(a)) + w*abs(sin(a))) / 2;
	
	if (canvasProp.flip) x = -x + 2*xm - 1;
	
	var xr = Math.floor((x-xm)*cos(a) - (y-ym)*sin(a) + w/2);
	var yr = Math.floor((x-xm)*sin(a) + (y-ym)*cos(a) + h/2);
	
	// if (xr < 0) xr = 0;
	// else if (xr >= w) xr = w - 1;
	// if (yr < 0) yr = 0;
	// else if (yr >= h) yr = h - 1;
	
	// if (canvasProp.flip) xr = w - xr - 1;
	
	return [xr, yr];
}

function drawBrush(c) {
	/*if (ws) {
		ws.send(JSON.stringify([room.channel,player.id,'brush',
					c]));
	}*/
	_brush(player.canvas, player.brush, c, brushMode);
}

function _start(canv, m, brush) {
	var d = brush.diameter;
	glCanvas.loadBrush(brush.stamp, d, d, canv.id); //should be order number
}

function _brush(canv, brush, c, m) {
	var r = brush.radius;
	var d = brush.diameter;
	var x = c[0]-r;
	var y = c[1]-r;
	glCanvas.drawBrush(x, y, d, d, canv.id, m);
}

function _end(canv, o, m) {
	
}

function _stroke(brush, layerId, m, path) {
	_start(glCanvas.layerList[layerId], m, brush);
	//glCanvas.layerList[layerId].stroke.style.opacity = brush.opacity;
	for (var i = 0, len = path.length; i < len; i++) {
		_brush(glCanvas.layerList[layerId], brush, path[i], m);
	}
	_end(glCanvas.layerList[layerId], brush.opacity, m);
}

function _layer(userId,name,layerId,prev) {
	if (prev != null) {
		$("#"+prev+">.layer-user").html("&nbsp;");
		glCanvas.layerList[prev].u_id = 0;
	}
	$("#"+layerId+">.layer-user").text(name);
	glCanvas.layerList[layerId].u_id = userId;
}

function transformCanvas(options) {
	// var prop = JSON.parse($("#viewport > canvas").attr("data-prop"));
	// console.log(JSON.stringify(canvasProp));
	var w = $("#viewport > canvas").innerWidth();
	var h = $("#viewport > canvas").innerHeight();
	
	if (options.flip) {
		//console.log("flip");
		canvasProp.flip = !canvasProp.flip;
	}
	
	if (canvasProp.flip) {
		if (options.drotate) options.drotate = -options.drotate;
		if (options.dtrans) options.dtrans = {x:-options.dtrans.x, y:options.dtrans.y};
	}
	
	if (options.dscale > 0 && canvasProp.scale < MAX_ZOOM ||
		options.dscale < 0 && canvasProp.scale > MIN_ZOOM) {
		canvasProp.scale += options.dscale;
	}
	if (options.drotate) canvasProp.rotate += options.drotate;
	if (canvasProp.rotate >= 180) canvasProp.rotate -= 360;
	else if (canvasProp.rotate <= -180) canvasProp.rotate += 360;
	
	if (options.dtrans) {
		if (options.dtrans.x > 0 && canvasProp.trans.x < w-TRANS_STEP ||
			options.dtrans.x < 0 && canvasProp.trans.x > -w+TRANS_STEP ||
			options.dtrans.y > 0 && canvasProp.trans.y < h-TRANS_STEP ||
			options.dtrans.y < 0 && canvasProp.trans.y > -h+TRANS_STEP) {
			canvasProp.trans.x += options.dtrans.x;
			canvasProp.trans.y += options.dtrans.y;
		}
	}
	
	var a =  (canvasProp.scale*cos(rad(canvasProp.rotate))).toFixed(3);
	var b =  (canvasProp.scale*sin(rad(canvasProp.rotate))).toFixed(3);
	var c =   canvasProp.trans.x;
	var d = (-canvasProp.scale*sin(rad(canvasProp.rotate))).toFixed(3);
	var e =  (canvasProp.scale*cos(rad(canvasProp.rotate))).toFixed(3);
	var f =   canvasProp.trans.y;
	
	// console.log("matrix("+a+","+d+","+b+","+e+","+c+","+f+")");
	$("#viewport > canvas").css("transform", "matrix("+a+","+d+","+b+","+e+","+c+","+f+")")
	$("#viewport").css("transform", "rotateY("+canvasProp.flip*180+"deg)");
	// console.log($("#viewport > canvas")[0].offsetWidth);
	// $("#viewport > canvas").attr("data-prop", JSON.stringify(prop));
	$("#zoom").html(canvasProp.scale*100 + "%");
	$("#rotation").html(Math.round(canvasProp.rotate) + "&deg;"); 
	$("#flipped").html(canvasProp.flip ? "Flipped" : "Normal");
}

function logout() {
	if (player.id < 0) {
		$.ajax({
			type: "POST",
			url: HTTP_URL+"/guestLogout",
			data: JSON.stringify({"g_id":-player.id}),
			async: false
		});
	} else if (player.id > 0) {
		$.ajax({
			type: "POST",
			url: HTTP_URL+"/userLogout",
			data: JSON.stringify({"u_id":player.id,"username":player.name}),
			async: false
		});
	}
	player = null;
}

function benchmark(n) {
	console.log("Requesting "+n+" strokes");
	ws.send(JSON.stringify([room.channel,player.id,'bench',n,
				player.brush.diameter,
				player.brush.color,
				player.brush.opacity,
				player.brush.hardness,
				player.canvas.id,
				brushMode,
				stroke]));
}