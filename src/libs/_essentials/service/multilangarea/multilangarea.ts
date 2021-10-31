import { Helper } from "../../../../engine/service/aid/aid.js";
import * as UIBase from "../../../../engine/system/common/uibase.js";
import * as Ctr from "../../../../engine/jet/control/control.js";
import { App } from "../../../../engine/system/runtime/app.js";
//

export class MultilangArea extends Ctr.UIControl {
	private _basepath: string = "";
	private _ext: string = ".html";
	private _hteSelector?: HTMLSelectElement;
	private _hteContent?: HTMLElement;
	//

	/* Construction / Initialization / Desctruction
	----------------------------------------------------------*/

	constructor(libref: UIBase.IExtLibrary, page: UIBase.IBookPage, presenter: HTMLElement, options: Ctr.TControlOptions, startpoint?: UIBase.ControlStartPoints) {
		super(libref, page, presenter, options, startpoint);
		//
	}


	/* Public Members
	----------------------------------------------------------*/

	public get lang(): string {
		if (this._hteSelector && this._hteSelector.selectedIndex >= 0) {
			let opt = this._hteSelector.options[this._hteSelector.selectedIndex];
			return (opt.dataset.lang) ? opt.dataset.lang : App.lang;
		}
		//
		return App.lang;
	}


	/* Internal Members
	----------------------------------------------------------*/

	protected async _onStartPoint(): Promise<any> {
		let initdata = await this._fetchInitData();
		let templset: UIBase.TTemplateSet = await this._fetchTemplate();
		//
		let hteWorkArea = templset.elements.get("workarea") as HTMLElement;
		let hteToolbar = templset.elements.get("toolbar") as HTMLElement; 
		this._hteContent = hteWorkArea;
		//
		// let strLocalId = this._getLocalId();

		if (Helper.isArray(initdata.langs)) {
			let langs = initdata.langs as [];
			this._hteSelector = hteToolbar.querySelector("#lang_sel") as HTMLSelectElement;
			if (this._hteSelector) {
				this._hteSelector.addEventListener("change", this._onLangSelectChange.bind(this));
				for (let lang of langs) {
					let langname = UIBase.LangNames[lang];
					if (langname) {
						let opt = App.doc.createElement("option");
						opt.dataset.lang = lang;
						opt.innerHTML = langname;
						this._hteSelector.appendChild(opt);
					}
				}
			}
		}

		//

		if (initdata.path) {
			let [basepath, ext] = App.tube.splitFileName(initdata.path);
			this._basepath = basepath;
			if (ext) {
				this._ext = ext;
			}
		}
		//
		await this._refreshData(this._hteContent);
		//
		await this._completeBuild( { style: templset.styles, header: hteToolbar, workarea: hteWorkArea }  );
	}

	protected async _onPending(params: any): Promise<void> {
		await this._refreshData(<HTMLElement>this._hteContent);
	}

	private async _refreshData(place: HTMLElement): Promise<void> {
		let targetpath = this._basepath + "-" + this.lang + this._ext;
		targetpath = this._page.book.resolveBookPath(targetpath, this._page);
		let data = await App.tube.loadHTML(targetpath, this._page.book.cachever);
		//
		place.innerHTML = data;
	}

	
	/* Event Handlers
	----------------------------------------------------------*/

	private _onLangSelectChange(ev: Event): void {
		this._togglePending();
	}

} // class MultilangArea

