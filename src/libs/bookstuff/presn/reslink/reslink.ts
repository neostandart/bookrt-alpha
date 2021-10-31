import { Helper, Markup } from "../../../../engine/service/aid/aid.js";
import * as UIBase from "../../../../engine/system/common/uibase.js";
import * as Ctr from "../../../../engine/jet/control/control.js";
import { App } from "../../../../engine/system/runtime/app.js";
//

export class ResourceLink extends Ctr.UIControl {
	/* Class Variables and Constants
	----------------------------------------------------------*/


	/* Construction / Initialization / Desctruction
	----------------------------------------------------------*/
	
	constructor(libref: UIBase.IExtLibrary, page: UIBase.IBookPage, presenter: HTMLElement, options: Ctr.TControlOptions, startpoint?: UIBase.ControlStartPoints) {
		super(libref, page, presenter, options, startpoint);

	}

	protected async _onStartPoint(): Promise<any> {
		let templset: UIBase.TTemplateSet = await this._fetchTemplate();
		//
		let hteWorkArea = templset.elements.get("workarea");
		if (hteWorkArea) {
			let anchor = (Markup.isHtmlAnchor(hteWorkArea)) ? <HTMLAnchorElement>hteWorkArea : hteWorkArea.querySelector("a") as HTMLAnchorElement;
			if (anchor) {
				anchor.target = "_blank";
				let strRef = this._presenter.innerHTML.trim();
				if (Helper.startsWith(strRef, "http")) {
					anchor.href = strRef;
				} else {
					anchor.href = this._page.book.resolveBookPath(strRef, this._page);
				}
			}
			//
			let hteImage = hteWorkArea.querySelector("#image") as HTMLImageElement;
			if (hteImage) {
				if (this._presenter.dataset.kind) {
					switch (this._presenter.dataset.kind) {
						case "pdf": {
							/* Можно так 
							hteImage.src = this._libref.resolveResourceRef("./images/pdf-kind.svg", this);
							*/
							hteImage.src = App.tube.combinePath(this.resroot, "images/pdf-kind.svg");
							break;
						}
						case "pptx": {
							hteImage.src = App.tube.combinePath(this.resroot, "images/pptx-kind.svg");
							break;
						}
						case "ppsx": {
							hteImage.src = App.tube.combinePath(this.resroot, "images/ppsx-kind.svg");
							break;
						}
						case "msword": {
							hteImage.src = App.tube.combinePath(this.resroot, "images/msword-kind.svg");
							break;
						}
						case "docx": {
							hteImage.src = App.tube.combinePath(this.resroot, "images/docx-kind.svg");
							break;
						}
					}
				} else {
					hteImage.src = App.tube.combinePath(this.resroot, "images/link.svg");
				}
			}
			//
			let hteText = hteWorkArea.querySelector("#text") as HTMLElement;
			if (hteText && this._presenter.dataset.text) {
				hteText.innerHTML = this._presenter.dataset.text;
			}
		}
		//
		await this._completeBuild({ style: templset.styles, workarea: hteWorkArea });
	}

} // class ResLink
