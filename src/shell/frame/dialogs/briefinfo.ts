import { Helper } from "../../../engine/service/aid/aid.js";
import * as Modal from "./../../../engine/system/view/modal.js";
import { App } from "../../../engine/system/runtime/app.js";
//

export class AppBriefInfoDlg extends Modal.DialogBox {
	// Class Variables and Constants
	// -------------------------------------------------------------------


	// Construction / Initialization / Destruction
	// -------------------------------------------------------------------

	constructor() {
		super(Modal.DialogKinds.SaveClose);
	}


	// Internal Members
	// -------------------------------------------------------------------

	/** @override */
	protected async _buildContent(hteCaptionSlot: HTMLElement, hteContentSlot: HTMLElement): Promise<any> {
		this.presenter.classList.add(Helper.getObjectName(this).toLowerCase());
		//
		let templ = await App.libman.shell.getTemplate("/templates/briefinfo", Helper.getObjectName(this));
		if (templ) {
			let frag = templ.content.cloneNode(true) as DocumentFragment;
			if (frag) {
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
		} // if (templ)
	}

	/** @override */
	protected async _invokeSave(): Promise<boolean> {
		return false;
	}


	/* Event Handlers
	----------------------------------------------------------*/



} // class AppSettingsDlg

