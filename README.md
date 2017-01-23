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