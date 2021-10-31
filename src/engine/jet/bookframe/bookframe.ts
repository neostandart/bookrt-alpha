import { EventNest } from "../../system/runtime/event.js";
import * as UIBase from "../../system/common/uibase.js";
import { App } from "../../system/runtime/app.js";
import * as BookNav from "./../pagehost/pagehost.js";
import { VMBook } from "./../book/book.js";
//

type TAttachedElementCounter = { hte: HTMLElement, count: number };


export class BookFrame implements UIBase.IBookFrame {
	/* Class Variables and Constants
	----------------------------------------------------------*/
	private _presenter: HTMLElement;
	private _pagehost: BookNav.BookPageHost;
	private _book: VMBook;

	private _strPageStartId: string | null;
	private _pageStart: UIBase.IBookPage | null;
	//
	private _mapUsedLibraries: Map<string, UIBase.IExtLibrary>;
	private _mapAttachedStyles: Map<string, TAttachedElementCounter>;
	private _hteExtStyles: HTMLDivElement;

	private _mapAttachedScripts: Map<string, TAttachedElementCounter>;
	private _hteExtScripts: HTMLDivElement;

	private _eventNavigating: EventNest<UIBase.PageNavArgs>;
	private _eventNavigated: EventNest<UIBase.PageNavArgs>;


	/* Construction / Initialization / Desctruction
	----------------------------------------------------------*/
	constructor(presenter: HTMLElement, book: VMBook, strPageStartId: string | null = null) {
		this._presenter = presenter;
		this._book = book;
		this._book.setOwner(this);
		//
		this._strPageStartId = strPageStartId;
		this._pageStart = null;
		//
		this._mapUsedLibraries = new Map<string, UIBase.IExtLibrary>();
		this._mapAttachedStyles = new Map<string, TAttachedElementCounter>();
		this._mapAttachedScripts = new Map<string, TAttachedElementCounter>();

		this._hteExtStyles = App.doc.createElement("div");
		this._hteExtStyles.id = "extstyles";
		this._presenter.appendChild(this._hteExtStyles);

		this._hteExtScripts = App.doc.createElement("div");
		this._hteExtScripts.id = "extscripts";
		this._presenter.appendChild(this._hteExtScripts);
		//
		let htePageHost = App.doc.createElement("div");
		htePageHost.id = "pagehost";
		htePageHost.classList.add("bk-pagehost");
		this._presenter.appendChild(htePageHost);
		this._pagehost = new BookNav.BookPageHost(htePageHost);
		this._pagehost.eventPageChanged.subscribe(this._onPageChanged.bind(this));
		//
		this._eventNavigating = new EventNest<UIBase.PageNavArgs>(this);
		this._eventNavigated = new EventNest<UIBase.PageNavArgs>(this);
	}


	/* Infrastructure
	----------------------------------------------------------*/
	public async ready(): Promise<any> {
		if (!this._book.isLoaded) {
			await this._book.load();
		}
		//
		let linkBookStyles = this._book.getStyleLink();
		if (linkBookStyles) {
			this._hteExtStyles.appendChild(linkBookStyles);
		}
		//
		let hteScript = await this._book.getScript();
		if (hteScript) {
			this._hteExtScripts.appendChild(hteScript);
		}
		//
		if (this._strPageStartId) {
			this._pageStart = this._book.getPageById(this._strPageStartId);
			if (!this._pageStart) {
				App.logWarning(`Starting Page with (id=${this._strPageStartId}) not found!`);
			}
		}
	}

	public get presenter(): HTMLElement {
		return this._presenter;
	}


	/* IBookFrame Implementation
	----------------------------------------------------------*/

	public get book(): UIBase.IBook {
		return this._book;
	}

	public async notifyUsedLibrary(libref: UIBase.IExtLibrary): Promise<void> {
		const key = libref.urlRoot;
		if (!this._mapUsedLibraries.has(key)) {
			this._mapUsedLibraries.set(key, libref);
			if (libref.stylepath) {
				await this.attachStyleLink(key, libref.stylepath);
			}
		}
	}


	/* IDynamicExtensions */
	public attachStyle(key: string, hteStyle: HTMLStyleElement | HTMLLinkElement): void {
		if (this._mapAttachedStyles.has(key)) {
			let counter: TAttachedElementCounter = this._mapAttachedStyles.get(key) as TAttachedElementCounter;
			counter.count = (counter.count + 1);
		} else {
			this._mapAttachedStyles.set(key, { hte: hteStyle, count: 1 });
			hteStyle.classList.add(key);
			this._hteExtStyles.appendChild(hteStyle);
		}
	}

