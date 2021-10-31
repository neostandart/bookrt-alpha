import { ErrorCase } from "../../system/runtime/error.js";
import { EventNest } from "../../system/runtime/event.js";
import * as UIBase from "../../system/common/uibase.js";
import * as Modal from "./../../system/view/modal.js";
import { PageTransAnimation, PageAnimationProvider } from "../../service/animation/animation.js";
import { PageProcessor } from "./pageproc.js";
import { App } from "../../system/runtime/app.js";
//

export type TModalCallback = (modal: UIBase.IPopupModal) => void;


class BookPageHeader {
	/* Class Variables and Constants
	----------------------------------------------------------*/
	private _page: UIBase.IBookPage;
	private _presenter: HTMLElement;
	private _htePath: HTMLElement | null;


	/* Construction / Initialization / Desctruction
	----------------------------------------------------------*/

	constructor(owner: UIBase.IBookPage, presenter: HTMLElement, templ: HTMLTemplateElement | null) {
		this._page = owner;
		this._page.eventStateChanged.subscribe(this._onPageStateChanged.bind(this));
		//
		this._presenter = presenter;
		//
		this._htePath = null;
		//
		if (this._presenter.children.length === 0) {
			this._build(templ); // async build
		}
	}


	/* Public Members
	----------------------------------------------------------*/

	public get presenter(): HTMLElement {
		return this._presenter;
	}


	/* Internal Members
	----------------------------------------------------------*/
	private async _build(templ: HTMLTemplateElement | null): Promise<any> {
		if (templ) {
			let fragContent: DocumentFragment = <DocumentFragment>templ.content.cloneNode(true);
			if (fragContent) {
				this._htePath = <HTMLElement>fragContent.querySelector("#path");
				if (this._htePath) {
					this._htePath.innerHTML = this._page.getPathView();
				}
				//
				let hteNumber = <HTMLElement>fragContent.querySelector("#number");
				if (hteNumber) {
					if (this._page.number) {
						hteNumber.innerHTML = this._page.number;
					} else {
						hteNumber.style.display = "none";
					}
				}
				//
				this._presenter.appendChild(fragContent);
				await this._page.processor.processHTMLScope(this._presenter);
				await App.strings.processScope(this._presenter, this._page.book);
			}
		}
	}

	/** @virtual */
	protected _onPageStateChanged(page: UIBase.IBookPage, args: UIBase.TNavableStateChangedArgs): void {
		switch (args.stateNew) {
			case UIBase.NavableStates.Displaying: {
				if (this._htePath) {
					if (this._htePath.scrollHeight) {
						this._htePath.scrollTo({ left: this._htePath.scrollWidth });
					}
				}
				//
				break;
			}
		} // switch
	}

} // class BookPageHeader

// =====================================================================

class PageViewState {
	/* Class Variables and Constants
	----------------------------------------------------------*/
	private _bDefined: boolean = false;
	private _nScrollTop: number = 0;
	private _nScrollLeft: number = 0;


	/* Public Members
	----------------------------------------------------------*/

	public get isDefined(): boolean {
		return this._bDefined;
	}
	public get nScrollTop(): number {
		return this._nScrollTop;
	}
	public set nScrollTop(val: number) {
		this._nScrollTop = val;
		this._bDefined = true;
	}

	public get nScrollLeft(): number {
		return this._nScrollLeft;
	}
	public set nScrollLeft(val: number) {
		this._nScrollLeft = val;
		this._bDefined = true;
	}

	public reset(): void {
		this._nScrollTop = 0;
		this._nScrollLeft = 0;
		this._bDefined = false;
	}

} // class PageViewState

// =====================================================================

export type TCreateBookPageInstance = (libref: UIBase.ISysLibrary, pagecfg: any, owner: UIBase.IBook, index: number) => BookPage | null;


export class BookPage implements UIBase.IBookPage {
	/* Class Variables and Constants
	----------------------------------------------------------*/
	protected _libref: UIBase.ISysLibrary;
	protected _book: UIBase.IBook;
	protected _cfg: UIBase.ParameterSet;
	protected _urlPage: string;
	protected _urlRoot: string;
	protected _id: string;
	protected _index: number;
	protected _strNumber: string | null;
	protected _presenter: HTMLElement | null;
	protected _pathview: string;

	protected _header?: BookPageHeader;

