import { Markup } from "../../../engine/service/aid/aid.js";
import * as UIBase from "../../../engine/system/common/uibase.js";
import { PackHtm } from "../../../engine/service/packhtm/packhtm.js";
import * as Ctr from "../../../engine/jet/control/control.js";
import { App } from "../../../engine/system/runtime/app.js";
//

export class PersonCard extends Ctr.UIControl {
	/* Class Variables and Constants
	----------------------------------------------------------*/


	/* Construction / Initialization / Desctruction
	----------------------------------------------------------*/

	constructor(libref: UIBase.IExtLibrary, page: UIBase.IBookPage, presenter: HTMLElement, options: Ctr.TControlOptions, initdata: any) {
		super(libref, page, presenter, options, UIBase.ControlStartPoints.Manual);
		//
		this._initdata = initdata;
	}


	/* Internal Members
	----------------------------------------------------------*/

	protected async _onStartPoint(): Promise<any> {
		let initdata = await this._fetchInitData();
		let templset: UIBase.TTemplateSet = await this._fetchTemplate();
		//
		let hteWorkArea = templset.elements.get("workarea") as HTMLElement;
		//
		Markup.prepareBootstrapExpander(hteWorkArea, this.presenter.id,
			{
				onshow: (ev: Event) => {
					let htePointerImage = <HTMLElement>this._presenter.querySelector("#collapsepointer");
					if (htePointerImage) {
						htePointerImage.classList.remove("anim-turn0-fast");
						htePointerImage.classList.add("anim-turn90-fast");
					}
				},
				onshown: (ev: Event) => {
					this._presenter.classList.add("opened");
				},
				onhide: (ev: Event) => {
					let htePointerImage = <HTMLElement>hteWorkArea.querySelector("#collapsepointer");
					if (htePointerImage) {
						htePointerImage.classList.add("anim-turn0-fast");
						htePointerImage.classList.remove("anim-turn90-fast");
					}
				},
				onhidden: (ev: Event) => {
					this._presenter.classList.remove("opened");
				}
			} // TCollapseEventsArg			
		);

		//
		// Main data of the Person's Card
		//
		let hteImage: HTMLImageElement = <HTMLImageElement>hteWorkArea.querySelector("#image");
		if (hteImage && initdata.image) {
			hteImage.src = this._page.book.resolveBookPath(initdata.image, this._page);
		}

		let hteFullName: HTMLElement = <HTMLElement>hteWorkArea.querySelector("#fullname");
		if (hteFullName && initdata.name_full) {
			hteFullName.innerHTML = initdata.name_full;
		}

		let htePropRecordTempl = templset.templates.get("PropRecord") as HTMLTemplateElement;
		let hteMain = <HTMLElement>hteWorkArea.querySelector("#maindata");
		let mainprops: [] = initdata.main;
		if (mainprops && hteMain) {
			for (let i = 0; i < mainprops.length; i++) {
				let itemProp: any = mainprops[i];
				let fragRecord = <DocumentFragment>App.doc.importNode(htePropRecordTempl.content, true);
				//
				let hteHeader = fragRecord.querySelector("#Header");
				if (hteHeader && itemProp.label) {
					hteHeader.innerHTML = itemProp.label;
				}
				//
				let hteData = fragRecord.querySelector("#Data");
				if (hteData && itemProp.data) {
					hteData.innerHTML = itemProp.data;
				}
				//
				hteMain.appendChild(fragRecord);
			}
		}

		//
		// Collapsed data of the Person's Card (Extra Data)
		//
		let hteExtraDataNest = <HTMLElement>hteWorkArea.querySelector("#extradata");
		let jsonExtra = initdata.extra;
		if (hteExtraDataNest && jsonExtra && Array.isArray(jsonExtra)) {
			let aExtraDataParsed: UIBase.THTMLElementArray = PackHtm.parseToArray(jsonExtra, App.doc);
			for (let i = 0; i < aExtraDataParsed.length; i++) {
				hteExtraDataNest.appendChild(aExtraDataParsed[i]);
			}
		}
		//
		await this._completeBuild({ style: templset.styles, workarea: hteWorkArea });
	}
} // class PersonCard

type TPersonCardArray = PersonCard[];

// =====================================================================

export class PersonCardList extends Ctr.UIControl {
	/* Class Variables and Constants
	----------------------------------------------------------*/
	protected _cards: TPersonCardArray;
	//

	/* Construction / Initialization / Desctruction
	----------------------------------------------------------*/

	constructor(libref: UIBase.IExtLibrary, page: UIBase.IBookPage, presenter: HTMLElement, options: Ctr.TControlOptions, startpoint?: UIBase.ControlStartPoints) {
		super(libref, page, presenter, options, startpoint);
		//
		this._cards = [];
	}


	/* Internal Members
	----------------------------------------------------------*/

	/** @override */
	protected async _onStartPoint(): Promise<any> {
		let initdata = await this._fetchInitData();
		let templset: UIBase.TTemplateSet = await this._fetchTemplate();
		//
		let hteWorkArea = templset.elements.get("workarea") as HTMLElement;
		//
		let aCards: [] = initdata.cards;
		if (aCards) {
			for (let i = 0; i < aCards.length; i++) {
				let presenterCard = Ctr.UIControl._createPresenter(PersonCard.name);
				if (this._presenter.dataset.class) {
					presenterCard.dataset.class = this._presenter.dataset.class;
				}
				//
				let perscard = new PersonCard(
					this._libref,
					this._page,
					presenterCard,
					{ location: "/personcards", templpath: "/templates/personcardlist.html" }, aCards[i]);
				//
				hteWorkArea.appendChild(presenterCard);
				this._cards.push(perscard);
			}
		} // if (aCards)
		//
		for (let i = 0; i < this._cards.length; i++) {
			let perscard = this._cards[i];
			await perscard.beReady();
		}
		//
		await this._completeBuild({ style: templset.styles, workarea: hteWorkArea });
	}

} // class PersonCardList

