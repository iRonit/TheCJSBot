
//**************Admin Credentials for authentication**************//
var user = "jira-robot";
var pass = "ctijtapitsp0";
var restUrl = "https://cibu-jira.cisco.com:8443/rest/api/latest/issue/";

//****************************************************************//


var Flint = require('node-flint');
var webhook = require('node-flint/webhook');
var express = require('express');
var bodyParser = require('body-parser');
var app = express();
app.use(bodyParser.json());
const config = require("./config.json");

// init flint
var flint = new Flint(config);
flint.start();
console.log("Starting flint, please wait...");

flint.on("initialized", function() {
  console.log("Flint initialized successfully! [Press CTRL-C to quit]");
});


/****
## Process incoming messages
****/


//Build request
function build(p_method, p_dataString, p_restURL_ext) {
	let headers = {'Content-Type': 'application/json'};
	var options = {
		url: restUrl + p_restURL_ext,
		method: p_method,
		headers: headers,
		auth: {
			'user': user,
			'pass': pass
		}
	};
	if(p_dataString != null) {
		options.body = JSON.stringify(p_dataString);
	}	
	return options;
}

/* On mention with COMMENT
ex User enters @botname comment <jira-id> <comments>, the bot will comment to the jira with jira-id
*/
flint.hears( "/comment", function(bot, trigger) {
	console.log("%s: %s fired", trigger.args[0], trigger.args[1]);
	let request = require('request');
	var dataString = {
		"body": trigger.personDisplayName + " commented in the Spark Room <" + trigger.roomTitle + ">: "+ "\n" + trigger.args.slice(2).join(" ")
	};
	var options = build('POST', dataString, trigger.args[1] + '/comment');
	function callback(error, response, body) {
		if (!error && response.statusCode == 201) {
			console.log("Successfully Commented.");
			bot.say("Successfully Commented.");
		}
		else {
			console.log("Couldn't Comment.");
			bot.say("Couldn't Comment.");
		}
	}
	request(options, callback);
});


/* On mention with GET
ex User enters @botname get, the bot will fetch relevant details
*/
flint.hears( "/get", function(bot, trigger) {
	console.log("%s fired", trigger.args[0]);
	let request = require('request');
	switch(trigger.args[1]) {
		
		// Fetching Status
		case "status":
			console.log("with %s ", trigger.args[1]);
			var options = build('GET', null, trigger.args[2] + "?fields=status");
			function callback1(error, response, body) {
				if (!error && response.statusCode == 200) {
					console.log("----> Successful response");
					var info = JSON.parse(body);
					bot.say('Status of %s: %s', trigger.args[2], JSON.stringify(info.fields.status.name));
				}
				else {
					console.log("Couldn't get status.");
					bot.say("Couldn't get status.");
				}
			}
			request(options, callback1);
			break;
		
		case "duedate":
			console.log("with %s ", trigger.args[1]);
			var options = build('GET', null, trigger.args[2] + "?fields=duedate");
			function callback2(error, response, body) {
				if (!error && response.statusCode == 200) {
					console.log("----> Successful response");
					var info = JSON.parse(body);
					bot.say('Duedate of %s: %s', trigger.args[2], JSON.stringify(info.fields.duedate));
				}
				else {
					console.log("Couldn't get the due-date.");
					bot.say("Couldn't get the due-date.");
				}
			}
			request(options, callback2);
			break;
			
		default:
			console.log("Unidentified get command.");
			bot.say("Couldn't get what you mean.");
	}
});