	protected _htePageBody: HTMLDivElement | null;
	protected _htePageContent: HTMLElement | null;

	protected _lifekind: UIBase.PageLifeKinds;
	protected _isAttached: boolean;
	protected _bScrollable: boolean;
	protected _tag: any;
	//
	protected _viewstate: PageViewState;
	protected _anim: PageTransAnimation | null;
	protected _error: ErrorCase | null;
	//
	protected _modframe: Modal.ModalFrame;
	//
	protected _eventPresenterCreated: EventNest<HTMLElement>;
	protected _eventPresenterReleased: EventNest<null>;
	protected _eventReadyToUse: EventNest<void>;
	protected _eventScroll: EventNest<Event>;
	protected _eventResize: EventNest<Event>;
	//
	protected _processor: PageProcessor;
	//

	/* Construction / Initialization / Desctruction
	----------------------------------------------------------*/

	constructor(libref: UIBase.ISysLibrary, pagecfg: any, owner: UIBase.IBook, index: number, pagenum: string | null) {
		this._libref = libref;
		//
		this._cfg = new UIBase.ParameterSet(pagecfg);
		this._book = owner;
		//
		this._id = pagecfg.id ?? index.toString();
		this._index = index;
		//
		this._strNumber = pagenum;
		//
		this._bScrollable = (pagecfg.scroll !== undefined) ? <boolean>pagecfg.scroll : true;
		//
		if (!pagecfg.life) {
			pagecfg.life = "transit";
		}
		switch ((<string>pagecfg.life).toLowerCase()) {
			case "transit": {
				this._lifekind = UIBase.PageLifeKinds.Transit;
				break;
			}
			case "persistent": {
				this._lifekind = UIBase.PageLifeKinds.Persistent;
				break;
			}
			case "forever": {
				this._lifekind = UIBase.PageLifeKinds.Forever;
				break;
			}
			default: {
				//
				// !!! Неизвестный тип жизненного цикла (что делать?...)
				//
				this._lifekind = UIBase.PageLifeKinds.Transit;
				break;
			}
		}
		//
		this._urlPage = App.tube.combinePath(this._book.url, pagecfg.path);
		this._urlRoot = App.tube.extractDirectory(this._urlPage);
		this._presenter = null;
		this._htePageBody = null;
		this._htePageContent = null;
		this._viewstate = new PageViewState();
		this._pathview = pagecfg.pathview ?? "";
		this._error = null;
		this._isAttached = false;
		//
		this._eventPresenterCreated = new EventNest(this);
		this._eventPresenterReleased = new EventNest(this);
		this._eventReadyToUse = new EventNest(this);
		this._eventScroll = new EventNest(this);
		this._eventResize = new EventNest(this);
		this._eventStateChanged = new EventNest(this);
		//
		this._anim = PageAnimationProvider.provide(this, pagecfg.animation);
		//
		this._modframe = new Modal.ModalFrame();
		this._processor = new PageProcessor(this);
		this._processor.eventStateChanged.subscribe(this._onProcessorStateChanged.bind(this));
	}


	/* Infrastructure
	----------------------------------------------------------*/

	public getCfg(): UIBase.ParameterSet {
		return this._cfg;
	}


	/* IVisibleElement Implementation
	----------------------------------------------------------*/
	public get presenter(): HTMLElement {
		return <HTMLElement>this._presenter;
	}


	/* INavablePage Implementation
	----------------------------------------------------------*/
	public get life(): UIBase.PageLifeKinds {
		return this._lifekind;
	}

	public get index(): number {
		return this._index;
	}

	public get isAttached(): boolean {
		return this._isAttached;
	}

	public get isProcessed(): boolean {
		return this._processor.state === UIBase.PageProcessorStates.Processed;
	}

