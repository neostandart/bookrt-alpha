import { Helper } from "../../../engine/service/aid/aid.js";
import * as Modal from "../../../engine/system/view/modal.js";
import { App } from "../../../engine/system/runtime/app.js";
//

export class BookCloseDlg extends Modal.DialogBox {
	// Class Variables and Constants
	// -------------------------------------------------------------------

	
	// Construction / Initialization / Destruction
	// -------------------------------------------------------------------

	constructor() {
		super(Modal.DialogKinds.YesNo);
		//
		this._icontype = Modal.DialogIconTypes.Question;
	}

	
	// Internal Members
	// -------------------------------------------------------------------

	/** @override */
	protected async _buildContent(hteCaptionSlot: HTMLElement, hteContentSlot: HTMLElement): Promise<any> {
		this.presenter.classList.add(Helper.getObjectName(this).toLowerCase());
		//
		let templ = await App.libman.shell.getTemplate("/templates/bookclose", Helper.getObjectName(this));
		if (templ) {
			let frag = templ.content.cloneNode(true) as DocumentFragment;
			if (frag) {
				await App.strings.processScope(frag);
				//
				let hteCaption = frag.getElementById("caption");
				if (hteCaption) {
					hteCaptionSlot.appendChild(hteCaption);
				}
				//
				let hteContent = frag.getElementById("content");
				if (hteContent) {
					hteContentSlot.appendChild(hteContent);
				}
			} // if (frag)
		}
	}

	/** @override */
	protected async _invokeAccept(): Promise<boolean> {
		return true;
	}

} //  class BookCloseDlg


