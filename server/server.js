var express = require('express');
var siofu = require("socketio-file-upload");
var https = require('https');
var formData = require('form-data');
var fs = require('fs');
var path = require('path');
var unzip = require('unzip2');
var del = require('del');

var collectionUUID, collectionToken, extractPath;
var uploadCounter = 0;
var keys = require('./keys');


var app = express();

var server = app.use(siofu.router).listen(process.env.PORT || 2017);
var io = require('socket.io').listen(server, { log : false });
app.use(express.static(path.resolve(__dirname + "/../public")));

app.get('/', function(req, res){
	res.sendFile(path.resolve(__dirname +'/../scan.html'));
});

app.get('/admin', function(req, res){
	res.sendFile(path.resolve(__dirname +'/../admin.html'));

	fs.readdir(path.resolve(__dirname +'/../public/uploads'), function(err, data){
		if(err) {
			fs.mkdir(path.join(__dirname + '/../public/uploads'), function(){});
		}
	});
});

io.on('connection', function(socket){
	socket.on('ready', function(data){
		socket.emit('setToken', {token: collectionToken});
	});

	socket.on('adminReady', function(data){
		var uploader = new siofu();
	    uploader.dir = path.resolve(__dirname + "/../public/uploads");
	    uploader.listen(socket);


	    //TODO on start, delete contents of uploads folder
	    uploader.on("saved", function(data, callback){
	    	extractItems(data.file.name, function(data){
	    		--uploadCounter;
	    		socket.emit('notice', {text: data, done: (uploadCounter === 0)});

	    		if(uploadCounter === 0) {
	    			clearUploads();
	    		}
	    	});
	    });

		socket.emit('ready');
	});

	socket.on('newCollection', function(data){
		checkExistingCollection(true, function(response){
			socket.emit('prompt', {text: response});
		});
	});

	socket.on('deleteCollection', function(data){
		deleteCollection(collectionUUID, createCollection, function(data){
			socket.emit('notice', {text: data, done: true});
		});	
	});
});


function clearUploads() {
	del([path.join(__dirname + '/../public/uploads/')]).then(function(){
		fs.mkdir(path.join(__dirname + '/../public/uploads'), function(){});
	});
}

function checkExistingCollection(isNew, callback) {
	apiCall(setupCall('getCollection'), function(response) {
		var collectionExists = !!(JSON.parse(response).meta.total_count > 0);

        if(collectionExists) {
        	collectionUUID = JSON.parse(response).objects[0].uuid;

        	if(isNew) {
        		checkCollectionDate(JSON.parse(response).objects, callback);
        	} else {
        		getCollectionToken();
        	}
        } else {
        	createCollection();
        }
	});
}

function checkCollectionDate(collections, callback) {
	var collection_date = collections[0].name.split('-')[2];
	
	var today = new Date();
	var stamp = today.getFullYear().toString() + (today.getMonth() + 1).toString() + today.getDate().toString();

	var prompt_text = '';
	
	if(collection_date === stamp) {
		prompt_text = 'There already is a collection for today, do you want to start over?';
	} else {
		prompt_text = 'There is already an older collection, do you want to delete it?';
	}

	callback(prompt_text);
}

function createCollection(callback) {
	apiCall(setupCall('setCollection'), function(response){
		var collection_uuid = JSON.parse(response).uuid;    
        collectionUUID = collection_uuid;

        callback('new collection created ' + JSON.parse(response).name);
	});
}

function deleteCollection(collectionID, create, callback) {
	apiCall(setupCall('deleteCollection', collectionID), function(response){
		create(callback);
	});
}

function getCollectionToken(){
	apiCall(setupCall('getCollectionToken'), function(response){
		collectionToken = JSON.parse(response).objects[0].token;
	});
};

function extractItems(file, callback) {
	fs.createReadStream(path.join(__dirname + '/../public/uploads/' + file))
		.pipe(unzip.Extract({ path: path.join(__dirname + '/../public/uploads/extract')}))
		.on('close', function(){
			var folder = file.split('.zip')[0];
			extractPath = path.join(__dirname + '/../public/uploads/extract/' + folder + '/');

			fs.readdir(extractPath, function(err, dir){
				dir.forEach(function(i){
					var stats = fs.statSync(extractPath + '/' + i);
					if(stats.isDirectory()) {
						++uploadCounter;
						
						var item_data = {};
						item_data.name = i.split('*')[0];
						item_data.url = 'http://' + i.split('*')[1].split(':').join('/');

						createNewItem(item_data, callback);
					}
				});
			});
		});
}

function createNewItem(data, callback){
	apiCall(setupCall('setItem', collectionUUID, data), function(response){
		var item = {
			'name': JSON.parse(response).name,
			'uuid': JSON.parse(response).uuid
		};

		fs.readdir(extractPath, function(err, dir){
			dir.forEach(function(i){
				var dirPath = extractPath + i;
				var stats = fs.statSync(dirPath);
				if(stats.isDirectory() && i.split('*')[0] === item.name) {
					extractImages(dirPath, item, callback);
				}
			});
		});

		callback("Created new item with name " + item.name);
	});
}

function extractImages(dirPath, item, callback) {
	fs.readdir(dirPath, function(err, file){
		file.forEach(function(i){
			if(path.extname(i) === '.png') {
				var imgPath = dirPath + '/' + i;
				var image = {
					'path': imgPath,
					'item': item.name,
					'name': i
				};

				++uploadCounter;

				addItemImage(item, image, callback);
			}
		});
	});
}

function addItemImage(item, img, callback) {
	apiCall(setupCall('setImage', item.uuid, img.path), function(response) {
		var res = JSON.parse(response);

		if(res.error) {
			callback('ERROR for image ' + img.name + ' in item '+ item.name +' :: ' + res.error.message);
		} else {
			callback('Created image ' + res.name + ' for item ' + item.name);
		}
	});
}

function setupCall(type, uuid, data) {
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

			var data = data;
			data.collection = "/api/v0/collection/" + collectionUUID + "/";

			var post_data = JSON.stringify(data);
			options.headers = {
				'Content-Type': 'application/json',
				'Content-Length': post_data.length
			};

			setup.post_data = post_data;
		break;

		case 'setImage':
			options.path = '/api/v0/image/?api_key=' + keys.api_key;
			options.method = 'POST';

			var img_path = data;

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
	var hreq = https.request(setup.options);

	if(setup.form)	setup.form.pipe(hreq);

	hreq.on('response', function (hres) {  
	    // console.log('STATUS CODE: ' + hres.statusCode);
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


checkExistingCollection(false);