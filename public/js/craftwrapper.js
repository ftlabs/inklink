var finderResults = false;
var scanButton, cloudRecognition;

function initDetection(token) {
	scanButton = document.getElementById( 'scan' );

	cloudRecognition =  new craftar.CloudRecognition({
        token: token
    });

    if ( craftar.supportsCapture() ){

        setupCapture(function( err, captureObject ){
			if ( err ){
                // Capture setup failed (user rejected to open the camera)
                // switch to selector mode
                switchToSelector();
            }else{

                var captureDivElement = document.getElementById( 'videoCapture' );
                captureDivElement.appendChild( captureObject.domElement );

                setCaptureResultsListener();
                
                scanButton.addEventListener( 'click', function(){
                    finderResults = false;
                    cloudRecognition.startFinder( captureObject, 2000, 3);
                });
            }

        });

    } else if( craftar.supportsImageSelector() ){
        // Capture not supported, switch to selector mode
        switchToSelector();
    }else{
        alert("This browser doesn't support HTML5 features needed for CraftAR HTML5 Library");
    }
}

function switchToSelector() {
    var fakeSelector = document.getElementById('fakeSelector');
    var selectorElement = document.getElementById('selectorElement');

    scanButton.setAttribute("class", "hidden");
    fakeSelector.classList.remove("hidden");

    fakeSelector.addEventListener('click', function(e){
        e.preventDefault();
        selectorElement.click();
    });

    var selector = new craftar.ImageSelector(selectorElement);
    selector.addListener('image', function(craftarImage) {
        cloudRecognition.search(craftarImage);
    });

    setSelectorResultsListener();
}

function setSelectorResultsListener() {
    cloudRecognition.addListener('results', function(error, results, xhr) {

        if (results.results && results.results.length > 0) {
            renderResults( results );
        } else {
            alert("No results found, select an image that contains an object to scan.");
        }
    });
}

function setCaptureResultsListener() {
    cloudRecognition.addListener('results', function(err, results, xhr){

        if (results.results && results.results.length > 0) {
            finderResults = true;
            renderResults( results );
            cloudRecognition.stopFinder();
        }
    });

    cloudRecognition.addListener('finderFinished', function(){
        if (!finderResults) {
            alert("No results found, point to an object.");
        }
    });
}

function renderResults( results ){
    var resultItem = results.results[0];

    var resultEl = document.createElement('a');

    resultEl.setAttribute('href', resultItem.item.url);
    resultEl.setAttribute('target', '_self');
    resultEl.click();
}


function setupCapture( callback ){
    var capture = new craftar.Capture();

    capture.addListener('started', function(){
        callback( null, capture );

    });

    capture.addListener('error', function( error ){
        callback( error, capture );

    });

    capture.start();
}