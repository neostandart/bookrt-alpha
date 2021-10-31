import { Helper } from "../../service/aid/aid.js";
import { ErrorCase } from "../../system/runtime/error.js";
import { EventNest } from "../../system/runtime/event.js";
import * as UIBase from "../../system/common/uibase.js";
import { BookItem } from "./bookitem.js";
import { App } from "../../system/runtime/app.js";
//

enum ControlStateClasses {
	Init = "state-init",
	Work = "state-work",
	Pending = "state-pending",
	Error = "state-error"
}

export type TControlOptions = { location: string, stylepath?: string, templpath?: string, startpoint?: UIBase.ControlStartPoints };

// =====================================================================


enum PendingScreenStates {
	Hidden,
	Showing,
	Visible,
	Hiding
}

const PENDING_TOGGLE_DURATION = 500;

export class PendingScreen {
	/* Class Variables and Constants
	----------------------------------------------------------*/
	private _presenter: HTMLElement;
	private _owner: HTMLElement;


	/* Construction / Initialization / Desctruction
	----------------------------------------------------------*/

	constructor(owner: UIBase.IVisualElement, cssClass?: string) {
		this._owner = owner.presenter;
		//
		this._presenter = App.doc.createElement("div");
		this._presenter.style.display = "none";
		this._presenter.classList.add(cssClass ? cssClass : "pendingscreen");
		//
		let hteSurface = App.doc.createElement("div");
		hteSurface.classList.add("surface");
		this._presenter.appendChild(hteSurface);
		//
		this._presenter.addEventListener("transitionend", (ev: TransitionEvent) => {
			switch (this._state) {
				case PendingScreenStates.Showing: {
					this._changeState(PendingScreenStates.Visible);
					break;
				}
				case PendingScreenStates.Hiding: {
					this._changeState(PendingScreenStates.Hidden);
					break;
				}
			}
		});
	}


	/* Public Members
	----------------------------------------------------------*/

	public get presenter(): HTMLElement {
		return this._presenter;
	}

	public show(): void {
		if (this._state === PendingScreenStates.Hidden) {
			if (this._presenter.parentElement !== this._owner) {
				this._owner.appendChild(this._presenter);
			}
			//
			this._presenter.style.display = "initial";
			this._changeState(PendingScreenStates.Showing);
		}
	}

	public hide(): void {
		switch (this._state) {
			case PendingScreenStates.Showing: {
				this._changeState(PendingScreenStates.Hiding);
				break;
			}
			case PendingScreenStates.Visible: {
				this._changeState(PendingScreenStates.Hiding);
				break;
			}

		} // switch
	}


	/* Internal Members
	----------------------------------------------------------*/



	/* State Machine
	----------------------------------------------------------*/

	protected _state = PendingScreenStates.Hidden;

	protected _changeState(stateNew: PendingScreenStates): void {
		if (this._state === stateNew) { return; }
		//
		const stateOld: PendingScreenStates = this._state;
		this._state = stateNew;
		//
		switch (this._state) {
			case PendingScreenStates.Hidden: {
				this._presenter.style.display = "none";
				break;
			}
			case PendingScreenStates.Showing: {
				setTimeout(() => {
					this._presenter.classList.add("display");
				}, 0);

				break;
			}
			case PendingScreenStates.Visible: {

				break;
			}
			case PendingScreenStates.Hiding: {
				this._presenter.classList.remove("display");
				break;
			}
		} // switch
	}

} // class PendingCover

// =====================================================================

export class ControlElement extends BookItem implements UIBase.IControlElement {
	/* Class Variables and Constants
	----------------------------------------------------------*/
	protected _libref: UIBase.IExtLibrary;
	protected _presenter: HTMLElement;
	protected _options: TControlOptions;
	protected _initdata: any;
	protected _id: string;
	private _idPersistent?: string;

	protected _startpoint: UIBase.ControlStartPoints;
	protected _location: string;
	private _resroot: string;

	protected _eventStateChanged: EventNest<UIBase.TControlStateChangedArgs>;

