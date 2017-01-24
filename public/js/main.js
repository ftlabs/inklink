function init() {
	console.log('hello');
	console.log(socket);

	socket.emit('newCollection');
}