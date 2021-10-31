import { Helper } from "../../engine/service/aid/aid.js";
import * as UIBase from "../../engine/system/common/uibase.js";
import { VMBook } from "../../engine/jet/book/book.js";
import { BookContents } from "../../engine/jet/page/contents.js";
import { ErrorCase } from "../../engine/system/runtime/error.js";
import { App } from "../../engine/system/runtime/app.js";
//

enum NavElementKinds {
	SinglePage,
	Unit,
	InnerBook,
	InnerPage,
	Folder,
	Pad // Прослойка между страницами (может содержать HTML)
}

enum GlanceBackStatuses {
	None,
	Latest,
	Penultimate
}

enum GlanceBackClasses {
	Latest = "latest",
	Penultimate = "penultimate"
}


type TNavNest = NavElement[];



class NavElement {
	/* Class Variables and Constants
	----------------------------------------------------------*/
	protected _libShell: UIBase.IInnerLib;
	//
	protected _owner: MasterNav;
	protected _objSrc: any;
	protected _id: string;
	protected _kind: NavElementKinds;
	protected _parent: NavElement | null;
	protected _nest: TNavNest;
	protected _presenter: HTMLElement | null;
	protected _selectorMy: string;
	protected _selectorLevel: string;
	//
	protected static _selectorRoot: string = "";
	//
	protected _strLabel: string;
	protected _strPathView?: string;
	//

	/* Construction / Initialization / Desctruction
	----------------------------------------------------------*/

	constructor(owner: MasterNav, objSrc: any, dynid: string, parent: NavElement | null, kind: NavElementKinds) {
		this._libShell = App.libman.getLibByName("shell") as UIBase.IInnerLib;
		//
		this._owner = owner;
		this._objSrc = objSrc;
		this._id = dynid;
		this._kind = kind;
		this._parent = parent;
		this._nest = [];
		this._presenter = null;
		//
		this._selectorMy = "#" + dynid.toString();
		this._selectorLevel = (parent) ? parent.selectorMy + " " + this._selectorMy : this._selectorMy;
		//
		this._strLabel = (this._objSrc.label) ? this._objSrc.label : "";
	}


	/* Public Static Members
	----------------------------------------------------------*/

	public static __init(selectorRoot: string): void {
		this._selectorRoot = selectorRoot;
	}

	public static get selectorRoot(): string {
		return this._selectorRoot;
	}


	/* Public Members
	----------------------------------------------------------*/

	public get id(): string {
		return this._id;
	}

	public get kind(): NavElementKinds {
		return this._kind;
	}

	public get nest(): TNavNest {
		return this._nest;
	}

	/** @virtual */
	public async getPresenter(): Promise<HTMLElement> {
		return App.doc.createElement("div");
	}

	public get selectorMy(): string {
		return this._selectorMy;
	}

	public get selectorLevel(): string {
		return this._selectorLevel;
	}

	public get selectorGlobal(): string {
		return (this._parent) ? this._parent.selectorGlobal + " " + this._selectorMy : this._selectorMy;
	}

	public getPathView(): string {
		if (!this._strPathView) {
			if (this._parent) {
				this._strPathView = this._parent.getPathView() + " > ";
			} else {
				this._strPathView = "";
			}
			//
			this._strPathView += this._strLabel;
		}
		//
		return <string>this._strPathView;
	}


	/* Internal Members
	----------------------------------------------------------*/

