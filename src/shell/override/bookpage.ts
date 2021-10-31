import { BookPage } from "../../engine/jet/page/bookpage.js";
import { App } from "../../engine/system/runtime/app.js";
//

export class NormalBookPage extends BookPage {

	/* Internal Members
	----------------------------------------------------------*/

	/** @override */
	protected async _getHeaderTemplate(): Promise<HTMLTemplateElement | null> {
		return await App.libman.shell.getTemplate("/templates/bookpage", "BookPageHeader");
	}

} // class NormalBookPage
