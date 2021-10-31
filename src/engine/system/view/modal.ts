import { Helper } from "../../service/aid/aid.js";
import * as UIBase from "../common/uibase.js";
import { ErrorCase } from "../runtime/error.js";
import { EventNest } from "../runtime/event.js";
import { App } from "../runtime/app.js";
//

// Modal Base
// =====================================================================

export class ModalFrame {
	/* Class Variables and Constants
	----------------------------------------------------------*/
	private _presenter: HTMLElement;
	private _hteCloseBtn: HTMLElement | null;
	private _modal: UIBase.IPopupModal | null;
	private _extcss?: UIBase.TModalExtCss;

	protected _eventModalStateChanged: EventNest<boolean>;
	//

	/* Construction / Initialization / Desctruction
	----------------------------------------------------------*/

	constructor() {
		this._hteCloseBtn = null;
		this._modal = null;
		//
		this._presenter = App.doc.createElement("div");
		this._presenter.classList.add("modalframe");
		//
		this._eventModalStateChanged = new EventNest(this);
		//
		this._hteCloseBtn = App.doc.createElement("button") as HTMLButtonElement;
		this._hteCloseBtn.id = "close";
		this._hteCloseBtn.classList.add("btn", "btn-info", "btn-lg", "fsym", "fsym-cross-slim");
		//
		this._hteCloseBtn.addEventListener("click", () => {
			this.hide();
		});
		//
		this._presenter.appendChild(this._hteCloseBtn);
	}


	/* Public Members
	----------------------------------------------------------*/

	public getPresenter(): HTMLElement {
		return <HTMLElement>this._presenter;
	}

	public async show(modal: UIBase.IPopupModal, extcss?: UIBase.TModalExtCss): Promise<void> {
		if (this._modal) {
			return;
		}
		//
		this._extcss = extcss;
		//
		if (this._presenter) {
			if (this._hteCloseBtn) {
				if (this._extcss?.close) {
					this._hteCloseBtn.classList.add(this._extcss.close);
				}
			}
			//
			this._modal = modal;
			this._modal.callbackCloseMe = () => {
				this.hide();
			};
			//
			if (this._extcss?.frame) {
				this._presenter.classList.add(this._extcss.frame);
			}
			//
			try {
				await this._modal.init();
				//
				this._presenter.appendChild(this._modal.presenter);
				this._modal.notifyAttached();
				//
				this._presenter.classList.add("opened");
				//
				setTimeout(async () => {
					await this._modal?.notifyOpened();
					this._modal?.presenter.classList.add("show");
				}, 10);
			} catch (err) {
				if (this._modal && this._modal.presenter) {
					let errorcase = new ErrorCase(err, null, Helper.getObjectName(this));
					errorcase.display(this._modal.presenter);
					this._modal.presenter.style.visibility = "visible";
					this._modal.presenter.style.opacity = "1";
				}
				//
				this._hteCloseBtn?.classList.remove("invisible");
			}
			//
			this.eventModalStateChanged.raise(this.isModal);
		}
	}

	public hide(): void {
		if (this._hteCloseBtn && this._extcss?.close) {
			this._hteCloseBtn.classList.remove(this._extcss.close);
		}
		//
		if (this._presenter) {
			this._presenter.classList.remove("opened");
			//
			if (this._extcss?.frame) {
				this._presenter.classList.remove(this._extcss.frame);
			}
			//
			if (this._modal) {
				this._presenter.removeChild(this._modal.presenter);
				this._modal.notifyDetached();
			}
		}
		//
		this._modal = null;
		this._extcss = undefined;
		//
		this.eventModalStateChanged.raise(this.isModal);
	}

	public get isModal(): boolean {
		return this._modal !== null;
	}

	public get eventModalStateChanged(): EventNest<boolean> {
		return this._eventModalStateChanged;
	}


	/* Internal Members
	----------------------------------------------------------*/



	/* State Machine
	----------------------------------------------------------*/



} // ModalFrame

// =====================================================================

export class PopupModal implements UIBase.IPopupModal {
	// Class Variables and Constants
	// -------------------------------------------------------------------
	protected _presenter: HTMLElement | null;
	protected _bProcessed: boolean = false;
	protected _closeMe?: () => void;
	//
	protected _eventClosed: EventNest<boolean>;
	//

	// Construction / Initialization / Destruction
	// -------------------------------------------------------------------

