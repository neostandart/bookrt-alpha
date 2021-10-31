import * as UIBase from "../common/uibase.js";
import { ErrorCase } from "../runtime/error.js";
import { EventNest } from "../runtime/event.js";
import * as Modal from "./modal.js";
import { BookFrame } from "../../jet/bookframe/bookframe.js";
import { App, ViewObjectStates } from "../runtime/app.js";
import { VMBook } from "../../jet/book/book.js";
//

export class MainView implements UIBase.IMainView {
	/* Class Variables and Constants
	----------------------------------------------------------*/
	protected _hteAppFrame?: HTMLElement;
	protected _presenter: HTMLElement;
	//
	protected _modframe: Modal.ModalFrame;
	//
	protected _mapOpenedBookframe: Map<string, BookFrame>;
	protected _bBookOpening: boolean;
	//
	protected _eventBookOpened: EventNest<UIBase.TBookEventArgs>;
	protected _eventBookClosed: EventNest<UIBase.TBookEventArgs>;

	protected _nStartDelay: number | null;

	private _bReady: boolean;
	//

	/* Construction / Initialization / Desctruction
	----------------------------------------------------------*/

	constructor() {
		this._modframe = new Modal.ModalFrame();
		this._eventStateChanged = new EventNest(this);
		//
		this._presenter = App.doc.createElement("div");
		//
		this._mapOpenedBookframe = new Map<string, BookFrame>();
		this._bBookOpening = false;
		//
		this._eventBookOpened = new EventNest<UIBase.TBookEventArgs>(this);
		this._eventBookClosed = new EventNest<UIBase.TBookEventArgs>(this);
		//
		this._bReady = false;
		this._nStartDelay = 3000;
		//
		App.wnd.addEventListener("beforeunload", (ev) => {
			let book = this.getActiveBook();
			if (book) {
				App.db.informBookClosed(book.token);
			}
		});
	}


	/* Infrastructure
	----------------------------------------------------------*/

	public async open(hteApplication: HTMLElement): Promise<any> {
		this._changeState(ViewObjectStates.Opening);
		//
		this._hteAppFrame = hteApplication;
		//
		App.displayTitle();
		//
		let presenter = <HTMLElement>hteApplication.querySelector(".app-mainview");
		if (presenter) {
			this._presenter = presenter;
			//
			this._presenter.appendChild(this._modframe.getPresenter());
			//
			await this._readyOpen();

			//
			// Creating a BookFrame and loading the Book			
			//
			let pathBook: string | null = null;

			if (App.params.hasParam("path")) {
				pathBook = App.params.getParamString("path");
			} else if (App.params.hasParam("book")) {
				let pathParam: string | null = App.catalog.getBookPathById(App.params.getString("book", App.lang, App.langDefault));
				if (pathParam) {
					pathBook = pathParam;
				} else {
					App.logWarning("The parameter URL 'book' (id) is not valid");
				}
			}

			if (!pathBook) {
				pathBook = (App.appcfg.hasParam("start")) ? App.appcfg.getParamString("start") : null;
			}

			if (pathBook) {
				try {
					await this.openBook(pathBook, App.params.getParamStringOrNull("page"));
				} catch (err) {
					let strErrMsg = await App.strings.getFormatted("errBookOpen", null, pathBook);
					strErrMsg += " | " + ErrorCase.extractMessage(err);
					App.logError(new Error(strErrMsg));
				}
			} else {
				// No Book to open.
				this._changeActiveBookState(UIBase.ActiveBookStates.NoBook);
			}
			//
			this._bReady = true;
			if (!this._nStartDelay) {
				this._changeState(ViewObjectStates.Opened);
			}
		} else {
			this._changeState(ViewObjectStates.Error);
			throw new Error("MainView: The 'app-mainview' element is not found!");
		}
	}

