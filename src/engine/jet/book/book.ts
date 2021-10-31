import { Helper } from "../../service/aid/aid.js";
import * as UIBase from "../../system/common/uibase.js";
import { BookPage, CoverPage, ContentsPage } from "./../page/bookpage.js";
import { BookContents } from "./../page/contents.js";
import { App } from "../../system/runtime/app.js";
//

export class VMBook implements UIBase.IBook {
	/* Class Variables and Constants
	----------------------------------------------------------*/
	protected _libref: UIBase.ISysLibrary;
	private _jsonMain: any;
	//
	protected _id: string;
	protected _name: string;
	protected _version: string = "0.1.0";
	protected _cachever: string = "010";

	protected _description: string;
	//
	protected _frame: UIBase.IBookFrame | null = null;
	protected _pathLocal: string;
	protected _url: string;
	protected _urlAssets: string;
	protected _urlCode: string;
	protected _urlStrings: string;
	protected _langs: string[] = [];
	//
	protected _pagesAll: UIBase.TBookPages;
	protected _pagesNav: UIBase.TBookPages;
	protected _mapPages: Record<string, BookPage>;
	protected _pageCover?: BookPage;
	protected _pageContents?: ContentsPage;
	protected _contents?: BookContents;
	protected _isLoaded: boolean = false;
	//
	private _nPageNumCount: number = 0;
	private _nPageNumCountInner: number | null = null;


	/* Construction / Initialization / Desctruction
	----------------------------------------------------------*/
	constructor(path: string) {
		this._libref = App.libman.engine;
		this._id = "";
		this._name = "";
		this._description = "";
		//
		this._pathLocal = App.tube.ensureNoSepEnd(path);
		this._url = App.getBookUrl(path);
		this._urlCode = App.tube.combinePath(this._url, "code" + App.tube.DIR_SEP);
		this._urlAssets = App.tube.combinePath(this._url, "_assets" + App.tube.DIR_SEP);
		this._urlStrings = App.tube.combinePath(this._urlAssets, "strings" + App.tube.DIR_SEP);
		//
		this._pagesAll = [];
		this._pagesNav = [];
		this._mapPages = {};
	}


	/* Infrastructure
	----------------------------------------------------------*/

	public setOwner(owner: UIBase.IBookFrame): void {
		this._frame = owner;
	}
	public async load(): Promise<any> {
		if (!this.isLoaded) {
			//
			// Загружаем main.json
			//
			const pathMain: string = App.tube.combinePath(this.url, "main.json");
			let main = await App.tube.loadJson(pathMain, Date.now().toString());
			if (!main) {
				throw new Error("Failed to load the file \"main.json\"");
			}
			//
			this._jsonMain = main;
			//
			if (main.id) {
				this._id = main.id;
			} else {
				throw new Error("The Book ID is missing");
			}
			//
			if (main.name) {
				this._name = main.name;
			} else {
				throw new Error("The Book Name is missing");
			}
			//
			if (main.version) {
				this._version = main.version;
				this._cachever = this._version.split(".").join("");
			}
			//
			if (main.description) {
				this._description = main.description;
			}

			/* Localized strings support */
			if (Helper.isString(main.langs)) {
				this._langs = (main.langs as string).split(",").map((item: string) => item.trim());
			}

			//
			// (теперь) Book Contents
			//
			if (main.contents) {
				this._contents = this._createContents(main.contents);
				//
				await this._contents.build();
				//
				this._isLoaded = true;
			}
		}

		//
		// Содержимое книги (класс BookContents) сформировано, 
		// теперь необходимо подгрузить некоторые страницы (с параметром preload)
		// (пока только страницу Contents)
		if (this._pageContents) {
			await this._pageContents.readyNavigation();
		}
		//
		return this;
	}

	public getStyleLink(): HTMLLinkElement | null {
		if (!this._jsonMain || !this._jsonMain.style) {
			return null;
		}
		//
		let link = <HTMLLinkElement>App.doc.createElement("link");
		link.href = App.tube.combinePath(this._urlCode, this._jsonMain.style);
		link.type = "text/css";
		link.rel = "stylesheet";
		link.media = "screen,print";
		//
		return link;
	}

	public async getScript(): Promise<HTMLScriptElement | null> {
		// not implemented yet!
		return null;
	}

