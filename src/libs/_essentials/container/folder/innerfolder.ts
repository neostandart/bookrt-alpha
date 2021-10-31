import { Helper, Markup } from "../../../../engine/service/aid/aid.js";
import * as UIBase from "../../../../engine/system/common/uibase.js";
import * as Ctr from "../../../../engine/jet/control/control.js";
//

export class InnerFolder extends Ctr.UIControl {
	/* Class Variables and Constants
	----------------------------------------------------------*/
	private _collapse: HTMLElement | null;
	private _presenters?: HTMLElement[];
	//

	/* Construction / Initialization / Desctruction
	----------------------------------------------------------*/

	constructor(libref: UIBase.IExtLibrary, page: UIBase.IBookPage, presenter: HTMLElement, options: Ctr.TControlOptions, startpoint?: UIBase.ControlStartPoints) {
		super(libref, page, presenter, options, startpoint);
		//
		this._collapse = null;
	}


	/* Internal Members
	----------------------------------------------------------*/
	
	protected async _onStartPoint(): Promise<any> {
		let templset: UIBase.TTemplateSet = await this._fetchTemplate();
		//
		let hteCaptionData = this.presenter.querySelector("#caption") as HTMLElement;
		let hteContentData = this.presenter.querySelector("#content") as HTMLElement;
		//
		let hteWorkArea = templset.elements.get("workarea") as HTMLElement;
		//
		if (hteCaptionData) {
			let hteCaption = hteWorkArea.querySelector("#caption");
			if (hteCaption) {
				hteCaption.innerHTML = hteCaptionData.innerHTML;
			}
		}
		//
		let hteFolderContent = hteWorkArea.querySelector("#content");

		if (hteContentData && hteFolderContent) {
			hteFolderContent.append(...Array.from(hteContentData.childNodes));
			this._presenters = Array.from(hteFolderContent.querySelectorAll("div[data-control]"));
		}
		//
		this._collapse = Markup.prepareBootstrapExpander(hteWorkArea, this.presenter.id,
			{
				onshow: (ev: Event) => {
					if (ev.target === this._collapse) {
						let htePointerImage = <HTMLElement>this._presenter.querySelector("#pointer");
						if (htePointerImage) {
							htePointerImage.classList.remove("anim-turn0-fast");
							htePointerImage.classList.add("anim-turn90-fast");
						}

						/*
							This variant works, but if the folder contains elements (controls) with 
							complex internal logic, then the smoothness disappears when it is opening.
							See the "onshown".
						*/
						// setTimeout(() => {
						// 	if (this._presenters) {
						// 		const eventResize = new Event("resize");
						// 		this._presenters.forEach((presenter) => {
						// 			presenter.dispatchEvent(eventResize);
						// 		});
						// 	}
						// }, 0);
					}
				},
				onshown: (ev: Event) => {
					if (ev.target === this._collapse) {
						this._presenter.classList.add("opened");
					}
					//
					if (this._presenters) {
						const eventResize = new Event("resize");
						this._presenters.forEach((presenter) => {
							presenter.dispatchEvent(eventResize);
						});
					}
				},
				onhide: (ev: Event) => {
					if (ev.target === this._collapse) {
						let htePointerImage = <HTMLElement>hteWorkArea.querySelector("#pointer");
						if (htePointerImage) {
							htePointerImage.classList.add("anim-turn0-fast");
							htePointerImage.classList.remove("anim-turn90-fast");
						}
					}
				},
				onhidden: (ev: Event) => {
					if (ev.target === this._collapse) {
						this._presenter.classList.remove("opened");
					}
				}
			} // TCollapseEventsArg
		);

		// Имеет ли пиктограмму (тип контента)
		let hteContentKind: HTMLElement | undefined;
		if (this._presenter.dataset.kind) {
			let cssClass: string | undefined;
			switch (<string>this._presenter.dataset.kind) {
				case "link": {
					cssClass = "fsym-link";
					break;
				}
				case "text": {
					cssClass = "fsym-page-text";
					break;
				}
			}
			//
			hteContentKind = templset.elements.get("contentkind");
			if (hteContentKind) {
				this._presenter.classList.add("hascontentkind");
				if (cssClass) {
					hteContentKind.classList.add(cssClass);
				}
			}
		}
		//
		this._presenter.classList.add("bk-folder");
		await this._completeBuild({ style: templset.styles, workarea: hteWorkArea, upper: (hteContentKind) ? [hteContentKind] : undefined });
	}

} // class InnerFolder

