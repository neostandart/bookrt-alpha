import * as UIBase from "../../engine/system/common/uibase.js";
import { MainView } from "../../engine/system/view/mainview.js";
import { AttractionTool } from "../../engine/service/attraction/attraction.js";
import { App, ViewObjectStates } from "../../engine/system/runtime/app.js";
import * as AppNav from "./appnav.js";
import { ContentsPage } from "../../engine/jet/page/bookpage.js";
import { BookPickerDlg } from "./dialogs/bookpicker.js";
import { VirtualBook } from "../override/book.js";
//

enum UINavStates {
	Undef,
	Neutral,
	NoBook,
	TopLevel,
	SubLevel
}


export class AppView extends MainView {
	/* Class Variables and Constants
	----------------------------------------------------------*/
	private _btnGoBack: AppNav.GoBackBtn | null;
	//
	private _btnAppMenu: AppNav.AppMenuBtn | null;
	private _appmenu: AppNav.AppMenu | null;
	//
	private _toolAttraction: AttractionTool;
	//

	/* Construction / Initialization / Desctruction
	----------------------------------------------------------*/

	public constructor() {
		super();
		//
		this._toolAttraction = new AttractionTool();
		this._btnGoBack = null;
		this._btnAppMenu = null;
		this._appmenu = null;
		//
		this._modframe.eventModalStateChanged.subscribe(this._onModalStateChanged.bind(this));
		BookPickerDlg.eventInvokeOpenBook.subscribe((sender, args) => {
			this._invokeOpenBook(args.bookpath);
		});
	}


	// IMainView Implementation
	// ----------------------------------------------------------*/



	/* Internal Members
	----------------------------------------------------------*/

	/** @override */
	protected async _readyOpen(): Promise<any> {
		//
		// GoBack Button
		//
		let hteGoBackPresenter = App.doc.createElement("div");
		hteGoBackPresenter.id = "goback";
		hteGoBackPresenter.dataset.attract = "arrow";
		hteGoBackPresenter.dataset.side = "right";
		hteGoBackPresenter.classList.add("tool-bg-attract");
		this._btnGoBack = new AppNav.GoBackBtn(hteGoBackPresenter, await App.libman.shell.getTemplate("/templates/appnav", AppNav.GoBackBtn.name));
		this._btnGoBack.eventClick.subscribe(this._onGoBackClick.bind(this));
		this._presenter.appendChild(this._btnGoBack.presenter);

		//
		// AppMenu Button
		//
		let hteAppMenuBtnPresn = App.doc.createElement("div");
		hteAppMenuBtnPresn.id = "appmenubtn";
		this._btnAppMenu = new AppNav.AppMenuBtn(hteAppMenuBtnPresn, await App.libman.shell.getTemplate("/templates/appnav", AppNav.AppMenuBtn.name));
		this._btnAppMenu.eventClick.subscribe(this._onAppMenuClick.bind(this));
		this._presenter.appendChild(this._btnAppMenu.presenter);

		//
		// AppMenu
		//
		let hteAppMenu = App.doc.createElement("div");
		hteAppMenu.id = "appmenu";
		this._appmenu = new AppNav.AppMenu(hteAppMenu, await App.libman.shell.getTemplate("/templates/appnav", AppNav.AppMenu.name), this._btnAppMenu.presenter);
		this._presenter.appendChild(this._appmenu.presenter);
		//
		this._toolAttraction.processScope(this._presenter);

		//
		this._changeUINavState(UINavStates.Neutral);
	}

	/** @override */
	protected _createBookInstance(path: string): VirtualBook {
		return new VirtualBook(path);
	}

	private _toggleAppMenu(): void {
		if (this._appmenu) {
			if (this._appmenu.isVisible) {
				this._appmenu.hide();
			} else {
				this._appmenu.show();
			}
		}
	}

	/** @override */
	protected _onStateChanged(stateNew: ViewObjectStates, stateOld: ViewObjectStates): void {
		switch (stateNew) {
			case ViewObjectStates.Opened: {
				if (!this.hasActiveBook) {
					this._changeUINavState(UINavStates.NoBook);
				}
				break;
			}
			case ViewObjectStates.Error: {
				break;
			}
		} // switch
	}

	/** @override */
	protected _onBookOpened(book: UIBase.IBook): void {
		(book.frame as UIBase.IBookFrame).eventNavigated.subscribe(this._onNavigated.bind(this));
	}

	/** @override */
	protected _onBookClosed(book: UIBase.IBook): void {
		if (!this.getActiveBook()) {
			this._changeUINavState(UINavStates.NoBook);
		}
	}

	private _onNavigated(sender: any, args: UIBase.PageNavArgs): void {
		if (args.pageNew) {
			if (args.pageNew instanceof ContentsPage) {
				this._changeUINavState(UINavStates.TopLevel, args.pageNew);
			} else {
				this._changeUINavState(UINavStates.SubLevel);
			}
		}
	}

	private _onGoBackClick(sender: any, arg: Event): void {
		let book = this.getActiveBook();
		if (book && book.frame) {
			book.frame.toContents();
		}
	}

	private _onAppMenuClick(sender: any, arg: Event): void {
		this._toggleAppMenu();
	}

	//

	private _onModalStateChanged(sender: any, arg: boolean): void {
		switch (this._stateUINav) {
			case UINavStates.TopLevel: {
				if (arg) {
					this._btnAppMenu?.hide();
				} else {
					this._btnAppMenu?.show();
				}
			}
		}

	}


	/* UI Navigation State Machine
	----------------------------------------------------------*/

	private _stateUINav: UINavStates = UINavStates.Undef;

	protected _changeUINavState(stateNew: UINavStates, pageCurrent?: UIBase.IBookPage): void {
		if (this._stateUINav === stateNew) { return; }
		//
		this._stateUINav = stateNew;
		switch (this._stateUINav) {
			case UINavStates.Neutral: {
				this._toolAttraction.stopAll();
				this._btnGoBack?.hide();
				this._appmenu?.hide();
				this._btnAppMenu?.hide();
				break;
			}
			case UINavStates.NoBook: {
				this._toolAttraction.stopAll();
				this._btnGoBack?.hide();
				this._btnAppMenu?.adjust(null);
				this._btnAppMenu?.show();
				break;
			}
			case UINavStates.TopLevel: {
				this._toolAttraction.stopAll();
				this._btnGoBack?.hide();
				if (this._btnAppMenu) {
					// Page Master(Book Contents)
					if (pageCurrent) {
						this._btnAppMenu.adjust(pageCurrent.getPageBody());
					}
					this._btnAppMenu.show();
				}
				break;
			}
			case UINavStates.SubLevel: {
				this._appmenu?.hide();
				this._btnAppMenu?.hide();
				//
				if (this._btnGoBack && !this._btnGoBack.isVisible) {
					this._btnGoBack.show();
					//
					if (!this._btnGoBack.attrs.has("attracted")) {
						this._btnGoBack.attrs.set("attracted", true);
						this._toolAttraction.attract("goback", 3000, 8000);
					}
				}
				break;
			}
		} // switch
	} // _changeUINavState

} // class AppView