	public regPage(pagecfg: any, bNavable: boolean): UIBase.INavablePage {
		const nPageIndex = this._pagesAll.length;
		//
		let strPageNum: string | null = null;
		if (pagecfg.number) {
			if (Helper.isNumber(pagecfg.number)) {
				strPageNum = pagecfg.number.toString(10);
			} else {
				let strNumSrc = Helper.fetchString(pagecfg.number);
				switch (strNumSrc) {
					case "start": {
						this._nPageNumCountInner = 1;
						strPageNum = this._nPageNumCountInner.toString(10);
						break;
					}
					case "next": {
						if (this._nPageNumCountInner) {
							this._nPageNumCountInner++;
							strPageNum = this._nPageNumCountInner.toString(10);
						} else {
							this._nPageNumCount++;
							strPageNum = this._nPageNumCount.toString(10);
						}
						break;
					}
					case "resume": {
						this._nPageNumCountInner = null;
						this._nPageNumCount++;
						strPageNum = this._nPageNumCount.toString(10);
						break;
					}
					default: {
						if (strNumSrc.length > 0) {
							strPageNum = strNumSrc;
						}
					}
				} // switch
			}
		}
		//
		if (!pagecfg.kind) { pagecfg.kind = "normal"; }
		//
		let page: BookPage | null = this._createPage(this._libref, pagecfg, this, nPageIndex, strPageNum);
		//
		if (!page) {
			switch (pagecfg.kind) {
				case "normal": {
					page = new BookPage(this._libref, pagecfg, this, nPageIndex, strPageNum);
					break;
				}
				case "cover": {
					page = new CoverPage(this._libref, pagecfg, this, nPageIndex, strPageNum);
					this._pageCover = page;
					break;
				}
				case "contents": {
					page = new ContentsPage(this._libref, pagecfg, this, nPageIndex, strPageNum);
					this._pageContents = page;
					this._contents?.assocPage(this._pageContents);
					break;
				}
			}
		}
		//
		if (!page) {
			throw new Error("Unable to create BookPage instance!");
		}
		//
		this._pagesAll.push(page);
		if (bNavable) {
			this._pagesNav.push(page);
		}
		//
		if (page.id) {
			this._mapPages[page.id] = page;
		}
		//
		return page;
	}


	/* IBook Implementation
	----------------------------------------------------------*/
	public get frame(): UIBase.IBookFrame | null {
		return this._frame;
	}

	public get pathLocal(): string {
		return this._pathLocal;
	}

	public get url(): string {
		return this._url;
	}

	public get id(): string {
		return this._id;
	}

	public get name(): string {
		return this._name;
	}

	public get version(): string {
		return this._version;
	}

	public get cachever(): string {
		return this._cachever;
	}

	public get token(): string {
		return this._pathLocal;
	}

	public get contents(): UIBase.IBookContents | undefined {
		return this._contents;
	}

	public get pages(): UIBase.TBookPages {
		return this._pagesNav;
	}

	public get pageCover(): UIBase.IBookPage | null {
		return (this._pageCover) ? this._pageCover : null;
	}

	public get pageContents(): UIBase.IBookPage | null {
		return (this._pageContents) ? this._pageContents : null;
	}

	public get isLoaded(): boolean {
		return this._isLoaded;
	}

	public equalLocalPath(path: string): boolean {
		return App.tube.equalPaths(this._pathLocal, path);
	}

	public resolveBookPath(pathInner: string, page?: UIBase.IBookPage): string {
		return (Helper.startsWith(pathInner, ".") && page) ?
			(App.tube.combinePath(page.urlRoot, pathInner)) :
			App.tube.combinePath(this.url, pathInner);
	}

	public getPageById(strId: string): UIBase.IBookPage | null {
		return (this._mapPages[strId]) ? this._mapPages[strId] : null;
	}

	public getPageByIndex(nIndex: number): UIBase.IBookPage {
		return this._pagesAll[nIndex];
	}


	// IStringsProvider implementation
	// -------------------------------------------------------------------

	public get hasStrings(): boolean {
		return this._langs.length > 0;
	}

	public get urlStrings(): string {
		return this._urlStrings;
	}

	public get langs(): string[] {
		return this._langs;
	}


	/* Public Members
	----------------------------------------------------------*/



	/* Public Events
	----------------------------------------------------------*/




	/* Internal Members
	----------------------------------------------------------*/

	/** @virtual */
	protected _createContents(jsonContents: any): BookContents {
		return new BookContents(jsonContents, this);
	}

	/** @virtual */
	protected _createPage(libref: UIBase.ISysLibrary, pagecfg: any, owner: UIBase.IBook, index: number, pagenum: string | null): BookPage | null {
		return (pagecfg.kind === "normal") ? new BookPage(libref, pagecfg, owner, index, pagenum) : null;
	}

	/* Event Handlers
	----------------------------------------------------------*/



	/* State Machine
	----------------------------------------------------------*/



} // class VMBook