	public async readyNavigation(): Promise<UIBase.INavablePage> {
		if (this.hasPresenter) {
			return this;
		} else {
			try {
				// for the "Persistent" and "Forever" pages, this is done once
				this._changeState(UIBase.NavableStates.Preparing);

				let divTempContainer = App.doc.createElement("div");
				divTempContainer.innerHTML = await App.tube.loadHTML(this.urlPage, this._book.cachever);

				const hteSourceFirstElement = divTempContainer.firstElementChild;
				if (hteSourceFirstElement && hteSourceFirstElement instanceof HTMLDivElement && hteSourceFirstElement.classList.contains("bk-page")) {
					const presenter = divTempContainer.firstElementChild as HTMLDivElement;
					presenter.classList.add("bk-page-bg", "bk-page-br");
					this.processor.resolveMarkupLinks(presenter);

					let htePageContent = presenter.querySelector(".page-content") as HTMLElement;
					if (htePageContent) {
						if (htePageContent.parentElement === presenter) {
							this._htePageBody = App.doc.createElement("div");
							this._htePageBody.classList.add("page-body");
							presenter.insertBefore(this._htePageBody, htePageContent);
							this._htePageBody.appendChild(htePageContent);
							//
							let htePageHeader = presenter.querySelector(".page-header") as HTMLElement;
							if (htePageHeader) {
								this._header = new BookPageHeader(this, htePageHeader, await this._getHeaderTemplate());
							}
							//
							await this._setPresenter(presenter);
							this._changeState(UIBase.NavableStates.Invisible);
							//
							if (!this._processor.isEarlyProcessingDone) {
								await this._processor.processBeforePageDisplay();
							}
						} else {
							throw new Error(await App.strings.getFormatted("errBookPageFormat", null, `path: ${this._urlPage}`));
						}
					} else {
						throw new Error(await App.strings.getFormatted("errBookPageFormat", null, `path: ${this._urlPage}`));
					}
				} else {
					throw new Error(await App.strings.getFormatted("errBookPageFormat", null, `path: ${this._urlPage}`));
				}
			} catch (err) {
				this._markError(ErrorCase.createFrom(err));
				const presenter = App.doc.createElement("div");
				presenter.classList.add("bk-page");
				await this._setPresenter(presenter);
				this._changeState(UIBase.NavableStates.Invisible);
			}
		}
		//
		return this;
	}

	public notifyRejection(): void {
		if (this.state !== UIBase.NavableStates.Invisible && this.state !== UIBase.NavableStates.Displaying) {
			App.logWarning("BookPage.notifyAttached() — inconsistent state (" + this._state as string + ").");
		}

		if (this._lifekind === UIBase.PageLifeKinds.Transit) {
			this._releasePresenter();
		}

		this._changeState(UIBase.NavableStates.Invisible);
	}

	/** presenter is added to the page host and the page is set to the "waiting" status" */
	public async notifyAttached(): Promise<UIBase.INavablePage> {
		if (this.state !== UIBase.NavableStates.Invisible) {
			App.logWarning("BookPage.notifyAttached() - inconsistent state (" + this._state as string + ").");
		}

		if (this.isAttached !== false) {
			App.logWarning("BookPage.notifyAttached() - Already Attached!");
		}

		// Restoring the visual state of the page
		if (this._lifekind === UIBase.PageLifeKinds.Persistent && this._htePageBody) {
			if (this._viewstate.isDefined) {
				this._htePageBody.scrollLeft = this._viewstate.nScrollLeft;
				this._htePageBody.scrollTop = this._viewstate.nScrollTop;
				this._viewstate.reset();
			}
		}
		//
		this._isAttached = true;
		//
		return this;
	}

	public notifyDetached(): void {
		this._isAttached = false;
	}

	public notifyComing(): Promise<UIBase.INavablePage> {
		return new Promise<UIBase.INavablePage>((handlerComplete: any/*, handlerError: any*/) => {
			if (this.state !== UIBase.NavableStates.Invisible) {
				App.logWarning("BookPage.notifyComing() - inconsistent state (" + this._state as string + ").");
			}
			//
			if (this._htePageContent && this._htePageBody) {
				// Calculating the minimum height of the inner area of the page.
				// In some situations, this helps to display the page content more comfortably.
				this._htePageContent.style.minHeight = (this._htePageBody.clientHeight - (parseInt(window.getComputedStyle(this._htePageContent, null).getPropertyValue("margin-bottom"), 10))) + "px";
			}
			//
			this._changeState(UIBase.NavableStates.Displaying);
			//
			handlerComplete(this);
		});
	}

	public async notifyDisplay(): Promise<void> {
		if (!this._processor.isLateProcessingDone) {
			await this._processor.processAfterPageDisplay();
		}
		//
		this._changeState(UIBase.NavableStates.Displayed);
	}

