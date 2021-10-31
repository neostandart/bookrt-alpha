import { Helper, Markup } from "../../../../engine/service/aid/aid.js";
import * as UIBase from "../../../../engine/system/common/uibase.js";
import * as Modal from "../../../../engine/system/view/modal.js";
import * as Ctr from "../../../../engine/jet/control/control.js";
import { App } from "../../../../engine/system/runtime/app.js";
//

class ImageModal extends Modal.PopupModal {
	private _cfg: any;
	//

	/* Construction / Initialization / Desctruction
	----------------------------------------------------------*/

	constructor(page: UIBase.IBookPage, presenter: HTMLTemplateElement | HTMLElement, path: string, text: string) {
		super(presenter);
		//
		let hteImage = <HTMLImageElement>presenter.querySelector("#image");
		if (hteImage) {
			hteImage.src = path;
			//
			hteImage.addEventListener("click", () => {
				this._close(true);
			});
		}
		//
		if (text && text.trim().length > 0) {
			this.presenter.classList.add("hastext");
			let hteText = <HTMLElement>presenter.querySelector("#text");
			if (hteText) {
				hteText.innerHTML = text;
			}
		} else {
			this.presenter.classList.remove("hastext");
		}
	}


	/* Internal Members
	----------------------------------------------------------*/

	/** @override */
	protected async _onOpened(): Promise<void> {
		let rcPresn = this.presenter.getBoundingClientRect();
		let hteCaption = this.presenter.querySelector("figcaption") as HTMLElement;
		let hteImage = this.presenter.querySelector("#image") as HTMLElement;
		if (hteCaption && hteImage) {
			let nCaptionHeight = Markup.getAbsoluteHeight(hteCaption);
			let nImageMarginHeight = Markup.getMarginHeight(hteImage);
			let nWithoutImageHeight = nCaptionHeight + nImageMarginHeight;
			//
			let nImageMaxHeight = rcPresn.height - nWithoutImageHeight;
			hteImage.style.maxHeight = nImageMaxHeight + "px";
		}
	}

} // ImageModal

// =====================================================================

export class RibbonGallery extends Ctr.UIControl {
	/* Class Variables and Constants
	----------------------------------------------------------*/
	private _hteBackwardBtn?: HTMLElement;
	private _hteForwardBtn?: HTMLElement;

	private _hteModalPresenter?: HTMLElement;

	private _aImagesCfg: [] = [];
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
		if (Helper.isArray(initdata.images) && templset.templates.has("ImageFrame")) {
			this._aImagesCfg = initdata.images;
			let templImageFrame = templset.templates.get("ImageFrame") as HTMLTemplateElement;
			let hteCartridge = <HTMLElement>hteWorkArea.querySelector("#cartridge");
			//
			for (let i = 0; i < this._aImagesCfg.length; i++) {
				let imgcfg: any = this._aImagesCfg[i];
				let fragImageFrame = templImageFrame.content.cloneNode(true) as DocumentFragment;

				let hteImage = <HTMLImageElement>fragImageFrame.querySelector("#image");
				if (hteImage && imgcfg.path) {
					hteImage.src = this.page.book.resolveBookPath(<string>imgcfg.path, this.page);
					hteImage.dataset.cfgindex = i.toString();
					hteImage.addEventListener("click", this._onImageClick.bind(this));
				}

				let hteTextNest = <HTMLElement>fragImageFrame.querySelector(".text-nest");
				if (hteTextNest) {
					if (imgcfg.text) {
						let hteText = <HTMLElement>fragImageFrame.querySelector("#text");
						if (hteText) {
							hteText.innerHTML = <string>imgcfg.text;
						}
					} else {
						hteTextNest.style.display = "none";
					}
				}

				hteCartridge.appendChild(fragImageFrame);
			}

			//
			// Presenter for an enlarged modal image
			//
			if (templset.templates.has("ImageModal")) {
				let templImageModal = templset.templates.get("ImageModal") as HTMLTemplateElement;
				this._hteModalPresenter = App.doc.importNode(templImageModal.content, true).firstElementChild as HTMLElement;
			}
		}
		//
		await this._completeBuild({ style: templset.styles, workarea: hteWorkArea });
	}

	/** @override */
	protected _onPageStateChanged(sender: UIBase.IBookPage, args: UIBase.TNavableStateChangedArgs): void {
		super._onPageStateChanged(sender, args);
		//
		switch (args.stateNew) {
			case UIBase.NavableStates.Displayed: {
				break;
			}
		}
	}


	/* Event Handlers
	----------------------------------------------------------*/
	
	private _onImageClick(ev: Event): void {
		let hteImage = <HTMLElement>ev.target;
		if (hteImage) {
			let strCfgIndex = <string>hteImage.dataset.cfgindex;
			let nCfgIndex: number = parseInt(strCfgIndex, 0);
			let cfg: any = (<[]>this._aImagesCfg)[nCfgIndex];
			//
			let ctrModal = new ImageModal(this._page, <HTMLElement>this._hteModalPresenter, (<HTMLImageElement>hteImage).src, <string>cfg.text);
			this._page.showModal(ctrModal);
		}
	}

	private _onBackward(ev: Event): void {
		//
	}

	private _onForward(ev: Event): void {
		//
	}

} // RibbonImageGallery


