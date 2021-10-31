import { Markup } from "../../engine/service/aid/aid.js";
import { EventNest } from "../../engine/system/runtime/event.js";
import * as UIBase from "../../engine/system/common/uibase.js";
import { FullScreenToggler } from "./../../engine/service/fullscreen/fullscreen.js";
import { BookPickerDlg } from "./dialogs/bookpicker.js";
import { AppBriefInfoDlg } from "./dialogs/briefinfo.js";
import { AppSettingsDlg } from "./dialogs/settings.js";
import { BookCloseDlg } from "./dialogs/bookclose.js";
import { App } from "../../engine/system/runtime/app.js";
import { AppSettings } from "../../engine/system/runtime/settings.js";
//

class SysBtn {
	/* Class Variables and Constants
	----------------------------------------------------------*/
	protected _presenter: HTMLElement;
	protected _btn?: HTMLButtonElement;
	protected _attrs: UIBase.Attributes;

	protected _eventClick: EventNest<Event>;
	//

	/* Construction / Initialization / Desctruction
	----------------------------------------------------------*/

	constructor(presenter: HTMLElement, templ: HTMLTemplateElement | null) {
		this._presenter = presenter;
		this._attrs = new UIBase.Attributes();
		//
		this._eventClick = new EventNest(this);
		//
		this._doBuild(templ);
	}

	private async _doBuild(templ: HTMLTemplateElement | null): Promise<any> {
		if (templ) {
			let frag = templ.content.cloneNode(true) as DocumentFragment;
			if (frag.firstElementChild instanceof HTMLButtonElement) {
				this._btn = frag.firstElementChild as HTMLButtonElement;
				this._btn.addEventListener("click", this._onClick.bind(this));
			}
			//
			this._presenter.appendChild(frag);
			this._onBuilt();
		}
	}


	/* Infrastructure
	----------------------------------------------------------*/



	/* Public Members
	----------------------------------------------------------*/

	public get presenter(): HTMLElement {
		return this._presenter;
	}

	public show(): void {
		this._presenter.classList.add("visible");
		this._presenter.classList.remove("invisible");
	}

	public hide(): void {
		this._presenter.classList.remove("visible");
		this._presenter.classList.add("invisible");
	}

	public get isVisible(): boolean {
		return this._presenter.classList.contains("visible");
	}

	public get attrs(): UIBase.Attributes {
		return this._attrs;
	}


	/* Public Events
	----------------------------------------------------------*/

	public get eventClick(): EventNest<Event> {
		return this._eventClick;
	}


	/* Internal Members
	----------------------------------------------------------*/

	/** @virtual */
	protected _onBuilt(): void {
		//
	}


	/* Event Handlers
	----------------------------------------------------------*/

	private _onClick(ev: Event): void {
		this._eventClick.raise(ev);
	}


	/* State Machine
	----------------------------------------------------------*/



} // class SysBtn

// =====================================================================

export class GoBackBtn extends SysBtn {

} // class GoBackBtn


// =====================================================================

export class AppMenuBtn extends SysBtn {

	/** @override */
	protected _onBuilt(): void {
		//
	}

	public adjust(hteAnchor: HTMLElement | null): void {
		//
	}

} // class AppMenuBtn


// =====================================================================

enum AppMenuStates {
	None,
	Closed,
	Opening,
	Opened,
	Closing
}


export class AppMenu {
	/* Class Variables and Constants
	----------------------------------------------------------*/
	private _presenter: HTMLElement;
	private _hteAnchor: HTMLElement;
	//
	private _aNavItems: HTMLElement[] = [];
	//
	private _hteFullScreen: HTMLElement | null;
	//

	/* Construction / Initialization / Desctruction
	----------------------------------------------------------*/

	constructor(presenter: HTMLElement, templ: HTMLTemplateElement | null, anchor: HTMLElement) {
		this._presenter = presenter;
		this._presenter.classList.add("closed");
		//
		this._hteAnchor = anchor;
		this._hteFullScreen = null;
		//
		this._presenter.addEventListener("transitionend", this._onTransitionEnd.bind(this));

		//
		// Full Screen support
		//
		(App.doc.documentElement as HTMLElement).addEventListener("fullscreentoggled", this._onFullScreenToggled.bind(this), false);
		(App.doc.documentElement as HTMLElement).addEventListener("fullscreenfailed", this._onFullScreenError.bind(this), false);
		FullScreenToggler.init(App.doc);
		//
		this._doBuild(templ);
	}

	private async _doBuild(templ: HTMLTemplateElement | null): Promise<any> {
		if (templ) {
			let frag = templ.content.cloneNode(true) as DocumentFragment;
			//
			let items: NodeListOf<HTMLElement> = frag.querySelectorAll("li");
			items.forEach((elem: HTMLElement) => {
				this._aNavItems.push(elem);
				//
				switch (elem.id) {
					case "fullscreen": {
						this._hteFullScreen = elem;
						this._hteFullScreen.addEventListener("click", (ev: Event) => {
							this.hide();
							this._toggleFullScreen();
						});
						this._hteFullScreen.classList.add("enlargeview");
						break;
					}
					case "bookpicker": {
						elem.addEventListener("click", (ev: Event) => {
							this.hide();
							this._openBookPicker();
						});
						break;
					}
					case "briefinfo": {
						elem.addEventListener("click", (ev: Event) => {
							this.hide();
							this._openBriefInfo();
						});
						break;
					}
					case "settings": {
						elem.addEventListener("click", (ev: Event) => {
							this.hide();
							this._openSettings();
						});
						break;
					}
					case "bookclose": {
						elem.addEventListener("click", (ev: Event) => {
							this.hide();
							this._onBookClose();
						});
						break;
					}
				}
			});
			//
			await App.strings.processScope(frag);
			this._presenter.appendChild(frag);
			this._changeState(AppMenuStates.Closed);
		}
	}