	public notifyOutgoing(): Promise<UIBase.INavablePage> {
		// pagehost will not execute detach until Promise is complete
		// (detach for pages with PageLifeKinds.Forever will not be made)
		return new Promise<UIBase.INavablePage>((handlerComplete: any) => {
			this._changeState(UIBase.NavableStates.Outgoing);
			//
			if (this._lifekind === UIBase.PageLifeKinds.Persistent && this._htePageBody) {
				this._viewstate.nScrollLeft = this._htePageBody.scrollLeft;
				this._viewstate.nScrollTop = this._htePageBody.scrollTop;
			}
			//
			handlerComplete(this);
		});
	}

	public notifyHidden(): void {
		// if Transit or Persistent then the page is disconnected from the parent
		// if the Forever page is simply hidden

		if (this.state !== UIBase.NavableStates.Outgoing) {
			App.logWarning("BookPage.notifyHidden() - inconsistent state (" + this._state + ")");
		}

		if (this._lifekind === UIBase.PageLifeKinds.Transit) {
			this._releasePresenter();
		}

		this._changeState(UIBase.NavableStates.Invisible);
	}

	public updateLayout(): void {
		//
	}

	public forceLifeMode(mode: UIBase.PageLifeKinds): void {
		this._lifekind = mode;
	}

	public equal(another?: UIBase.INavablePage | null): boolean {
		return (another) ? (this === another) : false;
	}


	/* IBookPage Implementation
	----------------------------------------------------------*/

	public get id(): string {
		return this._id;
	}

	public get number(): string | null {
		return this._strNumber;
	}

	public get pubinfo(): string {
		return `Book=${this._book.name} | Path=${this._cfg.getParam("path")}`;
	}

	public get urlPage(): string {
		return this._urlPage;
	}

	public get urlRoot(): string {
		return this._urlRoot;
	}

	public get book(): UIBase.IBook {
		return this._book;
	}

	public showModal(modal: UIBase.IPopupModal, extcss?: UIBase.TModalExtCss): void {
		this._modframe.show(modal, extcss);
	}

	public hideModal(): void {
		this._modframe.hide();
	}

	public get isModal(): boolean {
		return this._modframe.isModal;
	}

	public get processor(): UIBase.IPageProcessor {
		return this._processor;
	}


	//
	// Service
	//

	public getElemVisibleArea(ve: UIBase.IVisualElement): DOMRect | null {
		let rcResult: DOMRect | null = null;
		//
		if (this._htePageBody) {
			// Coordinates relative to Document
			let rcPageBody = this._htePageBody.getBoundingClientRect();
			let rcViewElem = ve.presenter.getBoundingClientRect();
			// Get the coordinates of the ViewElem relative to the PageBody.
			rcViewElem = new DOMRect(rcViewElem.left - rcPageBody.left, rcViewElem.top - rcPageBody.top, rcViewElem.width, rcViewElem.height);
			//
			if (rcViewElem.top < rcPageBody.height && rcViewElem.bottom > 0) {
				// Visible area of the ViewElem relative to the PageBody
				let nVisibleCtrTop = (rcViewElem.top <= 0) ? 0 : rcViewElem.top; // relative to the PageBody
				let nVisibleCtrHeight = (rcViewElem.bottom <= rcPageBody.bottom) ? rcViewElem.bottom - nVisibleCtrTop : rcPageBody.height - nVisibleCtrTop;

				// Visible area inside the ViewElem
				nVisibleCtrTop = (rcViewElem.top >= 0) ? 0 : Math.abs(rcViewElem.top);
				rcResult = new DOMRect(rcViewElem.left, nVisibleCtrTop, rcViewElem.width, nVisibleCtrHeight);
			}
		}
		//
		return rcResult;
	}

	public getClientVisibleArea(): DOMRect {
		if (this._htePageBody) {
			let rcBody = this._htePageBody.getBoundingClientRect();
			rcBody.x = this._htePageBody.scrollLeft;
			rcBody.y = this._htePageBody.scrollTop;
			return rcBody;
		}
		//
		return new DOMRect(0, 0, 0, 0);
	}

