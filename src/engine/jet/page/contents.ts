import * as UIBase from "../../system/common/uibase.js";
import { VMBook } from "../book/book.js";
import { App } from "../../system/runtime/app.js";
//

export class BookContents implements UIBase.IBookContents {
	/* Class Variables and Constants
	----------------------------------------------------------*/
	protected _source: any;
	protected _structure: [];
	protected _owner: VMBook;
	protected _page?: UIBase.IBookPage;
	protected _filler: string = "";
	//
	protected _presenter?: HTMLElement;
	//

	/* Construction / Initialization / Desctruction
	----------------------------------------------------------*/

	constructor(oSrc: any, owner: VMBook) {
		this._structure = [];
		//
		this._source = oSrc;
		this._owner = owner;
		this._filler = oSrc.filler ?? "";
		//
		if (oSrc.structure) {
			this._structure = oSrc.structure;
		}
		if (this._structure.length === 0) {
			throw new Error("There are no pages in the book");
		}
	}


	/* Infrastructure
	----------------------------------------------------------*/

	/** @virtual */
	public async build(): Promise<any[]> {
		return new Promise<any>(async (resume: any) => {
			resume([]);
		});
	}

	
	/* IBookContents Implementation
	----------------------------------------------------------*/

	public assocPage(page: UIBase.IBookPage): void {
		this._page = page;
		if (this._page.hasPresenter) {
			this._adjustContents();
		} else {
			this._page.eventPresenterCreated.subscribe((sender, args) => {
				this._adjustContents();
			});
		}
	}


	/* Public Members
	----------------------------------------------------------*/
	public get presenter(): HTMLElement {
		return this._presenter ? this._presenter : App.doc.createElement("div");
	}

	public get book(): UIBase.IBook {
		return this._owner;
	}

	
	/* Public Events
	----------------------------------------------------------*/



	/* Internal Members
	----------------------------------------------------------*/
	protected _adjustContents(): void {
		if (this._page && this._page.presenter) {
			const hteContentsPlace = this._page.presenter.querySelector(".bk-booknav");
			if (hteContentsPlace) {
				hteContentsPlace.innerHTML = "";
				hteContentsPlace.appendChild(this.presenter);
			}
		}
	}


	/* Event Handlers
	----------------------------------------------------------*/



	/* State Machine
	----------------------------------------------------------*/



} // class BookContents
