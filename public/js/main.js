function init() {

	var newCol = document.getElementById('NewCol');

	newCol.addEventListener('click', function(){
		socket.emit('newCollection');
	});

	var uploader = new SocketIOFileUpload(socket);
	uploader.listenOnInput(document.getElementById("CollectionItems"));	


	socket.on('prompt', function(data){
		var prompt = confirm(data.text);

		if (prompt == true) {
		   socket.emit('deleteCollection');
		} else {
		   console.log('Wise decision. Bye!');
		}
	});
}