	public translateClientRect(ve: UIBase.IVisualElement | HTMLElement): DOMRect {
		if (this._htePageBody) {
			let rcBody = this._htePageBody.getBoundingClientRect();
			let rcElem = ("presenter" in ve) ? (<UIBase.IVisualElement>ve).presenter.getBoundingClientRect() : (<HTMLElement>ve).getBoundingClientRect();
			//
			rcElem.y = (rcElem.top - rcBody.top) + this._htePageBody.scrollTop;
			rcElem.x = (rcElem.left - rcBody.left) + this._htePageBody.scrollLeft;
			//
			return rcElem;
		}
		//
		return new DOMRect(0, 0, 0, 0);
	}

	public translateClientRectIntoVisible(ve: UIBase.IVisualElement): DOMRect {
		let rcElem = ve.presenter.getBoundingClientRect();
		//

		//
		return rcElem;
	}

	public ensureVisible(velem: UIBase.IVisualElement, gravity: UIBase.Layouts, indent: number): void {
		if (this._htePageBody) {
			// Coordinates relative to Document
			let rcPageBody = this._htePageBody.getBoundingClientRect();
			//
			let rcViewElem = velem.presenter.getBoundingClientRect();
			rcViewElem = new DOMRect(rcViewElem.left, rcViewElem.top - indent, rcViewElem.width, rcViewElem.height + (indent * 2));
			// Get the coordinates of the ViewElem relative to the PageBody.
			rcViewElem = new DOMRect(rcViewElem.left - rcPageBody.left, rcViewElem.top - rcPageBody.top, rcViewElem.width, rcViewElem.height);
			//
			//
			const SCROLL_MIN = 0;
			const SCROLL_MAX = this._htePageBody.scrollHeight - rcPageBody.height;
			//
			let nTopPos = rcViewElem.top + this._htePageBody.scrollTop;
			let nScrollDesired: number = 0;
			//
			//
			if (gravity === UIBase.Layouts.Undef) {
				if (rcViewElem.top < 0) {
					gravity = UIBase.Layouts.Top;
				} else if (rcViewElem.bottom > rcPageBody.height) {
					gravity = UIBase.Layouts.Bottom;
				} else {
					gravity = UIBase.Layouts.Center;
				}
			}
			//
			switch (gravity) {
				case UIBase.Layouts.Center: {
					nScrollDesired = nTopPos - ((rcPageBody.height / 2) - (rcViewElem.height / 2));
					break;
				}
				case UIBase.Layouts.Bottom: {
					nScrollDesired = nTopPos - (rcPageBody.height - rcViewElem.height);
					break;
				}
				default: {
					// любое др. значение считается как Top
					nScrollDesired = nTopPos;
					break;
				}
			}
			//
			if (nScrollDesired < SCROLL_MIN) {
				nScrollDesired = SCROLL_MIN;
			} else if (nScrollDesired > SCROLL_MAX) {
				nScrollDesired = SCROLL_MAX;
			}
			//
			$(this._htePageBody).animate({ scrollTop: nScrollDesired }, 400, () => {
				// it may not be necessary
				// this._bAnimating = false;
				// this._$hteScrollOwner.finish();
			});
		}
	}

	//
	// Aux
	//
	public get header(): BookPageHeader | null {
		return (this._header) ? this._header : null;
	}

	public get hasPresenter(): boolean {
		return (!!this._presenter);
	}

	public getPageBody(): HTMLElement | null {
		return this._htePageBody;
	}

	public getPathView(): string {
		return this._pathview;
	}

	public get tag(): any {
		return this._tag;
	}
	public set tag(value: any) {
		this._tag = value;
	}


	/* Public Members
	----------------------------------------------------------*/



	/* Public Events
	----------------------------------------------------------*/
	public get eventPresenterCreated(): EventNest<HTMLElement> {
		return this._eventPresenterCreated;
	}
	public get eventPresenterReleased(): EventNest<null> {
		return this._eventPresenterReleased;
	}

	public get eventProcessed(): EventNest<void> {
		return this._eventReadyToUse;
	}

	public get eventScroll(): EventNest<Event> {
		return this._eventScroll;
	}
	public get eventResize(): EventNest<Event> {
		return this._eventResize;
	}

	public get eventStateChanged(): EventNest<UIBase.TNavableStateChangedArgs> {
		return this._eventStateChanged;
	}


	/* Internal Members
	----------------------------------------------------------*/

	/** @virtual */
	protected async _getHeaderTemplate(): Promise<HTMLTemplateElement | null> {
		return await this._libref.getTemplate("/templates/bookpage", "BookPageHeader");
	}