	protected async _getPresenter(temp: HTMLTemplateElement | null): Promise<HTMLElement> {
		if (temp) {
			let presenter = <HTMLElement>App.doc.importNode(temp.content, true).firstElementChild;
			presenter.id = this._id;
			//
			if (this._objSrc.class) {
				let aClass: string[] = this._objSrc.class.split(" ");
				presenter.classList.add(...aClass);
			}
			//
			// Текст и изображение ссылки на страницу	
			//
			let htePageImage: HTMLImageElement = <HTMLImageElement>(presenter.querySelector("#image"));
			if (htePageImage && this._objSrc.image) {
				if (Helper.isString(this._objSrc.image)) {
					htePageImage.src = this._owner.book.resolveBookPath(this._objSrc.image);
				} else if (Helper.isJsonObject(this._objSrc.image)) {
					let joImage = this._objSrc.image;
					if (Helper.isString(joImage.path)) {
						htePageImage.src = this._owner.book.resolveBookPath(joImage.path);
					}
					//
					if (Helper.isString(joImage.class)) {
						let aClass = (<string>joImage.class).split(" ");
						htePageImage.classList.add(...aClass);
					}
				}
			}
			//
			let htePageLabel = <HTMLElement>(presenter.querySelector("#label"));
			if (htePageLabel && this._objSrc.label) {
				htePageLabel.innerHTML = this._objSrc.label;
			}
			//
			return presenter;
		} else {
			throw new Error(await App.strings.getFormatted("errTemplateNotFound", null, `kind=${this._kind.toString()}, Id=${this.id}`));
		}
	}

} // class NavElement

// =====================================================================

class NavPageBase extends NavElement {
	protected _target: UIBase.INavablePage;

	protected _statusGlanceBack: GlanceBackStatuses = GlanceBackStatuses.None;

	constructor(target: UIBase.INavablePage, owner: MasterNav, objSrc: any, dynid: string, parent: NavElement | null, kind: NavElementKinds) {
		super(owner, objSrc, dynid, parent, kind);
		//
		this._target = target;
	}

	public get statusGlanceBack(): GlanceBackStatuses {
		return this._statusGlanceBack;
	}

	public set statusGlanceBack(status: GlanceBackStatuses) {
		if (this._statusGlanceBack !== status && this._presenter) {
			this._statusGlanceBack = status;
			this._presenter.classList.remove(...[GlanceBackClasses.Latest, GlanceBackClasses.Penultimate]);
			switch (this._statusGlanceBack) {
				case GlanceBackStatuses.Latest: {
					this._presenter.classList.add(GlanceBackClasses.Latest);
					break;
				}
				case GlanceBackStatuses.Penultimate: {
					this._presenter.classList.add(GlanceBackClasses.Penultimate);
					break;
				}
			}
		}
	}

} // NavPageBase

// =====================================================================

class NavElementCard extends NavElement {
	/* Construction / Initialization / Desctruction
	----------------------------------------------------------*/
	constructor(owner: MasterNav, objSrc: any, dynid: string, parent: NavElement | null, kind: NavElementKinds) {
		super(owner, objSrc, dynid, parent, kind);
		//
	}


	/* Internal Members
	----------------------------------------------------------*/

	/** @virtual */
	protected async _processPresenter(presenter: HTMLElement): Promise<any> {
		presenter.id = this._id;
		//
		let hteContentToggle = <HTMLElement>presenter.querySelector("#contenttoggle");
		if (!hteContentToggle) {
			throw new Error(await App.strings.getFormatted("errTemplateWrong", null, `kind: ${this._kind.toString()}, Id: ${this.id}`));
		}

		let strCollapseElemId = this.id.toString() + "Collapse";
		hteContentToggle.dataset.bsTarget = "#" + strCollapseElemId;

		let hteCollapse = <HTMLElement>presenter.querySelector(".collapse");
		if (!hteCollapse) {
			throw new Error(await App.strings.getFormatted("errTemplateWrong", null, `kind: ${this._kind.toString()}, Id: ${this.id}`));
		}
		hteCollapse.id = strCollapseElemId;
		hteCollapse.dataset.bsParent = (this._parent) ? this._parent.selectorMy : NavElement.selectorRoot;

		let hteContent = <HTMLElement>hteCollapse.querySelector(".card-body");
		if (!hteContent) {
			throw new Error(await App.strings.getFormatted("errTemplateWrong", null, `kind: ${this._kind.toString()}, Id: ${this.id}`));
		}

		hteCollapse.addEventListener("shown.bs.collapse", (ev) => {
			this._presenter?.classList.add("opened");
		});

		hteCollapse.addEventListener("hidden.bs.collapse", (ev) => {
			this._presenter?.classList.remove("opened");
		});

		//
		// Формируем содержимое (дочерние элементы)
		//
		let aPromises: any[] = [];
		for (let i = 0; i < this._nest.length; i++) {
			aPromises.push(this._nest[i].getPresenter());
		}
		let aPresenters: HTMLElement[] = [];
		aPresenters = await Promise.all(aPromises);
		for (let i = 0; i < aPresenters.length; i++) {
			hteContent.appendChild(aPresenters[i]);
		}
	}

} // class NavElementCard

