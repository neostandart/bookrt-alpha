import { App } from "../engine/system/runtime/app.js";
import { Exchange } from "./exchange/exchange.js";
import { AppView } from "./frame/appview.js";
//

//
// Retrieving initialization parameters
//

const urlparams = new URLSearchParams(window.location.search);
//
if (!urlparams.has("init")) {
	let objParams: any = {};

	if (urlparams.has("path") || urlparams.has("book")) {
		// The "path" parameter excludes the "book" parameter.
		if (urlparams.has("path")) {
			objParams.path = urlparams.get("path")?.trim();
		} else {
			objParams.book = urlparams.get("book")?.trim();
		}
	}

	if (urlparams.has("page")) {
		objParams.page = urlparams.get("page")?.trim();
	}

	if (urlparams.has("lang")) {
		objParams.lang = urlparams.get("lang")?.trim();
	}
	
	if (Object.keys(objParams).length > 0) {
		urlparams.set("init", window.btoa(JSON.stringify(objParams)));
	}

	// // ================================
	// // BGN for debugging
	// let objParams: any = {};
	// objParams.book = "a923881-01";
	// objParams.path = "book-01";
	// objParams.page = "238f7";
	// objParams.page = "238e8";
	// //
	// urlparams.set("init", window.btoa(JSON.stringify(objParams)));
	// // END for debugging
	// // ================================

} // if (!urlparams.has("init"))


//
// Extracting initialization parameters and System launch
//
const encodedData: string | null = urlparams.get("init");
if (encodedData) {
	const decodedData = window.atob(encodedData);
	let objInitParams = JSON.parse(decodedData);
	//
	/*
		Expected parameters (example):

		cmid: 22 // Course Module ID
		uid: 1 // User ID
		agent: "../vmbagent.php" // Interaction with the Moodle plugin

		lang: "ru" // Force UI language
		storage: "_storage" // Path of the Book Storage folder

		path: "book-01" // The folder of the Start Book
			or
		book: a923881-01 // Start Book ID

		page: 238e8 // Start Page
	*/

	App.launch(new Exchange(), new AppView(), objInitParams, window);
} else {
	App.launch(new Exchange(), new AppView(), {}, window);
}