	public regOpenedBookFrame(bkframe: BookFrame): void {
		if (!this._mapOpenedBookframe.has(bkframe.book.id)) {
			this._mapOpenedBookframe.set(bkframe.book.id, bkframe);
			App.db.informBookOpened(bkframe.book.token);
			//
			setTimeout(() => {
				this._onBookOpened(bkframe.book);
				this._eventBookOpened.raise({ book: bkframe.book });
				//
				if (this._state === ViewObjectStates.Opened) {
					this._stopAppSplash();
				}
				//
				App.displayTitle(bkframe.book.name);
			}, 10);
		} else {
			// такого быть не должно!
			App.logWarning(`regOpenedBookFrame: BookFrame (BookId:${bkframe.book.id}) is already registered!`);
		}
	}

	public unregOpenedBookFrame(bkframe: BookFrame): void {
		if (this._mapOpenedBookframe.has(bkframe.book.id)) {
			this._mapOpenedBookframe.delete(bkframe.book.id);
			App.db.informBookClosed(bkframe.book.token);
			//
			setTimeout(() => {
				this._onBookClosed(bkframe.book);
				this._eventBookClosed.raise({ book: bkframe.book });
			}, 0);
		} else {
			// такого быть не должно!
			App.logWarning(`unregOpenedBookFrame: BookFrame (BookId:${bkframe.book.id}) is missing!`);
		}
	}


	/* IMainView Implementation
	----------------------------------------------------------*/

	public showModal(modal: Modal.DialogBox): void {
		this._modframe.show(modal, { close: "invisible" });
	}

	public hideModal(): void {
		this._modframe.hide();
	}

	public get isModal(): boolean {
		return this._modframe.isModal;
	}

	public get hasActiveBook(): boolean {
		return (!!this.getActiveBook());
	}

	//

	public showMessage(type: UIBase.MessageTypes, message: string, caption?: string, displaytime?: number): void {
		// immediately return control of the program
		setTimeout(async () => {
			if (!caption) {
				caption = await App.strings.getString("capMessage");
			}

		}, 0);
	}

	public showError(err: unknown, displaytime?: number): void {
		//
	}

	public showInfoPanel(): void {
		//
	}

	public hideInfoPanel(): void {
		//
	}

	//

	public get eventBookOpened(): EventNest<UIBase.TBookEventArgs> {
		return this._eventBookOpened;
	}
	public get eventBookClosed(): EventNest<UIBase.TBookEventArgs> {
		return this._eventBookClosed;
	}

	//

	public async openBook(bookpath: string, startpageid: string | null = null): Promise<UIBase.IBookFrame> {
		let bookCurrent = this.getActiveBook();
		if (bookCurrent && bookCurrent.equalLocalPath(bookpath)) {
			return <BookFrame>bookCurrent.frame;
		}
		//
		this._changeActiveBookState(UIBase.ActiveBookStates.Opening);
		//
		this._startAppSplash();
		//
		let hteBookFrame = App.doc.createElement("div");
		hteBookFrame.classList.add("app-bookframe");
		//
		let book = this._createBookInstance(bookpath);
		let bookframe = new BookFrame(hteBookFrame, book, startpageid);
		await bookframe.ready();
		//
		this._presenter.appendChild(hteBookFrame);
		// In this version of the framework, only one main vmbook can be opened
		this.regOpenedBookFrame(bookframe);
		//
		this._changeActiveBookState(this.hasActiveBook ? UIBase.ActiveBookStates.Opened : UIBase.ActiveBookStates.NoBook);
		//
		return bookframe;
	}

	public closeBook(book: UIBase.IBook | null): void {
		if (book) {
			// пока временно ???
			let bookframe = book.frame as BookFrame;
			
			// так, всё норм.
			bookframe.presenter.parentElement?.removeChild(bookframe.presenter);
			this.unregOpenedBookFrame(bookframe);

			// надо закрытую Книгу отправлять на процедуру сохранения и потом уже дестроить...

			//
			if (!this.hasActiveBook) {
				this._changeActiveBookState(UIBase.ActiveBookStates.NoBook);
			}
		}
	}

	public getActiveBook(): UIBase.IBook | null {
		/*
		In this version of the framework, only one book can be opened as the main one
		(in the future, it is also possible to open a dependent book). Therefore, the main book must be in the array first.
		*/
		let book: UIBase.IBook | null = null;
		//
		let frames: UIBase.IBookFrame[] = Array.from(this._mapOpenedBookframe.values());
		if (frames.length > 0) {
			book = frames[0].book;
		}
		//
		return book;
	}