	protected _bDeferWorkState: boolean = false;

	protected _error: ErrorCase | null = null;
	//
	protected _pendscreen?: PendingScreen | null;
	//

	/* Construction / Initialization / Desctruction
	----------------------------------------------------------*/

	constructor(libref: UIBase.IExtLibrary, page: UIBase.IBookPage, presenter: HTMLElement, options: TControlOptions, startpoint?: UIBase.ControlStartPoints) {
		super(page);
		//
		presenter.dataset.constructed = "";
		//
		this._libref = libref;
		this._presenter = presenter;
		this._options = options;
		this._error = null;
		//
		this._startpoint = (startpoint) ? startpoint : (options.startpoint) ? options.startpoint : UIBase.ControlStartPoints.BeforeSync;
		//
		this._location = App.tube.combinePath(libref.urlRoot, options.location);
		this._resroot = App.tube.combinePath(this._location, "_resource");
		//
		if (presenter.id) {
			this._id = presenter.id;
		} else {
			this._id = (this.classname + "_" + App.getNextId());
			presenter.id = this._id;
		}
		//
		this._eventStateChanged = new EventNest(this);
		page.eventStateChanged.subscribe(this._onPageStateChanged.bind(this));
	}


	/* Infrastructure
	----------------------------------------------------------*/

	public async beReady(): Promise<any> {
		if (this.state === UIBase.ControlStates.Init) {
			try {
				if (this._page.book.frame) {
					await this._page.book.frame.notifyUsedLibrary(this._libref);
				}
				//
				await this._onStartPoint();
				//
				if (this._options.stylepath && this._page.book.frame) {
					await this._page.book.frame.attachStyleLink(this._options.stylepath, this._libref.resolveFilePath(this._options.stylepath, this));
				}
				//
				setTimeout(() => {
					if (!this._bDeferWorkState) {
						// без этого не сработают анимации стиля "state-work"
						this._changeState(UIBase.ControlStates.Work);
					}
				}, 10);
			} catch (err) {
				this._setErrorState(err);
				App.logError(err);
			}
		}
	}


	/* IDisposable Implementation
	----------------------------------------------------------*/

	/** @virtual */
	public dispose(): void {
		this._eventStateChanged.resetHandlers();
	}


	/* IVisualElement Implementation
	----------------------------------------------------------*/

	public get presenter(): HTMLElement {
		return this._presenter;
	}


	/* IControlElement Implementation
	----------------------------------------------------------*/

	public get id(): string {
		return this._id;
	}

	public get startpoint(): UIBase.ControlStartPoints {
		return this._startpoint;
	}

	public forceStartPoint(startpoint: UIBase.ControlStartPoints): void {
		this._startpoint = startpoint;
	}

	public get location(): string {
		return this._location;
	}

	public get libref(): UIBase.IExtLibrary {
		return this._libref;
	}

	public get resroot(): string {
		return this._resroot;
	}

	public get eventStateChanged(): EventNest<UIBase.TControlStateChangedArgs> {
		return this._eventStateChanged;
	}


	/* Public Members
	----------------------------------------------------------*/



	/* Public Events
	----------------------------------------------------------*/



	/* Internal Members
	----------------------------------------------------------*/

	protected _setPendingScreen(pendscreen: PendingScreen | null): void {
		this._pendscreen = pendscreen;
	}

	/** @virtual */
	protected async _onStartPoint(): Promise<any> {
		//
	}