// =====================================================================

class NavUnit extends NavElementCard {
	/* Construction / Initialization / Desctruction
	----------------------------------------------------------*/
	constructor(owner: MasterNav, objSrc: any, dynid: string, parent: NavElement | null) {
		super(owner, objSrc, "Unit" + dynid, parent, NavElementKinds.Unit);
		//
	}


	/* Public Members
	----------------------------------------------------------*/

	/** @override */
	public async getPresenter(): Promise<HTMLElement> {
		if (!this._presenter) {
			this._presenter = await this._getPresenter(await App.libman.shell.getTemplate("/templates/masternav", "NavUnit"));
			await this._processPresenter(this._presenter);
		}
		//
		return this._presenter;
	}


	/* Internal Members
	----------------------------------------------------------*/


} // class NavUnit

// =====================================================================

class NavSinglePage extends NavPageBase {
	/* Construction / Initialization / Desctruction
	----------------------------------------------------------*/
	constructor(target: UIBase.INavablePage, owner: MasterNav, objSrc: any, dynid: string, parent: NavElement | null) {
		super(target, owner, objSrc, "PageS" + dynid, parent, NavElementKinds.SinglePage);
		//
	}


	/* Public Members
	----------------------------------------------------------*/

	public async getPresenter(): Promise<HTMLElement> {
		if (!this._presenter) {
			this._presenter = await this._getPresenter(await App.libman.shell.getTemplate("/templates/masternav", "NavSinglePage"));
			//
			// Обрабатываем клик
			//
			this._presenter.addEventListener("click", this._onClick.bind(this));
			this._presenter.addEventListener("keydown", this._onKey.bind(this));
		}
		//
		return this._presenter;
	}


	/* Internal Members
	----------------------------------------------------------*/



	/* Event Handlers
	----------------------------------------------------------*/

	protected _onClick(ev: Event) {
		ev.preventDefault();
		this._owner.invokeNavigate(this._target, this);
	}

	protected _onKey(ev: KeyboardEvent) {
		if (ev.code === "Space") {
			ev.preventDefault();
			this._owner.invokeNavigate(this._target, this);
		}
	}

} // class NavSinglePage

// =====================================================================

class NavInnerBook extends NavElementCard {
	/* Construction / Initialization / Desctruction
	----------------------------------------------------------*/
	constructor(owner: MasterNav, objSrc: any, dynid: string, parent: NavElement | null) {
		super(owner, objSrc, "InnerBook" + dynid, parent, NavElementKinds.InnerBook);
		//
	}


	/* Public Members
	----------------------------------------------------------*/

	/** @override */
	public async getPresenter(): Promise<HTMLElement> {
		if (!this._presenter) {
			this._presenter = await this._getPresenter(await App.libman.shell.getTemplate("/templates/masternav", "NavInnerBook"));
			await this._processPresenter(this._presenter);
			//
			let hteInfo = <HTMLElement>this._presenter.querySelector("#partinfo");
			if (hteInfo) {
				if (this._objSrc.info) {
					hteInfo.innerHTML = this._objSrc.info.toString();
				} else {
					hteInfo.style.display = "none";
				}
			}
		}
		//
		return this._presenter;
	}


	/* Internal Members
	----------------------------------------------------------*/



} // class NavInnerBook

// =====================================================================

class NavInnerPage extends NavPageBase {
	/* Construction / Initialization / Desctruction
	----------------------------------------------------------*/
	constructor(target: UIBase.INavablePage, owner: MasterNav, objSrc: any, dynid: string, parent: NavElement | null) {
		super(target, owner, objSrc, "PageI" + dynid, parent, NavElementKinds.InnerPage);
		//
		let selector = this.selectorLevel;
	}


	/* Public Members
	----------------------------------------------------------*/