	/* Infrastructure
	----------------------------------------------------------*/



	/* Public Members
	----------------------------------------------------------*/

	public get presenter(): HTMLElement {
		return this._presenter;
	}

	public show(): void {
		if (this.state === AppMenuStates.Closed) {
			this._changeState(AppMenuStates.Opening);
		}
	}

	public hide(): void {
		if (this.state === AppMenuStates.Opened) {
			this._changeState(AppMenuStates.Closing);
		}
	}

	public get isVisible(): boolean {
		return (this.state === AppMenuStates.Opened);
	}


	/* Public Events
	----------------------------------------------------------*/



	/* Internal Members
	----------------------------------------------------------*/

	private _doPosition(): void {
		let hteParent = this._presenter.parentElement as HTMLElement;
		let rcAnchor = Markup.getBoundsWithin(hteParent, this._hteAnchor);
		//
		this._presenter.style.top = (rcAnchor.bottom + "px");
		//
		this._updateUI();
	}

	private _updateUI(): void {
		this._aNavItems.forEach((elem) => {
			switch (elem.id) {
				case "bookclose": {
					if (App.mainview.hasActiveBook) {
						elem.classList.remove("ui-disabled");
					} else {
						elem.classList.add("ui-disabled");
					}
				}
			}
		});
	}


	/* Command Handlers
	----------------------------------------------------------*/

	//
	// Full Screen
	//
	private _toggleFullScreen(): void {
		if (FullScreenToggler.getFullScreenElement()) {
			FullScreenToggler.cancelFullScreen();
		} else {
			FullScreenToggler.doFullScreen(App.doc.documentElement);
		}
	}

	//
	// Book Picker
	//
	private _openBookPicker(): void {
		let dlg = new BookPickerDlg();
		App.mainview.showModal(dlg);
	}

	//
	// Brief Overview
	//
	private _openBriefInfo(): void {
		let dlg = new AppBriefInfoDlg();
		App.mainview.showModal(dlg);
	}

	//
	// Application Settings
	//
	private _openSettings(): void {
		let dlg = new AppSettingsDlg(App.settings as AppSettings);
		App.mainview.showModal(dlg);
	}

	//
	// Close this Book
	//
	private _onBookClose(): void {
		if (App.mainview.hasActiveBook) {
			let dlg = new BookCloseDlg();
			dlg.eventClosed.subscribe((sender: any, bYes: boolean) => {
				if (bYes) {
					App.mainview.closeBook(App.mainview.getActiveBook());
				}
			});
			//
			App.mainview.showModal(dlg);
		}
	}


	/* Event Handlers
	----------------------------------------------------------*/

	private _onTransitionEnd(ev: TransitionEvent): void {
		switch (this._state) {
			case AppMenuStates.Opening: {
				this._changeState(AppMenuStates.Opened);
				break;
			}
			case AppMenuStates.Closing: {
				this._changeState(AppMenuStates.Closed);
				break;
			}
		}
	}

	private _onFullScreenToggled(ev: Event): void {
		if (this._hteFullScreen) {
			if (FullScreenToggler.isFullScreen) {
				this._hteFullScreen.classList.add("shrinkview");
				this._hteFullScreen.classList.remove("enlargeview");
			} else {
				this._hteFullScreen.classList.add("enlargeview");
				this._hteFullScreen.classList.remove("shrinkview");
			}
		}
	}

	private _onFullScreenError(ev: Event): void {
		App.mainview.showMessage(UIBase.MessageTypes.Failure, "An error occurred changing into fullscreen.", "Fullscreen Failed");
	}

	private _onDocumentClick: (ev: Event) => void = (ev: Event) => {
		App.doc.removeEventListener("click", this._onDocumentClick);
		if (this._state === AppMenuStates.Opened) {
			this.hide();
		}
	}


	/* State Machine
	----------------------------------------------------------*/

	private _state: AppMenuStates = AppMenuStates.None;

	public get state(): AppMenuStates {
		return this._state;
	}

	public set state(stateNew: AppMenuStates) {
		this._state = stateNew;
	}

	private _changeState(stateNew: AppMenuStates): void {
		if (this.state === stateNew) { return; }
		//
		const stateOld: AppMenuStates = this.state;
		this.state = stateNew;
		//
		const stateNow = this.state;
		switch (stateNow) {
			case AppMenuStates.Closed: {
				this._presenter.classList.remove("visible");
				break;
			}
			case AppMenuStates.Opening: {
				this._doPosition();
				this._presenter.classList.add("visible");
				this._presenter.classList.add("opened");
				break;
			}
			case AppMenuStates.Opened: {
				App.doc.addEventListener("click", this._onDocumentClick);
				break;
			}
			case AppMenuStates.Closing: {
				this._presenter.classList.remove("opened");
				App.doc.removeEventListener("click", this._onDocumentClick);
				break;
			}
		}
	}

} // class AppMenu

