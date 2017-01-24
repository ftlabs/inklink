var express = require('express');

var https = require('https');
var formData = require('form-data');
var fs = require('fs');
var path = require('path');
var prompt = require('prompt');

var collectionUUID, collectionToken;

var keys = require('./keys');

//TODO: remove this temporary flag system to startup node
process.argv.forEach(function(val, index, array) {
	if(val === "new") {
		checkExistingCollection(true);
	} else if(val === "img") {
		//NOTE: test only
		addItemImage(keys.item_uuid);
	}
});

var app = express();

var server = app.listen(2017);
var io = require('socket.io').listen(server, { log : false });
app.use(express.static(path.resolve(__dirname + "/../public")));

checkExistingCollection(false);

app.get('/', function(req, res){
	res.sendFile(path.resolve(__dirname +'/../scan.html'));
});

app.get('/admin', function(req, res){
	res.sendFile(path.resolve(__dirname +'/../admin.html'));
});

io.on('connection', function(socket){
	socket.on('ready', function(data){
		socket.emit('setToken', {token: collectionToken});
	});

	socket.on('adminReady', function(data){
		socket.emit('ready');
	});

	socket.on('newCollection', function(data){
		console.log('newCollection received');
		// checkExistingCollection(true);
	});
});


function checkExistingCollection(isNew) {
	apiCall(setupCall('getCollection'), function(response) {
		var collectionExists = !!(JSON.parse(response).meta.total_count > 0);

        if(collectionExists) {
        	collectionUUID = JSON.parse(response).objects[0].uuid;

        	if(isNew) {
        		checkCollectionDate(JSON.parse(response).objects);
        	} else {
        		console.log(JSON.parse(response));
        		getCollectionToken();
        	}
        } else {
        	createCollection();
        }
	});
}

function checkCollectionDate(collections) {
	var collection_date = collections[0].name.split('-')[2];
	
	var today = new Date();
	var stamp = today.getFullYear().toString() + (today.getMonth() + 1).toString() + today.getDate().toString();

	prompt.start();

	var prompt_text = '';
	
	if(collection_date === stamp) {
		prompt_text = 'There already is a collection for today, do you want to start over? Y/N';
	} else {
		prompt_text = 'There is already an older collection, do you want to delete it? Y/N';
	}

	prompt.get([{
			name : 'prompt',
			description: prompt_text,
			required: true
		}], 
		function(err, results){
			if(results.prompt.toLowerCase() === 'y') {
				deleteCollection(collections[0].uuid, createCollection);
			} else {
				console.log('Wise decision. Bye!');
				return;
			}
	});
}

function createCollection() {
	apiCall(setupCall('setCollection'), function(response){
		var collection_uuid = JSON.parse(response).uuid;    
        keys.collection_uuid = collection_uuid;

        createNewItem();
        //TODO: create items if there are any queued
        //TODO: create a queue system for items/images in the GUI
	});
}

function deleteCollection(collectionID, callback) {
	console.log('collection to delete:', collectionID);

	apiCall(setupCall('deleteCollection', collectionID), function(response){
		console.log('collection deleted');
		callback();
	});
}

function getCollectionToken(){
	apiCall(setupCall('getCollectionToken'), function(response){
		collectionToken = JSON.parse(response).objects[0].token;
	});
};

function createNewItem(){
	console.log('createNewItem');

	apiCall(setupCall('setItem', keys.collection_uuid), function(response){
		var item_uuid = JSON.parse(response).uuid;
        console.log(item_uuid);

        addItemImage(item_uuid);
	});
}

function addItemImage(item_uuid) {
	apiCall(setupCall('setImage', item_uuid), function(response) {
		console.log('created Image');
	});
}

function setupCall(type, uuid) {
	var setup = {};
	var options = {
		host: 'my.craftar.net'
	};

	switch(type) {
		case 'getCollection':
			options.path = '/api/v0/collection/?api_key=' + keys.api_key;
			options.method = 'GET';
		break;

		case 'setCollection':
			var today = new Date();
			var stamp = today.getFullYear().toString() + (today.getMonth() + 1).toString() + today.getDate().toString();

			options.path = '/api/v0/collection/?api_key=' + keys.api_key;
			options.method = 'POST';

			var post_data = JSON.stringify({
				"name": "FT-UK-" + stamp
			});

			options.headers = {
				'Content-Type': 'application/json',
				'Content-Length': post_data.length
			};

			setup.post_data = post_data;
		break;

		case 'deleteCollection':
			options.path = '/api/v0/collection/'+ uuid +'/?api_key=' + keys.api_key;
			options.method = 'DELETE';
			options.headers = {
				'Content-Type': 'application/json'
			};
		break;

		case 'getCollectionToken':
			options.path = '/api/v0/token/?api_key=' + keys.api_key + '&collection_uuid=' + collectionUUID;
			options.method = 'GET';
		break;

		case 'setItem':
			options.path = '/api/v0/item/?api_key=' + keys.api_key;
			options.method = 'POST';

			//TODO: dynamic content for post data

			var post_data = JSON.stringify({
				"collection": "/api/v0/collection/" + keys.collection_uuid + "/",
				"name": "crossword",
				"url": "https://www.ft.com/"
			});

			options.headers = {
				'Content-Type': 'application/json',
				'Content-Length': post_data.length
			};

			setup.post_data = post_data;
		break;

		case 'setImage':
			options.path = '/api/v0/image/?api_key=' + keys.api_key;
			options.method = 'POST';

			var img_path = path.join(__dirname, '../assets/cw.png');

			var form = new formData();
			form.append("item", "/api/v0/item/" + uuid + "/");
			form.append("file", fs.createReadStream(img_path));

			options.headers = form.getHeaders();

			setup.form = form;
		break;
	}

	setup.options = options;
	return setup;
}

function apiCall(setup, callback){
	console.log(setup.options);
	
	var hreq = https.request(setup.options);

	if(setup.form)	setup.form.pipe(hreq);

	hreq.on('response', function (hres) {  
	    console.log('STATUS CODE: ' + hres.statusCode);
	    hres.setEncoding('utf8');

	    var response = '';

	    hres.on('data', function (chunk) {
	    	response += chunk;
	    });

	    hres.on('end', function(res) {
	    	callback(response);
	    });

	    hres.on('error', function (e) {
	        console.log('ERROR: ' + e.message);
	    }); 
	});

	if(setup.options.method === 'POST' && !setup.form)	hreq.write(setup.post_data);

	if(!setup.form) hreq.end();
}