	public async getPresenter(): Promise<HTMLElement> {
		if (!this._presenter) {
			this._presenter = await this._getPresenter(await App.libman.shell.getTemplate("/templates/masternav", "NavInnerPage"));
			//
			let strPageNumber = (this._target as UIBase.IBookPage).number;
			let htePageNumber = <HTMLElement>this._presenter.querySelector("#number");
			if (htePageNumber && strPageNumber) {
				htePageNumber.innerHTML = strPageNumber;
			}
			//
			// Обрабатываем клик
			//
			this._presenter.addEventListener("click", this._onClick.bind(this));
			this._presenter.addEventListener("keydown", this._onKey.bind(this));
		}
		//
		return this._presenter;
	}


	/* Event Handlers
	----------------------------------------------------------*/

	protected _onClick(ev: Event) {
		ev.preventDefault();
		this._owner.invokeNavigate(this._target, this);
	}

	protected _onKey(ev: KeyboardEvent) {
		if (ev.code === "Space") {
			ev.preventDefault();
			this._owner.invokeNavigate(this._target, this);
		}
	}
} // class NavInnerPage

// =====================================================================

class NavPad extends NavElement {
	/* Construction / Initialization / Desctruction
	----------------------------------------------------------*/
	constructor(owner: MasterNav, objSrc: any, dynid: string, parent: NavElement | null) {
		super(owner, objSrc, "Pad" + dynid, parent, NavElementKinds.Pad);
		//

	}


	/* Public Members
	----------------------------------------------------------*/

	public async getPresenter(): Promise<HTMLElement> {
		if (!this._presenter) {
			this._presenter = App.doc.createElement("div");
			this._presenter.classList.add("padnest");
			this._presenter.innerHTML = <string>this._objSrc;
		}
		//
		return this._presenter;
	}


	/* Internal Members
	----------------------------------------------------------*/



} // class NavPad

// =====================================================================

class NavFolder extends NavElementCard {
	/* Construction / Initialization / Desctruction
	----------------------------------------------------------*/
	constructor(owner: MasterNav, objSrc: any, dynid: string, parent: NavElement | null) {
		super(owner, objSrc, "Folder" + dynid, parent, NavElementKinds.Folder);
		//
	}


	/* Public Members
	----------------------------------------------------------*/

	/** @override */
	public async getPresenter(): Promise<HTMLElement> {
		if (!this._presenter) {
			this._presenter = await this._getPresenter(await App.libman.shell.getTemplate("/templates/masternav", "NavFolder"));
			await this._processPresenter(this._presenter);
		}
		//
		return this._presenter;
	}


	/* Internal Members
	----------------------------------------------------------*/



} // NavFolder

// =====================================================================

export class MasterNav extends BookContents {
	/* Class Variables and Constants
	----------------------------------------------------------*/
	private _objstruct: TNavNest; // !!! назвать по другому

	private _latest: NavPageBase | null = null;
	private _penultimate: NavPageBase | null = null;
	//

	/* Construction / Initialization / Desctruction
	----------------------------------------------------------*/

	constructor(objSrc: any, owner: VMBook) {
		super(objSrc, owner);
		//
		this._objstruct = [];
	}


	/* Infrastructure
	----------------------------------------------------------*/

	/** @override */
	/** В данной реализации результат возврата функции не используется */
	public async build(): Promise<any[]> {
		let aPageDefs: any[] = []; // не используется
		//
		try {
			this._presenter = App.doc.createElement("div");
			this._presenter.id = "NavBox";
			NavElement.__init("#" + this._presenter.id);

			// Starting a recursive cycle of building an object model of the navigation structure
			this._processNest(this._structure, 1, null, this._objstruct, aPageDefs);

			//
			// The structure of objects is ready - we build the visual part
			//
			for (let i = 0; i < this._objstruct.length; i++) {
				let elem = this._objstruct[i];
				let hteElemPresenter = await elem.getPresenter();
				if (hteElemPresenter) {
					this._presenter.appendChild(hteElemPresenter);
				}
			}
		} catch (err) {
			throw new ErrorCase(err, null, Helper.getObjectName(this));
		}
		//
		return aPageDefs;
	}