	constructor(presenter?: HTMLTemplateElement | HTMLElement) {
		this._eventClosed = new EventNest(this);
		//
		if (presenter) {
			presenter.classList.add("popupmodal");
			//
			if (presenter instanceof HTMLTemplateElement) {
				const frag: DocumentFragment | null = (presenter as HTMLTemplateElement).content.cloneNode(true) as DocumentFragment;
				if (frag && frag.firstElementChild) {
					this._presenter = <HTMLElement>frag.firstElementChild;
				} else {
					throw new Error("Invalid source for SysModal");
				}
			} else {
				this._presenter = presenter;
			}
		} else {
			this._presenter = null;
		}
	}

	// Infrastructure
	// -------------------------------------------------------------------

	/** @virtual */
	public async init(): Promise<any> {
		if (this._presenter) {
			let hteCloseBtn: HTMLElement | null = this._presenter.querySelector("button.close");
			if (hteCloseBtn) {
				hteCloseBtn.addEventListener("click", () => {
					this._close(false);
				});
			}
		}
	}

	public notifyAttached(): void {
		this._onAttached();
	}

	public async notifyOpened(): Promise<void> {
		await this._onOpened();
	}

	public notifyDetached(): void {
		this._onClosed();
	}


	// Public Properties
	// -------------------------------------------------------------------

	public get presenter(): HTMLElement {
		return <HTMLElement>this._presenter;
	}

	public get isProcessed(): boolean {
		return this._bProcessed;
	}


	// Public Events
	// -------------------------------------------------------------------

	public set callbackCloseMe(closeMe: () => void) {
		this._closeMe = closeMe;
	}

	public get eventClosed(): EventNest<boolean> {
		return this._eventClosed;
	}

	// Internal Members
	// -------------------------------------------------------------------

	/** @virtual */
	protected _onAttached() {
		//
	}

	/** @virtual */
	protected async _onOpened(): Promise<void> { /**/ }

	/** @virtual */
	protected _onClosed() {
		this._eventClosed.raise(this.isProcessed);
	}

	protected _close(bProcessed: boolean = false): void {
		this._bProcessed = bProcessed;
		//
		if (this._closeMe) {
			this._closeMe(); // Просим ModalContext закрыть окно
		}
	}

} // class SysModal


// Dialog Base
// =====================================================================

export enum DialogKinds {
	Close,
	SaveClose,
	YesNo,
	YesNoCancel
}

export enum DialogIconTypes {
	No,
	Info,
	Question,
	Exclamation
}

export enum DialogButtons {
	Close,
	Save,
	Yes,
	No,
	Cancel
}

export class DialogBox extends PopupModal {
	// Class Variables and Constants
	// -------------------------------------------------------------------
	protected _dlgkind: DialogKinds;
	protected _icontype: DialogIconTypes = DialogIconTypes.No;
	protected _hteCaptionSlot: HTMLElement | null = null;
	protected _hteContentSlot: HTMLElement | null = null;

	protected _hteCloseBtn: HTMLButtonElement | null = null;
	protected _hteSaveBtn: HTMLButtonElement | null = null;
	protected _hteYesBtn: HTMLButtonElement | null = null;
	protected _hteNoBtn: HTMLButtonElement | null = null;
	protected _hteCancelBtn: HTMLButtonElement | null = null;
	//
	protected _pressed: DialogButtons = DialogButtons.Close;
	//

	// Construction / Initialization / Destruction
	// -------------------------------------------------------------------

	constructor(dlgkind: DialogKinds = DialogKinds.Close) {
		super();
		//
		this._dlgkind = dlgkind;
	}

	// Public Members
	// -------------------------------------------------------------------

	public get pressed(): DialogButtons {
		return this._pressed;
	}


	// Internal Members
	// -------------------------------------------------------------------