	public detachStyle(key: string): void {
		if (this._mapAttachedStyles.has(key)) {
			let counter = this._mapAttachedStyles.get(key) as TAttachedElementCounter;
			counter.count = counter.count - 1;
			if (counter.count <= 0) {
				this._hteExtStyles.removeChild(counter.hte);
				this._mapAttachedStyles.delete(key);
			}
		}
	}

	public attachScript(key: string, hteScript: HTMLScriptElement): void {
		if (this._mapAttachedScripts.has(key)) {
			let counter: TAttachedElementCounter = this._mapAttachedScripts.get(key) as TAttachedElementCounter;
			counter.count++;
		} else {
			let counter: TAttachedElementCounter = { hte: hteScript, count: 1 };
			this._mapAttachedScripts.set(key, counter);
			this._hteExtScripts.appendChild(hteScript);
		}
	}

	public detachScript(key: string): void {
		if (this._mapAttachedScripts.has(key)) {
			let counter: TAttachedElementCounter = this._mapAttachedScripts.get(key) as TAttachedElementCounter;
			counter.count--;
			if (counter.count <= 0) {
				this._mapAttachedScripts.delete(key);
				this._hteExtScripts.removeChild(counter.hte);
			}
		}
	}

	public attachStyleLink(key: string, filepath: string): Promise<HTMLLinkElement | null> {
		return new Promise<any>((resolve: any/*, reject: any*/) => {
			if (this._mapAttachedStyles.has(key)) {
				let counter = this._mapAttachedStyles.get(key) as TAttachedElementCounter;
				counter.count++;
				//
				resolve(counter.hte as HTMLStyleElement);
			} else {
				let link = <HTMLLinkElement>App.doc.createElement("link");
				link.href = filepath;
				link.type = "text/css";
				link.rel = "stylesheet";
				link.media = "screen,print";
				link.addEventListener("load", (ev) => {
					resolve(link);
				});
				link.addEventListener("error", (ev) => {
					App.logError(`An error occurred loading the stylesheet! (path=${filepath}).`);
					resolve(null);
				});
				//
				this.attachStyle(key, link);
			}
		});
	}

	public unloadStyle(key: string): void {
		this.detachStyle(key);
	}

	public async loadScript(key: string, filepath: string): Promise<HTMLScriptElement> {
		return new Promise<any>(async (resolve: any, reject: any) => {
			if (this._mapAttachedScripts.has(key)) {
				let obj = this._mapAttachedScripts.get(key) as TAttachedElementCounter;
				resolve(obj.hte as HTMLScriptElement);
			} else {
				let hteScript = App.doc.createElement("script") as HTMLScriptElement;
				hteScript.src = filepath;
				hteScript.async = true;
				hteScript.addEventListener("load", (ev: Event) => {
					resolve(hteScript);
				});
				//
				this.attachScript(key, hteScript);
			}
		});
	}

	public unloadScript(key: string): void {
		this.detachScript(key);
	}


	/* IBookNavigation */

	public toStartPage(): void {
		if (this._pageStart) {
			this.toPage(this._pageStart);
		} else {
			this.toCover();
		}
	}

	public toCover(): void {
		if (this._book.pages.length > 0) {
			this.toPage((this._book.pageCover) ? this._book.pageCover : this._book.pages[0]);
		}
	}

	public toContents(): void {
		if (this._book.pageContents) {
			this.toPage(this._book.pageContents);
		}
	}

	public get canNextPage(): boolean {
		return false;
	}
	public get canPrevPage(): boolean {
		return false;
	}
	public toNextPage(): void {
		//
	}
	public toPrevPage(): void {
		//
	}
	public toPage(page: UIBase.INavablePage): void {
		if (this._pagehost.current) {
			this._pagehost.navigate(page);
		} else {
			this._pagehost.navigate(page);
		}
	}

	/* Public Members
	----------------------------------------------------------*/




	/* Public Events
	----------------------------------------------------------*/
	public get eventNavigating(): EventNest<UIBase.PageNavArgs> {
		return this._eventNavigating;
	}

	public get eventNavigated(): EventNest<UIBase.PageNavArgs> {
		return this._eventNavigated;
	}



	/* Internal Members
	----------------------------------------------------------*/




	/* Event Handlers
	----------------------------------------------------------*/

	private _onPageChanged(sender: any, args: UIBase.PageNavArgs): void {
		setTimeout(() => {
			this._eventNavigated.raise(args);
		}, 0);
	}


	/* State Machine
	----------------------------------------------------------*/



} // class BookFrame