	public invokeNavigate(page: UIBase.INavablePage, navpage: NavPageBase): void {
		if (this._owner.frame) {
			//
			if (this._latest && this._latest !== navpage) {
				if (this._penultimate) {
					this._penultimate.statusGlanceBack = GlanceBackStatuses.None;
				}
				//
				this._penultimate = this._latest;
				this._penultimate.statusGlanceBack = GlanceBackStatuses.Penultimate;
			}
			//
			this._latest = navpage;
			this._latest.statusGlanceBack = GlanceBackStatuses.Latest;
			//
			this._owner.frame.toPage(page);
		}
	}


	/* Internal Members
	----------------------------------------------------------*/

	private _processNest(levelsrc: any[], nLevel: number, parent: NavElement | null, nest: TNavNest, aPageDefs: any[]): void {
		for (let i = 0; i < levelsrc.length; i++) {
			let itemsrc = levelsrc[i];
			//
			if (itemsrc.exclude) {
				continue;
			}
			//
			let dynid: string = nLevel.toString() + "_" + Helper.zeroPad(i + 1, 2);

			switch (itemsrc.type) {
				case "unit": {
					if (nLevel !== 1) {
						throw new Error("A Unit Element of the Contents can only be at the top level.");
					}
					//
					let navunit = new NavUnit(this, itemsrc, dynid, parent);
					nest.push(navunit);
					//
					if (itemsrc.nest) {
						this._processNest(itemsrc.nest, nLevel + 1, navunit, navunit.nest, aPageDefs);
					}
					//
					break;
				}
				case "folder": {
					let navfolder = new NavFolder(this, itemsrc, dynid, parent);
					nest.push(navfolder);
					//
					if (itemsrc.nest) {
						this._processNest(itemsrc.nest, nLevel + 1, navfolder, navfolder.nest, aPageDefs);
					}
					//
					break;
				}
				case "innerbook": {
					if (parent !== null && (parent.kind !== NavElementKinds.Unit && parent.kind !== NavElementKinds.Folder)) {
						throw new Error("A InnerBook Element of the Contents can only be nested in a \"Unit\" or \"Folder\".");
					}
					//
					let innerbook = new NavInnerBook(this, itemsrc, dynid, parent);
					nest.push(innerbook);
					if (itemsrc.nest) {
						this._processNest(itemsrc.nest, nLevel + 1, innerbook, innerbook.nest, aPageDefs);
					}
					//
					break;
				}
				case "pad": {
					let navpad = new NavPad(this, itemsrc.properties, dynid, parent);
					nest.push(navpad);
					break;
				}
				case "page": {
					if (parent !== null && parent.kind !== NavElementKinds.Unit && parent.kind !== NavElementKinds.InnerBook && parent.kind !== NavElementKinds.Folder) {
						throw new Error("A Page Element of the Contents can only be nested in a Unit, Folder or InnerBook.");
					}
					//
					//
					let bNavable: boolean = false;
					if (!!itemsrc.label) {
						bNavable = true;
						if (!itemsrc.properties.title) {
							itemsrc.properties.title = itemsrc.label;
						}
					}

					let strPathView = (parent) ? parent.getPathView() + " > " : "> ";
					// The Title should be displayed on each page using: data-prop="title"
					// strPathView += itemsrc.properties.title;
					itemsrc.properties.pathview = strPathView;

					try {
						aPageDefs.push(itemsrc.properties);
						let page: UIBase.INavablePage = this._owner.regPage(itemsrc.properties, bNavable);
						if (bNavable) {
							let navpage = (parent !== null && parent.kind === NavElementKinds.InnerBook) ? new NavInnerPage(page, this, itemsrc, dynid, parent) : new NavSinglePage(page, this, itemsrc, dynid, parent);
							nest.push(navpage);
						}
					} catch (err) {
						App.logWarning(ErrorCase.createFrom(err).message);
					}
				} // case "page"
			} // switch (itemsrc.type)
		} // for
	}


	/* Event Handlers
	----------------------------------------------------------*/



	/* State Machine
	----------------------------------------------------------*/



} // class MasterNav