	/** @override */
	public async init(): Promise<any> {
		let pathTemplate = "/templates/modal.html";
		let templ = await App.libman.engine.getTemplate(pathTemplate, "DialogBox");
		if (templ) {
			let frag = templ.content.cloneNode(true) as DocumentFragment;
			await App.strings.processScope(frag);
			this._presenter = frag.firstElementChild as HTMLElement;
			//
			let hteHeader = frag.getElementById("header") as HTMLElement;
			if (hteHeader) {
				let hteIcon = hteHeader.querySelector("#icon") as HTMLElement;
				if (hteIcon && this._icontype !== DialogIconTypes.No) {
					switch (this._icontype) {
						case DialogIconTypes.Info: {
							hteIcon.classList.add("fsym-info-circle-d", "text-info");
							break;
						}
						case DialogIconTypes.Question: {
							hteIcon.classList.add("fsym-question-circle-d", "text-primary");
							break;
						}
						case DialogIconTypes.Exclamation: {
							hteIcon.classList.add("fsym-exclam-circle-d", "text-warning");
							break;
						}
					}
				}
				//
				let hteCloseBtn = hteHeader.querySelector("#close") as HTMLElement;
				hteCloseBtn.addEventListener("click", this._onCloseClick.bind(this));
				//
				this._hteCaptionSlot = hteHeader.querySelector("#caption_slot") as HTMLElement;
			}

			//
			let hteFooter = frag.getElementById("footer") as HTMLElement;
			if (hteFooter) {
				this._hteSaveBtn = hteFooter.querySelector("#save") as HTMLButtonElement;
				if (this._hteSaveBtn) {
					if (this._dlgkind === DialogKinds.SaveClose) {
						this._hteSaveBtn.addEventListener("click", this._onSaveClick.bind(this));
					} else {
						this._hteSaveBtn.style.display = "none";
					}
				}
				//
				this._hteYesBtn = hteFooter.querySelector("#yes") as HTMLButtonElement;
				if (this._hteYesBtn) {
					if ((this._dlgkind === DialogKinds.YesNo) || (this._dlgkind === DialogKinds.YesNoCancel)) {
						this._hteYesBtn.addEventListener("click", this._onYesClick.bind(this));
					} else {
						this._hteYesBtn.style.display = "none";
					}
				}
				//
				this._hteNoBtn = hteFooter.querySelector("#no") as HTMLButtonElement;
				if (this._hteNoBtn) {
					if ((this._dlgkind === DialogKinds.YesNo) || (this._dlgkind === DialogKinds.YesNoCancel)) {
						this._hteNoBtn.addEventListener("click", this._onNoClick.bind(this));
					} else {
						this._hteNoBtn.style.display = "none";
					}
				}
				//
				this._hteCancelBtn = hteFooter.querySelector("#cancel") as HTMLButtonElement;
				if (this._hteCancelBtn) {
					if (this._dlgkind === DialogKinds.YesNoCancel) {
						this._hteCancelBtn.addEventListener("click", this._onCancelClick.bind(this));
					} else {
						this._hteCancelBtn.style.display = "none";
					}
				}
				//
				this._hteCloseBtn = hteFooter.querySelector("#close") as HTMLButtonElement;
				if (this._hteCloseBtn) {
					if ((this._dlgkind === DialogKinds.Close) || (this._dlgkind === DialogKinds.SaveClose)) {
						this._hteCloseBtn.addEventListener("click", this._onCloseClick.bind(this));
					} else {
						this._hteCloseBtn.style.display = "none";
					}
				}
			}
			//
			this._hteContentSlot = frag.getElementById("content_slot") as HTMLElement;
			if (this._hteCaptionSlot && this._hteContentSlot) {
				await this._buildContent(this._hteCaptionSlot, this._hteContentSlot);
			} else {
				throw new Error(await App.strings.getFormatted("errTemplateWrong", null, `CaptionSlot or ContentSlot were not found`));
			}
			//
		} else {
			throw new Error(await App.strings.getFormatted("errTemplateNotFetched", null, pathTemplate));
		}
	}


	/** @virtual */
	protected async _buildContent(hteCaptionSlot: HTMLElement, hteContentSlot: HTMLElement): Promise<any> {
		//
	}

	/** @virtual */
	protected async _invokeAccept(): Promise<boolean> {
		return true;
	}

	/** @virtual */
	protected _onCancel(): void {
		this._close(false);
	}
	

	/* Event Handlers
	----------------------------------------------------------*/

	private _onCloseClick(ev: Event): void {
		this._close(false);
	}

	private async _onSaveClick(ev: Event): Promise<any> {
		this._pressed = DialogButtons.Save;
		//
		let bAccepted = await this._invokeAccept();
		if (bAccepted) {
			this._close(true);
		}
	}

	private async _onYesClick(ev: Event): Promise<any> {
		this._pressed = DialogButtons.Yes;
		//
		let bAccepted = await this._invokeAccept();
		if (bAccepted) {
			this._close(true);
		}
	}

	private async _onNoClick(ev: Event): Promise<any> {
		this._pressed = DialogButtons.No;
		//
		this._close(false);
	}

	private async _onCancelClick(ev: Event): Promise<any> {
		this._pressed = DialogButtons.Cancel;
		//
		this._onCancel();
	}

} // class DialogBox