	/* Public Members
	----------------------------------------------------------*/



	/* Public Events
	----------------------------------------------------------*/

	public get eventStateChanged(): EventNest<any> {
		return this._eventStateChanged;
	}


	/* Internal Members
	----------------------------------------------------------*/

	/** @virtual */
	protected async _readyOpen(): Promise<any> {
		return;
	}

	/** @virtual */
	protected _createBookInstance(path: string): VMBook {
		return new VMBook(path);
	}

	/** @virtual */
	protected _onBookOpened(book: UIBase.IBook): void {
		//
	}

	/** @virtual */
	protected _onBookClosed(book: UIBase.IBook): void {
		//
	}

	protected _startAppSplash(): void {
		if ((window as any).AppSplash) {
			(window as any).AppSplash.start();
		}
	}

	protected _stopAppSplash(): void {
		if ((window as any).AppSplash) {
			(window as any).AppSplash.stop();
		}
	}


	/* Event Handlers
	----------------------------------------------------------*/

	protected async _invokeOpenBook(bookpath: string): Promise<void> {
		if (this.hasActiveBook) {
			let urlTarget = App.tube.ensureNoSepEnd(App.url);
			urlTarget = `${urlTarget}?path=${bookpath}&lang=${App.lang}`;
			App.wnd.open(urlTarget, "_blank")?.focus();
		} else {
			let bookframe = await this.openBook(bookpath);
			bookframe?.toStartPage();
		}
	}


	/* Active Book State Machine
	----------------------------------------------------------*/

	public get stateActiveBook(): UIBase.ActiveBookStates {
		return this._stateActiveBook;
	}

	protected _stateActiveBook = UIBase.ActiveBookStates.Undef;

	protected _changeActiveBookState(stateNew: UIBase.ActiveBookStates): void {
		if (this._stateActiveBook === stateNew) { return; }
		//
		const stateOld: UIBase.ActiveBookStates = this.stateActiveBook;
		this._stateActiveBook = stateNew;
		//
		switch (this.stateActiveBook) {
			case UIBase.ActiveBookStates.NoBook: {
				App.displayTitle();
				this._presenter.classList.add("nobook");
				break;
			}
			case UIBase.ActiveBookStates.Opening: {
				this._presenter.classList.remove("nobook");
				break;
			}
			case UIBase.ActiveBookStates.Opened: {

				break;
			}
		} // switch
	}

	/* State Machine
	----------------------------------------------------------*/

	/** @virtual */
	protected _onStateChanged(stateNew: ViewObjectStates, stateOld: ViewObjectStates): void { /* */ }

	protected _eventStateChanged: EventNest<any>;

	protected _state: ViewObjectStates = ViewObjectStates.Undef;

	public get state(): ViewObjectStates {
		return this._state;
	}

	protected _changeState(stateNew: ViewObjectStates): void {
		if (this.state === stateNew) { return; }
		//
		const stateOld: ViewObjectStates = this.state;
		this._state = stateNew;
		//
		const stateNow = this.state;
		switch (stateNow) {
			case ViewObjectStates.Opening: {
				if (this._nStartDelay) {
					setTimeout(() => {
						this._nStartDelay = null;
						if (this._state === ViewObjectStates.Opening && this._bReady) {
							this._changeState(ViewObjectStates.Opened);
						}
					}, this._nStartDelay);
				}
				break;
			}
			case ViewObjectStates.Opened: {
				let book = this.getActiveBook();
				if (book && book.frame) {
					book.frame.toStartPage();
				}
				//
				try {
					this._hteAppFrame?.classList.add("running");
					this._stopAppSplash();
				} catch (err) {
					//
				}
				break;
			}
			case ViewObjectStates.Closing: {

				break;
			}
			case ViewObjectStates.Closed: {

				break;
			}
			case ViewObjectStates.Error: {

				break;
			}
		}
		//
		if (this._state !== stateOld) {
			this._onStateChanged(this._state, stateOld);
			this._eventStateChanged.raise({ data: this._state });
		}
	}

} // class MainView

