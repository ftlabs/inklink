function init() {
	var newCol = document.getElementById('NewCol');
	var itemCta = document.getElementById('AddItem');
	var ctaContainer = document.querySelector('.admin-cta');
	var itemUpload = document.getElementById("CollectionItems");
	var loader = document.querySelector('.loader');

	newCol.addEventListener('click', function(){
		socket.emit('newCollection');
		ctaContainer.classList.add('hidden');
		loader.classList.remove('hidden');
	});

	itemCta.addEventListener('click', function(){
		itemUpload.click();
	});

	var uploader = new SocketIOFileUpload(socket);
	uploader.listenOnInput(itemUpload);
	uploader.addEventListener("complete", function(event){
		ctaContainer.classList.add('hidden');
		loader.classList.remove('hidden');
	});

	socket.on('prompt', function(data){
		var prompt = confirm(data.text);

		if (prompt == true) {
		   socket.emit('deleteCollection');
		} else {
		   ctaContainer.classList.remove('hidden');
		   loader.classList.add('hidden');
		}
	});

	socket.on('notice', function(data){
		var output = document.querySelector('.output');
		var notice = document.createElement('p');
		notice.textContent = data.text;
		output.insertBefore(notice, output.firstChild);

		if(!!data.done) {
			ctaContainer.classList.remove('hidden');
			loader.classList.add('hidden');
			
			var done = document.createElement('p');
			done.textContent = '===DONE===';
			output.insertBefore(done, output.firstChild);
		}
	});
}