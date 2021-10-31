import * as UIBase from "../../../../engine/system/common/uibase.js";
import * as Ctr from "../../../../engine/jet/control/control.js";
//

/*
	This Control is not implemented yet
*/

export class CloseButton extends Ctr.UIControl {
	/* Class Variables and Constants
	----------------------------------------------------------*/


	/* Construction / Initialization / Desctruction
	----------------------------------------------------------*/

	constructor(libref: UIBase.IExtLibrary, page: UIBase.IBookPage, presenter: HTMLElement, options: Ctr.TControlOptions, startpoint?: UIBase.ControlStartPoints) {
		super(libref, page, presenter, options, startpoint);
		//
	}


	/* Internal Members
	----------------------------------------------------------*/

	protected async _onStartPoint(): Promise<any> {
		let templset: UIBase.TTemplateSet = await this._fetchTemplate();
		//
		let hteWorkArea = templset.elements.get("workarea") as HTMLElement;
		await this._completeBuild({ style: templset.styles, workarea: hteWorkArea });
	}

} // class CloseButton