	protected async _fetchInitData(): Promise<any> {
		if (this._initdata) {
			return this._initdata;
		}
		//
		let joData: any = {};
		let strInitSrc: string | null = (Helper.isString(this._presenter.dataset.init) ? (<string>this._presenter.dataset.init).trim() : null);
		if (strInitSrc) {
			if (Helper.startsWith(strInitSrc, "{")) {
				// this is direct data (options)
				joData = JSON.parse(strInitSrc);
			} else if (Helper.endsWith(strInitSrc, ".json")) {
				let pathInit = this._page.book.resolveBookPath(strInitSrc, this._page);
				joData = await App.tube.loadJson(pathInit);
			} else {
				// We will assume that this is the key to accessing the Code-Behind of the Book Page
			}
		}
		//
		if (this._presenter.dataset) {
			for (let attrname in this._presenter.dataset) {
				if (attrname !== "init" && attrname !== "constructed") {
					joData[attrname] = this._presenter.dataset[attrname];
				}
			}
		}
		//
		this._initdata = joData;
		return this._initdata;
	}

	protected async _fetchTemplate(): Promise<UIBase.TTemplateSet> {
		let templset: UIBase.TTemplateSet = {
			styles: new UIBase.StylesMap(),
			templates: new UIBase.TemplatesMap(),
			elements: new UIBase.ElementsMap()
		};
		//
		if (this._options.templpath) {
			let [filepath, qs] = App.tube.separateQueryString(this._options.templpath);
			const templkey = (qs) ? qs : this.classname;
			//
			let templ = await this._libref.getTemplate(filepath, templkey, this);
			if (templ) {
				let frag: DocumentFragment = App.doc.importNode(templ.content, true) as DocumentFragment;
				//
				let nAutoId: number = 0;
				let listContent = frag.children;
				for (let i = 0; i < listContent.length; i++) {
					let elem = listContent[i];
					if (!elem.id) {
						elem.id = (++nAutoId).toString();
					}
					if (elem instanceof HTMLStyleElement) {
						templset.styles.set(elem.id, <HTMLStyleElement>elem);
					} else if (elem instanceof HTMLTemplateElement) {
						templset.templates.set(elem.id, <HTMLTemplateElement>elem);
					} else if (elem instanceof HTMLElement) {
						templset.elements.set(elem.id, <HTMLElement>elem);
					}
				}
			} else {
				throw new Error(await App.strings.getFormatted("errTemplateNotFound", null, `key=${templkey}`));
			}
		} // this._options.templpath
		//
		return templset;
	}

	protected _getInstanceLocation(): string {
		let strInfo = "(page:" + this.page.urlPage + "/" + this.classname + ")";
		return strInfo;
	}

	protected _togglePending(params?: any): void {
		switch (this._state) {
			case UIBase.ControlStates.Init:
			case UIBase.ControlStates.Work: {
				if (this._pendscreen === undefined) {
					this._pendscreen = new PendingScreen(this);
				}
				//
				this._changeState(UIBase.ControlStates.Pending);
				//
				if (this._pendscreen) {
					setTimeout(() => {
						resolve(this, params);
					}, PENDING_TOGGLE_DURATION);
				} else {
					resolve(this, params);
				}
				break;
			}
		}
		//
		function resolve(obj: ControlElement, theParams: any) {
			if (obj._state === UIBase.ControlStates.Pending) {
				obj._onPending(theParams).then(() => {
					obj._changeState(UIBase.ControlStates.Work);
				}, (err) => {
					if (obj._state !== UIBase.ControlStates.Error) {
						obj._setErrorState(err);
					}
				});
			}
		}
	}

	/** @virtual */
	protected async _onPending(params: any): Promise<void> {
		//
	}

	protected _getPersistentId(): string {
		if (this._idPersistent) {
			return this._idPersistent;
		}
		//
		let idPersistent: string = this.page.id + "_" + this.classname;
		//
		let hteChild: HTMLElement = this._presenter;
		let hteParent: HTMLElement | null = hteChild.parentElement;
		while (hteParent) {
			let nIndex = Array.prototype.indexOf.call(hteParent.children, hteChild);
			idPersistent += ("_" + nIndex.toString());
			hteChild = hteParent;
			hteParent = hteParent.parentElement;
		}
		//
		this._idPersistent = idPersistent;
		return idPersistent;
	}

	protected _setErrorState(err: any): void {
		this._error = ErrorCase.createFrom(err);
		//
		if (this._presenter) {
			this._presenter.innerHTML = "";
			this._presenter.classList.add("errorbanner");
			this._presenter.appendChild(this._error.getView());
		}
	}


