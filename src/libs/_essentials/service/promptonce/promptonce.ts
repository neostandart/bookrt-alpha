import * as UIBase from "../../../../engine/system/common/uibase.js";
import * as Ctr from "../../../../engine/jet/control/control.js";
//

export class PromptOnce extends Ctr.UIControl {
	/* Class Variables and Constants
	----------------------------------------------------------*/
	private _nAutoHide: number = 0;
	private _bOpened: boolean = false;
	//

	/* Construction / Initialization / Desctruction
	----------------------------------------------------------*/

	constructor(libref: UIBase.IExtLibrary, page: UIBase.IBookPage, presenter: HTMLElement, options: Ctr.TControlOptions, startpoint?: UIBase.ControlStartPoints) {
		super(libref, page, presenter, options, startpoint);
		//
	}


	/* Internal Members
	----------------------------------------------------------*/

	protected async _onStartPoint(): Promise<any> {
		let initdata = await this._fetchInitData();
		let templset: UIBase.TTemplateSet = await this._fetchTemplate();
		//
		let hteWorkArea = templset.elements.get("workarea") as HTMLElement;
		//
		let strLocalId = this._getPersistentId();
		let val = sessionStorage.getItem(strLocalId);
		if (!val) {
			sessionStorage.setItem(strLocalId, "done");
			//
			if (initdata.autohide) {
				this._nAutoHide = parseInt(initdata.autohide, 10);
				if (Number.isNaN(this._nAutoHide)) {
					this._nAutoHide = 5000;
				}
			}
			//
			let hteCloseBtn = hteWorkArea.querySelector("#close_btn") as HTMLElement;
			if (hteCloseBtn) {
				hteCloseBtn.addEventListener("click", (ev) => {
					this._close();
				});
			}
			//
			let hteContent = this._presenter.querySelector("#content");
			if (hteContent) {
				this._presenter.removeChild(hteContent);
				hteContent.classList.add("border", "border-info", "promptonce-border");
				//
				let hteCaption = this._presenter.querySelector("#caption");
				if (hteCaption) {
					this._presenter.removeChild(hteCaption);
					hteCaption.classList.add("text-info");
					hteContent.prepend(hteCaption);
				}
				//
				hteWorkArea.appendChild(hteContent);
			}
			//
			this._presenter.innerHTML = "";
			//
			this._presenter.classList.add("actual");
			await this._completeBuild({ style: templset.styles, workarea: hteWorkArea });
			//
			setTimeout(() => {
				this._presenter.classList.add("opened");
				this._bOpened = true;
				//
				if (this._nAutoHide > 0) {
					setTimeout(() => {
						if (this._bOpened) {
							this._close();
						}
					}, this._nAutoHide);
				}
			}, 2000);
		} else {
			await this._completeBuild({ style: templset.styles, workarea: hteWorkArea });
		}
	}

	private _close(): void {
		this._presenter.classList.remove("opened");
		this._bOpened = false;
		//
		setTimeout(() => {
			this._presenter.classList.remove("actual");
		}, 1000);
	}

} // class PromptOnce

