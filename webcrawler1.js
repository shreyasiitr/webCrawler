var net = require('net');

//Map to store the crawled links
var linksMap = {};
//Map to store the secret flags
var secretFlagMap = {};
//Counter to count the secret flags
var count = 0;

var lock = 0;

var csrftoken = "";

var sessionid = "";
//Array to store the links that are yet to be crawled
var linkArray = [];

var username = process.argv[2].toString();

var password = process.argv[3].toString();

var createSocket = function(host, port){

	//Creation of socket

	var client = net.createConnection(port, host);

	return client;

}

var mainFunc = function(){

	var sock = createSocket("elsrv2.cs.umass.edu", 80);

	var dataString = "";

	var link = "";

	//Event fired when socket connection is established

	sock.on('connect', function(data) {

		var link = "";
		//If link is already crawled then remove from the link array
		if(linkArray.length>0){

			while(linkArray.length>0 && linksMap[linkArray[0]]==1 ){

				linkArray.shift();

			}

		}

		if(linkArray.length==0){

			linkArray.push("/fakebook/");

		}

		link = linkArray[0];
		//GET request for new page to traverse
		sock.write("GET " +link+ " HTTP/1.0\r\nCookie: csrftoken="+csrftoken+";sessionid="+sessionid+"\r\nContent-Length: 0\r\n\r\n");
	
	});

	//Event fired when server sends back response to the client request

	sock.on('data', function(data) {

		var check = 0;

		dataString = data.toString();

		if(dataString.indexOf("HTTP/1.0 200")!=-1||dataString.indexOf("HTTP/1.0 403")!=-1
			||dataString.indexOf("HTTP/1.0 404")!=-1||dataString.indexOf("HTTP/1.0 301")!=-1){

			check = 1;

		}
		//If secret flag is found then add to the secret flag map and increment the count
		if(dataString.indexOf('secret_flag')!=-1){

			var tempSecret = dataString.indexOf('secret_flag');

			var temp2 = tempSecret;

			while(dataString[temp2]!='>'){

				temp2++;

			}

			temp2++;

			var secret = dataString.substr(temp2, 70);

			if(!secretFlagMap[secret]){

				secretFlagMap[secret] = 1;

				console.log(secret.substr(6,64));

				count++;

			}
			
		}

		var start = 0;
		//Capturing all the links mentioned in the page
		while(dataString.indexOf('<a href=', start)!=-1){

			var temp = dataString.indexOf('<a href=', start);

			var tempLink = "";

			for (var i = temp+9; i<dataString.length && dataString[i] != '"'; i++) {
				
				tempLink += dataString[i];

			}

			if(tempLink.indexOf('fakebook')!=-1 && !linksMap[tempLink]){

				linkArray.push(tempLink);

			}

			start = temp + 9;

		}

		if(check){

			linksMap[linkArray[0]] = 1;

			linkArray.shift();

		}

		if(count<5){

			return mainFunc();

		}

		else{

			// if(lock==0){

			// 	Object.keys(secretFlagMap).forEach(function(key,index) {

			// 		console.log(key.toString().substr(6,64));
					
			// 	});

			// 	lock = 1;

			// }

			return;

		}
		
	});

	sock.on('error', function() {

		if(count==5){

			return;
		}
		else{
			return mainFunc();
		}

	});

	sock.on('end', function() {

		// if(lock==1){

		// 	return;

		// }

		return;

	});

}

var loginFunc = function(callback){

	var returnCheckPost = 0;

	var sock = createSocket("elsrv2.cs.umass.edu", 80);

	var dataString = "";

	sock.on('connect', function(data) {
		//POST request for login to the site using username password and csrftoken received from earlier GET request
		sock.write("POST /accounts/login/ HTTP/1.0\r\nHost:elsrv2.cs.umass.edu\r\nContent-Type: application/x-www-form-urlencoded\r\n"
					+"Cookie: csrftoken="+csrftoken+"\r\nContent-Length: 105\r\n"
					+"Accept: text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8\r\n\r\n"
					+"username="+username+"&password="+password+"&csrfmiddlewaretoken="+csrftoken+"&next=/fakebook/\r\n");
		
	});

	sock.on('data', function(data) {

		dataString = data.toString();

		if(dataString.indexOf("HTTP/1.0 403")!=-1){

			returnCheckPost = 1;

		}

		var start = 0;

		start = dataString.indexOf('sessionid');

		sessionid = dataString.substr(start+10, 32);
		
	});

	sock.on('end', function() {
		//If 403 response then try again
		if(returnCheckPost){

			return actual();

		}
		else{

			return callback();
		}

	});

	sock.on('error', function() {
		
		return;

	});

}

var getLoginFunc = function(callback){

	var returnCheckGet = 0;

	var sock = createSocket("elsrv2.cs.umass.edu", 80);

	var dataString = "";

	sock.on('connect', function(data) {
		//Initial request for login page of the site
		sock.write("GET /accounts/login/ HTTP/1.0\r\nHost:elsrv2.cs.umass.edu\r\nContent-Type: application/x-www-form-urlencoded\r\n"
					+"Content-Length: 105\r\n"
					+"Accept: text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8\r\n\r\n");
		
	});

	sock.on('data', function(data) {

		dataString = data.toString();

		if(dataString.indexOf("HTTP/1.0 403")!=-1){

			returnCheckGet = 1;

		}

		var start = 0;
		//Storing csrftoken as cookie
		start = dataString.indexOf('csrfmiddlewaretoken');

		csrftoken = dataString.substr(start+28, 32);
		
	});

	sock.on('end', function() {
		//If 403 response then try again
		if(returnCheckGet){

			return actual();

		}
		else{

			return callback();
		}

	});

	sock.on('error', function() {
		
		return ;

	});

}

var actual = function(){

	getLoginFunc(function(){

		loginFunc(function(){

			return mainFunc();

		});

	});
}

return actual();