	/* Event Handlers
	----------------------------------------------------------*/

	/** @virtual */
	protected _onPageStateChanged(page: UIBase.IBookPage, args: UIBase.TNavableStateChangedArgs): void {
		switch (args.stateNew) {
			case UIBase.NavableStates.Displaying: {
				break;
			}
			case UIBase.NavableStates.Displayed: {
				break;
			}

		} // switch
	}

	/** @virtual */
	protected _onStateChanged(stateNew: UIBase.ControlStates, stateOld: UIBase.ControlStates): void {
		//
	}


	/* State Machine
	----------------------------------------------------------*/

	public get state(): UIBase.ControlStates {
		return this._state;
	}

	protected _state: UIBase.ControlStates = UIBase.ControlStates.Init;

	protected _changeState(stateNew: UIBase.ControlStates): void {
		if (this.state === stateNew) { return; }
		//
		const stateOld: UIBase.ControlStates = this.state;
		this._state = stateNew;
		//
		const stateNow = this.state;
		switch (stateNow) {
			case UIBase.ControlStates.Work: {
				this._presenter.classList.add(ControlStateClasses.Work);
				// this._hideWaitIndication();
				break;
			}
			case UIBase.ControlStates.Pending: {
				this._presenter.classList.add(ControlStateClasses.Pending);
				//
				if (this._pendscreen) {
					this._pendscreen.show();
				}
				//
				break;
			}
			case UIBase.ControlStates.Error: {
				this._presenter.classList.add(ControlStateClasses.Error);
				break;
			}
		} // switch (stateNow)
		//
		switch (stateOld) {
			case UIBase.ControlStates.Init: {
				this._presenter.classList.remove(ControlStateClasses.Init);
				break;
			}
			case UIBase.ControlStates.Work: {
				if (stateNow !== UIBase.ControlStates.Pending) {
					this._presenter.classList.remove(ControlStateClasses.Work);
				}
				break;
			}
			case UIBase.ControlStates.Pending: {
				if (this._pendscreen) {
					this._pendscreen.hide();
				}
				//
				this._presenter.classList.remove(ControlStateClasses.Pending);
				break;
			}
		}
		//
		if (stateNew !== stateOld) {
			this._onStateChanged(stateNew, stateOld);
			this._eventStateChanged.raise({ stateNew, stateOld });
		}
	}

} // class ControlElement


// =====================================================================

class ExtCssClasses extends Map<string, string[]> {
}


export class UIControl extends ControlElement {
	/* Class Variables and Constants
	----------------------------------------------------------*/
	protected _workarea: HTMLElement;
	private _stylekey: string;
	protected _mapExtClasses: ExtCssClasses;
	protected _controls: UIBase.TControlMap;


	/* Construction / Initialization / Desctruction
	----------------------------------------------------------*/

	constructor(libref: UIBase.IExtLibrary, page: UIBase.IBookPage, presenter: HTMLElement, options: TControlOptions, startpoint?: UIBase.ControlStartPoints) {
		super(libref, page, presenter, options, startpoint);
		//
		this._workarea = this._presenter; // if workarea is not set in the template
		//
		this._stylekey = libref.name + "_" + this.classname;
		this._mapExtClasses = new ExtCssClasses();
		//
		this._controls = new Map<string, UIControl>();
		//
		if (presenter.dataset.appear) {
			presenter.classList.add(presenter.dataset.appear);
		}
	}


	/* IDisposable Implementation
	----------------------------------------------------------*/

	public dispose(): void {
		super.dispose();
		//
		if (this._page.book.frame) {
			this._page.book.frame.detachStyle(this._stylekey);
		}
	}


	/* Internal Members
	----------------------------------------------------------*/