	/** @virtual */
	protected _onPresenterCreated(htePresenter: HTMLElement): void {
		//
	}

	/** @virtual */
	protected _onProcessed(): void {
		// ???
	}

	/** @virtual */
	protected _restoreState(): void {
		//
	}

	//

	protected async _setPresenter(htePresenter: HTMLDivElement): Promise<void> {
		this._presenter = htePresenter;
		//
		if (this._error) {
			this._applyErrorState(this._error);
		} else {
			if (this._htePageBody) {
				if (!this._bScrollable) {
					this._htePageBody.classList.add("no-scroll");
				} else {
					this._htePageBody.addEventListener("scroll", (ev) => {
						this._eventScroll.raise(ev);
					});
				}
			}
			//
			this._presenter.appendChild(this._modframe.getPresenter());
			//
			await App.strings.processScope(htePresenter, this._book);
			//
			this._onPresenterCreated(this._presenter);
			this._eventPresenterCreated.raise(this._presenter);
		}
	}

	protected _releasePresenter(): void {
		if (this._presenter) {
			this._presenter.innerHTML = "";
		}
		this._presenter = null;
		this._htePageBody = null;
		//
		this._eventPresenterReleased.raise(null);
	}

	protected _markError(error: ErrorCase): void {
		this._error = error;
		if (this._error) {
			this._applyErrorState(this._error);
		}
	}

	protected _applyErrorState(error: ErrorCase) {
		if (this.hasPresenter) {
			const presenter: HTMLElement = <HTMLElement>this._presenter;
			presenter.innerHTML = "";
			presenter.classList.add("page-error"); // Стиль должен быть в css
			presenter.appendChild(error.getView());
		}
	}


	/* Event Handlers
	----------------------------------------------------------*/

	protected _onProcessorStateChanged(sender: unknown, args: UIBase.TPageProcessorStateChangedArgs): void {
		if (args.stateNew === UIBase.PageProcessorStates.Processed) {
			this._eventReadyToUse.raise();
		}
	}


	/* State Machine
	----------------------------------------------------------*/

	private _eventStateChanged: EventNest<UIBase.TNavableStateChangedArgs>;

	private _state: UIBase.NavableStates = UIBase.NavableStates.Initial;

	public get state(): UIBase.NavableStates {
		return this._state;
	}

	/** Virtual function */
	protected _notifyStateChanged(): void {
		//
	}

	private _changeState(stateNew: UIBase.NavableStates): void {
		const stateOld: UIBase.NavableStates = this._state;
		this._state = stateNew;
		//
		switch (this._state) {
			case UIBase.NavableStates.Preparing: {

				break;
			}
			case UIBase.NavableStates.Displaying: {
				if (this._processor.isProcessPhase) {
					// this.showWaitState();
				}
				break;
			}
			case UIBase.NavableStates.Displayed: {

				break;
			}
			case UIBase.NavableStates.Outgoing: {

				break;
			}
			case UIBase.NavableStates.Invisible: {

				break;
			}
		}
		//
		if (this._state !== stateOld) {
			this._notifyStateChanged();
			this._eventStateChanged.raise({ stateNew: this._state, stateOld });
		}
	}

} // class BookPage

// =====================================================================

//
// Далее специализированные страницы
//

export class CoverPage extends BookPage {
	/* Class Variables and Constants
	----------------------------------------------------------*/



	/* Construction / Initialization / Desctruction
	----------------------------------------------------------*/



	/* Public Members
	----------------------------------------------------------*/



	/* Public Events
	----------------------------------------------------------*/



	/* Internal Members
	----------------------------------------------------------*/



	/* Event Handlers
	----------------------------------------------------------*/


} // class CoverPage

// =====================================================================

export class ContentsPage extends BookPage {
	/* Class Variables and Constants
	----------------------------------------------------------*/
	private _contents?: UIBase.IBookContents;


	/* Construction / Initialization / Desctruction
	----------------------------------------------------------*/



	/* Infrastructure
	----------------------------------------------------------*/


	/* Public Members
	----------------------------------------------------------*/



	/* Public Events
	----------------------------------------------------------*/



	/* Internal Members
	----------------------------------------------------------*/



	/* Event Handlers
	----------------------------------------------------------*/



} // class ContentsPage
