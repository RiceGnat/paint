function appendError(selector, message) {
	var error = document.createElement("div");
	error.id = "error";
	error.className = "content noselect";
	error.innerHTML = message;
	$("#error").remove();
	$(selector).append(error);
	fadeInto("#error");
}

function errorCode(error) {
	var retval = false;
	switch (error) {
		case 0:
			retval = true; break;
		case 1:
			appendError("#login", "What's your username?");
			$("#name").focus(); break;
		case 2:
			appendError("#login", "That's not a valid username");
			$("#name").focus(); break;
		case 3:
			appendError("#login", "Your password can't be blank");
			$("#password").focus(); break;
		case 4:
			appendError("#login", "You can't have a blank name");
			$("#name").focus(); break;
		case 5:
			appendError("#login", "Alphanumeric names only");
			$("#name").focus(); break;
	    case 6:	// Communication error
	        appendError("#login", "Couldn't contact the server");
	        break;
        case 7: // Database error
            appendError("#login", "Something went wrong");
            break;
        case 8: // Bad input (bypassed client-side checks)
            appendError("#login", "That shouldn't have happened...");
            break;
        case 9: // Invalid credentials
	        appendError("#login", "Couldn't authorize you");
	        break;
        case 10:
            appendError("#login", "Something's wrong with your password");
            $("#password").focus(); break;
		case 100:
			appendError("#setup-space", "Your room needs a name");
			$("#room-name").focus(); break;
		case 101:
			appendError("#setup-space", "There are strange characters in your room name");
			$("#room-name").focus(); break;
		case 102:
			appendError("#setup-space", "Canvas width should be a positive integer");
			$("#canvas-width").focus(); break;
		case 103:
			appendError("#setup-space", "Canvas height should be a positive integer");
			$("#canvas-height").focus(); break;
		case 104:
			appendError("#setup-space", "Layer count should be a positive integer");
			$("#layer-count").focus(); break;
		case 105:
			appendError("#setup-space", "You can't have a width of 0");
			$("#canvas-width").focus(); break;
		case 106:
			appendError("#setup-space", "You can't have a height of 0");
			$("#canvas-height").focus(); break;
		case 107:
			appendError("#setup-space", "You need at least one layer");
			$("#layer-count").focus(); break;
		case 108:
			appendError("#setup-space", "Your canvas can't be wider than "+CANVAS_MAX_WIDTH+" pixels");
			$("#canvas-width").focus(); break;
		case 109:
			appendError("#setup-space", "Your canvas can't be taller than "+CANVAS_MAX_HEIGHT+" pixels");
			$("#canvas-height").focus(); break;
		case 110:
			appendError("#setup-space", "You can have up to "+MAX_LAYER_COUNT+" layers");
			$("#layer-count").focus(); break;
        case 111:
            appendError("#setup-space", "Something's wrong with that password");
            $("#room-password").focus(); break;
		case 112:
			appendError("#setup-space", "User count should be a positive integer");
			$("#max-users").focus(); break;
		case 113:
			appendError("#setup-space", "You need at least one user");
			$("#max-users").focus(); break;
		case 114:
			appendError("#setup-space", "Rooms can't hold more than "+MAX_MAX_USERS+" users");
			$("#max-users").focus(); break;
	    case 115:	// Communication error
	        appendError("#setup-space", "The WebSocket connection failed");
	        break;
	    case 116:	// Communication error
	        appendError("#setup-space", "Couldn't contact the server");
	        break;
        case 117: // Database error
            appendError("#setup-space", "Something went wrong");
            break;
        case 118: // Bad input (bypassed client-side checks)
            appendError("#setup-space", "That shouldn't have happened...");
            break;
        case 211:
            appendError("#find-room-buttons", "Something's wrong with that password");
            $("#find-room-password").focus(); break;
	    case 215:	// Communication error
	        appendError("#find-room-buttons", "The WebSocket connection failed");
	        break;
	    case 216:	// Communication error
	        appendError("#find-room-buttons", "Couldn't contact the server");
	        break;
        case 217: // Database error
            appendError("#find-room-buttons", "Something went wrong");
            break;
        case 218: // Bad input (bypassed client-side checks)
            appendError("#find-room-buttons", "That shouldn't have happened...");
            break;
		case 219:
			appendError("#find-room-buttons", "Your password doesn't match");
			$("find-room-password").focus(); break;
		default:
			console.log("Unexpected error");
	}
	return retval;
}