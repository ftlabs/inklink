# inklink
Image recognition tool

##Setup
Create an account for [CraftAR](https://my.craftar.net/)
In `server/`, create `keys.js` and add your CraftAR `api_key` in the module.exports.
You might also want to add collection or item uuids manually, for testing purposes.

Run `npm install` to install dependencies

##Run
To create a collection, run `node server/server.js new` (Notice the `new` flag)
*Note: this is a command line process only at the moment but will evolve*

To run the server normally, remove the `new` flag.

##Scan
To scan your images, go to `http://localhost:2017/` while your node server is running.
*Note: You must have a collection with an image in it, and allow the camera*
*Note: To test it on your phone, go to `http://<your ip address>:2017` while on the same wireless network as the machine running the Node server. (There is a chance this might not work on Android, as getUserMedia needs to be under https except for localhost)*

Hit 'Start scanning' (or `Select an image` on iOS) whilst pointing at the desired image.