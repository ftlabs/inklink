# inklink
Image recognition tool

##Setup
Create an account for [CraftAR](https://my.craftar.net/)
In `server/`, create `keys.js` and add your CraftAR `api_key` in the module.exports.
You might also want to add collection or item uuids manually, for testing purposes.

Run `npm install` to install dependencies

##Run
Run the node server `node server/server.js`

##Admin
Go to `http://localhost:2017/admin`.
You can then create a new collection (WARNING: this will delete any existing collection)
and/or add items to a collection.

To add items you must upload a ZIP file containing images in folders representing the items.
The folders should be names in the format `itemName*itemUrl`. The `*` is a mandatory separator between the 2, and the itemUrl should exclude `http://`.
Please note the only accepted image format for now is `.png`.

##Scan
To scan your images, go to `http://localhost:2017/` while your node server is running.
*Note: You must have a collection with an image in it, and allow the camera*
*Note: To test it on your phone, go to `http://<your ip address>:2017` while on the same wireless network as the machine running the Node server. (There is a chance this might not work on Android, as getUserMedia needs to be under https except for localhost)*

Hit 'Start scanning' (or `Select an image` on iOS) whilst pointing at the desired image.