	protected async _completeBuild(parts: UIBase.TControlBuildParts): Promise<void> {
		if (this.presenter.dataset.setclass) {
			let aSetters: string[] = this.presenter.dataset.setclass.split(";");
			for (let i = 0; i < aSetters.length; i++) {
				let aOperands: string[] = aSetters[i].split(":");
				if (aOperands.length === 2) {
					let targets = <NodeListOf<HTMLElement>>this._presenter.querySelectorAll(aOperands[0].trim());
					let aClasses = aOperands[1].split(">");
					for (let j = 0; j < targets.length; j++) {
						let hteTarget = targets[j];

						let aClassRemove: string[] = (aClasses.length === 2) ?
							aClasses[0].trim().split(" ").filter((classname) => classname.length > 0) :
							[];

						let aClassAdd: string[] = (aClasses.length === 1) ?
							aClasses[0].trim().split(" ").filter((classname) => classname.length > 0) :
							(aClasses.length === 2) ? aClasses[1].trim().split(" ").filter((classname) => classname.length > 0) :
								[];

						if (aClassRemove.length > 0) {
							hteTarget.classList.remove(...aClassRemove);
						}

						if (aClassAdd.length > 0) {
							hteTarget.classList.add(...aClassAdd);
						}

						if (aClassRemove.length === 0 && aClassAdd.length === 0) {
							App.displayWarning("Invalid class definition in the 'data-setclass' attribute. Location: " + this._getInstanceLocation());
						}
					}
				} else {
					// So far only a message about incorrect syntax
					App.displayWarning("Invalid syntax of the 'data-setclass' attribute. Location: " + this._getInstanceLocation());
				}
			}
		}

		if (parts.style) {
			// Styles of control templates are registered in the class implementing the IBookFrame interface.
			if (parts.style instanceof UIBase.StylesMap) {
				let mapStyles = parts.style;
				mapStyles.forEach((value, key) => {
					if (this._page.book.frame) {
						this._page.book.frame.attachStyle(this._stylekey, value);
					}
				});
			} else {
				if (this._page.book.frame) {
					this._page.book.frame.attachStyle(this._stylekey, parts.style);
				}
			}
		}

		if (parts.workarea && parts.workarea !== this._presenter) {
			this._workarea = parts.workarea;
			this._presenter.innerHTML = "";
			//
			if (parts.header) {
				parts.header.classList.add("ctr-header");
				this._presenter.appendChild(parts.header);
			}
			//
			if (parts.lower) {
				this._presenter.append(...parts.lower);
			}
			//
			parts.workarea.classList.add("ctr-workarea");
			this._presenter.appendChild(parts.workarea);
			//
			if (parts.upper) {
				this._presenter.append(...parts.upper);
			}
			//
			//
			if (parts.footer) {
				parts.footer.classList.add("ctr-footer");
				this._presenter.appendChild(parts.footer);
			}
			//
			//
			// The user data may contain links to internal or external resources
			this.page.processor.resolveMarkupLinks(this._presenter);
			await this._page.processor.processHTMLScope(parts.workarea, this._controls);
			await App.strings.processScope(this._presenter, this._libref);
		} // if (parts.workarea ...
	}


	/* Internal Services
	----------------------------------------------------------*/

	//
	// (Service) Create Presenter
	//
	protected static _createPresenter(name: string): HTMLDivElement {
		let presenter = App.doc.createElement("div");
		presenter.dataset.control = name;
		return presenter;
	}

	//
	// (Service) Indication No Data
	//
	protected static async _showNoData(elem: HTMLElement): Promise<void> {
		this._hideNoData(elem);
		//
		let hteNoData: HTMLElement = App.doc.createElement("div");
		hteNoData.classList.add("no-data", "text-uppercase", "text-muted", "text-center", "my-3");
		hteNoData.innerHTML = await App.strings.getString("txtNoData");
		elem.appendChild(hteNoData);
	}

	protected static _hideNoData(elem: HTMLElement): void {
		let hteNoData = elem.querySelector(".no-data");
		if (hteNoData) {
			hteNoData.parentElement?.removeChild(hteNoData);
		}
	}

} // class UIControl