/* On mention with CREATE
ex User enters @botname create, the bot will create a jira issue
*/
flint.hears( "/create", function(bot, trigger) {
	console.log("%s fired", trigger.args[0]);
	let request = require('request');
	var info = trigger.args.slice(1).join(" ");
	
	var dataString = new Object();
	dataString = 
	{
		"fields": 
		{
		   "customfield_11423": [{"id": "11492"}], //Required Information field
		   "reporter": {"name": trigger.personEmail.match(/[a-z]+@/).toString().replace('@','')}
		}
	};
	if(/--project/.test(info))
		dataString.fields.project = { "key": info.match(/--project "[^"]+"/i).toString().match(/"([^"]+)"/)[1].toString() };
	
	if(/--type/.test(info))
		dataString.fields.issuetype = { "name": info.match(/--type "[^"]+"/i).toString().match(/"([^"]+)"/)[1].toString() };

	if(/--summary/.test(info))
		dataString.fields.summary = info.match(/--summary "[^"]+"/i).toString().match(/"([^"]+)"/)[1].toString();

	if(/--components/.test(info))
		dataString.fields.components = [{"name": info.match(/--components "[^"]+"/i).toString().match(/"([^"]+)"/)[1].toString()}];

	if(/--priority/.test(info))
		dataString.fields.priority = { "name": info.match(/--priority "[^"]+"/i).toString().match(/"([^"]+)"/)[1].toString() };

	if(/--severity/.test(info))
		dataString.fields.customfield_10151 = { "value": info.match(/--severity "[^"]+"/i).toString().match(/"([^"]+)"/)[1].toString() };

	if(/--origination/.test(info))
		dataString.fields.customfield_10641 = { "value": info.match(/--origination "[^"]+"/i).toString().match(/"([^"]+)"/)[1].toString() };
	
	var options = build('POST', dataString, '');
	function callback(error, response, body) {
		if (response.statusCode == 201) {
			var info = JSON.parse(body);
			console.log("Successfully Created: " + JSON.stringify(info.key));
			bot.say("Successfully Created: " + JSON.stringify(info.key));
		}
		else {
			var info = JSON.parse(body);
			console.log("Couldn't Create: " + JSON.stringify(info.errors, null, "\t").slice(1,-1));
			bot.say("Couldn't Create: " + JSON.stringify(info.errors, null, "\t").slice(1,-1));
		}
	}
	request(options, callback);
});


/* On mention with command
ex User enters @botname /hello, the bot will write back
*/
flint.hears('/hello', function(bot, trigger) {
  console.log("/hello fired");
  bot.say('%s, you said hello to me!', trigger.personDisplayName);
});


/* On mention with command, using other trigger data, can use lite markdown formatting
ex "@botname /whoami"
*/
flint.hears('/whoami', function(bot, trigger) {
  console.log("/whoami fired");
  //the "trigger" parameter gives you access to data about the user who entered the command
  let roomId = "*" + trigger.roomId + "*";
  let roomTitle = "**" + trigger.roomTitle + "**";
  let personEmail = trigger.personEmail;
  let personDisplayName = trigger.personDisplayName;
  let outputString = `${personDisplayName} here is some of your information: \n\n\n **Room:** you are in "${roomTitle}" \n\n\n **Room id:** ${roomId} \n\n\n **Email:** your email on file is *${personEmail}*`;
  bot.say("markdown", outputString);
});


//////////////////////////////////TEST PURPOSE//////////////////////////////////////////////////////
flint.hears( "//meta", function(bot, trigger) {
	console.log("%s:  fired", trigger.args[0]);
  
	var request = require('request');
	var headers = {
		'Content-Type': 'application/json'
	};

	var options = {
		url: "https://cibu-jira.cisco.com:8443/rest/api/latest/issue/createmeta?projectKeys=SANDBOX&issuetypeNames=Bug&expand=projects.issuetypes.fields",
		method: 'GET',
		headers: headers,
		auth: {
			'user': user,
			'pass': pass
		}
	};
	function callback(error, response, body) {
		if (!error && response.statusCode == 200) {
			var info = JSON.parse(body);
			console.log(JSON.stringify(info.projects));
			bot.say("Successfully meta");
		}
		else
			console.log(JSON.stringify(body));
	}
	request(options, callback);
});
//////////////////////////////////////////////////////////////////////////////////////////////////////


/* On mention with HELP
ex "@botname help <specifics>"
*/
flint.hears("/help", function(bot, trigger) {
  console.log("help fired");
  var h_type = trigger.args[1];
  switch(h_type) {
	  default:
	  case "create":
		bot.say('markdown', "**Create:**");
		bot.say('markdown', "Definition: _Creates a JIRA issue with the provided information._");
		bot.say('markdown', "Syntax: **/create --\<FIELD\> \"\<VALUE\>\"**");
		bot.say("Mandatory Fields:");
		bot.say("1.\t --project : Project ID.");
		bot.say("2.\t --type : Type of Issue.");
		bot.say("3.\t --summary : Summary of the issue.");
		bot.say("4.\t --components : Component(s) associated with the issue.");
		bot.say("5.\t --priority : Priority of the issue.");
		bot.say("6.\t --severity : Severity of the issue.");
		bot.say("7.\t --origination : Source where the issue was reported from.");
		bot.say(" ");
		if(h_type != null) break;
		
	  case "comment":
		bot.say('markdown', "**Comment:**");
		bot.say('markdown', "Definition: _Posts a comment to the specific JIRA using the JIRA ID._");
		bot.say('markdown', "Syntax: **/comment \<JIRA-ID\> \<COMMENTS\>**");
		bot.say(" ");
		if(h_type != null) break;
		
	  case "get":
		bot.say('markdown', "**Get:**");
		bot.say('markdown', "Definition: _Fetches the values of the required field which is provided as input._");
		bot.say('markdown', "Syntax: **/get \<FIELD\> \<JIRA-ID\>**");
		bot.say("Available Fields:");
		bot.say("1.\t status : Status of the issue.");
		bot.say("2.\t duedate : Duedate of the issue.");
		bot.say(" ");
		if(h_type != null) break;
  }
});


/****
## Server config & housekeeping
****/

app.post('/', webhook(flint));

var server = app.listen(config.port, function () {
  flint.debug('Flint listening on port %s', config.port);
});

// gracefully shutdown (ctrl-c)
process.on('SIGINT', function() {
  flint.debug('stoppping...');
  server.close();
  flint.stop().then(function() {
    process.exit();
  });
});
