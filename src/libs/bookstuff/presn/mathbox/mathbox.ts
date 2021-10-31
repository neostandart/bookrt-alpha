import * as UIBase from "../../../../engine/system/common/uibase.js";
import * as Modal from "../../../../engine/system/view/modal.js";
import * as Ctr from "../../../../engine/jet/control/control.js";
import { EquationProvider } from "../../_shared/eqprov.js";
import { App } from "../../../../engine/system/runtime/app.js";
//

class EquationModal extends Modal.PopupModal {
	private _nodeEquation?: Node;
	private _hteAnchor?: HTMLElement;

	protected _page: UIBase.IBookPage;
	//
	private _hteDragZone: HTMLElement | null;
	private _ptLastDragPos: DOMPoint = new DOMPoint();
	private _bDraggin: boolean = false;

	private _onMouseMoveBind: (ev: MouseEvent) => void;
	private _onMouseUpBind: (ev: MouseEvent) => void;
	private _onTouchMoveBind: (ev: TouchEvent) => void;
	private _onTouchEndBind: (ev: TouchEvent) => void;
	//

	constructor(page: UIBase.IBookPage, presenter: HTMLTemplateElement | HTMLElement) {
		super(presenter);
		//
		this._page = page;
		let hteCloseBtn = presenter.querySelector("#close_btn");
		if (hteCloseBtn) {
			hteCloseBtn.addEventListener("click", (ev: Event) => {
				this._close();
			});
		}

		//
		// Drag support
		//
		this._hteDragZone = presenter.querySelector("#dragzone");
		this._onMouseMoveBind = this._onMouseMove.bind(this);
		this._onMouseUpBind = this._onMouseUp.bind(this);
		this._onTouchMoveBind = this._onTouchMove.bind(this);
		this._onTouchEndBind = this._onTouchEnd.bind(this);

		if (this._hteDragZone) {
			//
			this._hteDragZone.addEventListener("mousedown", (ev: MouseEvent) => {
				if (!this._bDraggin) {
					ev.preventDefault();
					//
					App.doc.addEventListener("mousemove", this._onMouseMoveBind);
					App.doc.addEventListener("mouseup", this._onMouseUpBind);
					//
					this._onDragStart(ev.clientX, ev.clientY);
				}
			});
			//
			this._hteDragZone.addEventListener("touchstart", (ev: TouchEvent) => {
				if (!this._bDraggin) {
					ev.preventDefault();
					//
					App.doc.addEventListener("touchmove", this._onTouchMoveBind);
					App.doc.addEventListener("touchend", this._onTouchEndBind);
					//
					this._onDragStart(ev.touches[0].clientX, ev.touches[0].clientY);
				}
			});
		}
	}

	public setContent(hteAnchor: HTMLElement, nodeEquation: Node, strTitle?: string): void {
		this._hteAnchor = hteAnchor;
		this._nodeEquation = nodeEquation;
		//
		let hteTitle = this.presenter.querySelector("#title") as HTMLElement;
		if (hteTitle) {
			if (strTitle) {
				hteTitle.innerHTML = strTitle;
				this.presenter.classList.remove("no-title");
			} else {
				hteTitle.innerHTML = "";
				this.presenter.classList.add("no-title");
			}
		}
		//
		let hteEquation = this.presenter.querySelector("#equation") as HTMLElement;
		if (hteEquation) {
			hteEquation.innerHTML = "";
			hteEquation.appendChild(this._nodeEquation);
		}
		//
		//
		this.presenter.classList.remove("show"); // Это при закрытии окна надо делать...
	}

	/** @override */
	protected async _onOpened(): Promise<void> {
		let rcPresn = this.presenter.getBoundingClientRect();
		if (this._hteAnchor) {
			let rcAnchor = (this._hteAnchor).getBoundingClientRect();
			// slightly expanding the boundaries
			rcAnchor.y -= 4;
			rcAnchor.height += 8;
			//
			let rcPage = this._page.presenter.getBoundingClientRect();
			let rcPopup = this.presenter.getBoundingClientRect();

			//
			// Vertical position
			//
			let nPopupHeight = Math.ceil(rcPopup.height);
			if (nPopupHeight < rcAnchor.top) {
				rcPopup.y = (rcAnchor.top - nPopupHeight);
			} else {
				rcPopup.y = rcAnchor.bottom;
			}

			//
			// Horizontal position
			//
			rcPopup.x = rcAnchor.left - ((rcPopup.width - rcAnchor.width) / 2);
			if (rcPopup.right > rcPage.right) {
				rcPopup.x = (rcPage.right - rcPopup.width);
			}
			if (rcPopup.left < rcPage.left) {
				rcPopup.x = rcPage.left;
			}

			//
			// Set position
			//
			this.presenter.style.top = (rcPopup.top + "px");
			this.presenter.style.left = (rcPopup.left + "px");
		}
	}

	private _onMouseMove(ev: MouseEvent): void {
		if (this._bDraggin) {
			ev.preventDefault();
			this._onDragMove(ev.clientX, ev.clientY);
		}
	}

	private _onMouseUp(ev: MouseEvent): void {
		if (this._bDraggin) {
			App.doc.removeEventListener("mousemove", this._onMouseMoveBind);
			App.doc.removeEventListener("mouseup", this._onMouseUpBind);
			//
			this._onDragEnd();
		}
	}

	private _onTouchMove(ev: TouchEvent): void {
		if (this._bDraggin) {
			ev.preventDefault();
			this._onDragMove(ev.touches[0].clientX, ev.touches[0].clientY);
		}
	}

	private _onTouchEnd(ev: TouchEvent): void {
		if (this._bDraggin) {
			App.doc.removeEventListener("touchmove", this._onTouchMoveBind);
			App.doc.removeEventListener("touchend", this._onTouchEndBind);
			//
			this._onDragEnd();
		}
	}

	private _onDragStart(x: number, y: number) {
		this._bDraggin = true;
		this._ptLastDragPos.x = x;
		this._ptLastDragPos.y = y;
	}

	private _onDragMove(x: number, y: number) {
		let nNewX = this._ptLastDragPos.x - x;
		let nNewY = this._ptLastDragPos.y - y;
		//
		this._ptLastDragPos.x = x;
		this._ptLastDragPos.y = y;
		//
		this.presenter.style.top = (this.presenter.offsetTop - nNewY) + "px";
		this.presenter.style.left = (this.presenter.offsetLeft - nNewX) + "px";
	}

	private _onDragEnd() {
		if (this._bDraggin) {
			this._bDraggin = false;
		}
	}
}

// =====================================================================

export class MathBox extends Ctr.UIControl {
	/* Class Variables and Constants
	----------------------------------------------------------*/
	private _maths?: NodeListOf<Element>;
	private _nDoneCounter: number;
	private _hteModalPresenter?: HTMLElement;

	private _ctrModal?: EquationModal;
	//
	private _mapOpenedPopovers: Map<string, JQuery>;

	private _fOutsideClickHandler: (ev: Event) => void;
	//

	/* Construction / Initialization / Desctruction
	----------------------------------------------------------*/

	constructor(libref: UIBase.IExtLibrary, page: UIBase.IBookPage, presenter: HTMLElement, options: Ctr.TControlOptions, startpoint?: UIBase.ControlStartPoints) {
		super(libref, page, presenter, options, startpoint);
		//
		this._nDoneCounter = 0;
		this._bDeferWorkState = true;
		//
		this._mapOpenedPopovers = new Map<string, JQuery>();
		//
		this._fOutsideClickHandler = this._onDocumentClick.bind(this);
	}


	/* Internal Members
	----------------------------------------------------------*/

	protected async _onStartPoint(): Promise<any> {
		let templset: UIBase.TTemplateSet = await this._fetchTemplate();
		//
		this._maths = this._presenter.querySelectorAll(".math");
		for (let i = 0; i < this._maths.length; i++) {
			let hteMath = this._maths[i] as HTMLElement;
			//
			let hteEquFrame = App.doc.createElement("div");
			hteEquFrame.id = "equationframe";
			let hteEqu = App.doc.createElement("span");
			hteEqu.id = "equation";
			// The hteMath element must contain only text
			hteEqu.innerHTML = (!hteMath.firstElementChild) ? hteMath.innerHTML : "";

			hteEqu.addEventListener("click", this._onMathClick.bind(this));

			if (hteMath.dataset.comment) {
				let hteComment = App.doc.createElement("span");
				hteComment.id = "comment_btn";
				hteComment.dataset.key = App.getNextId();
				hteComment.classList.add("btn", "btn-sm", "rounded-circle", "me-1", "btn-info", "fsym", "fsym-info");

				hteComment.dataset.bsContent = hteMath.dataset.comment;
				hteComment.dataset.bsToggle = "popover";
				hteComment.dataset.bsTrigger = "manual";

				hteComment.addEventListener("click", this._onCommentClick.bind(this));
				hteEquFrame.appendChild(hteComment);
			}

			hteEquFrame.appendChild(hteEqu);

			hteMath.innerHTML = "";
			hteMath.appendChild(hteEquFrame);

			if (hteMath.dataset.number) {
				hteMath.classList.add("hasnumber");
				let hteNumber = App.doc.createElement("div");
				hteNumber.id = "number";
				hteNumber.innerHTML = hteMath.dataset.number;
				hteMath.appendChild(hteNumber);
			}
		}

		//
		// Presenter for an enlarged modal equation
		//
		if (templset.templates.has("EquationModal")) {
			let templEquationModal = templset.templates.get("EquationModal") as HTMLTemplateElement;
			this._hteModalPresenter = App.doc.importNode(templEquationModal.content, true).firstElementChild as HTMLElement;
			this._ctrModal = new EquationModal(this._page, <HTMLElement>this._hteModalPresenter);
		}
		//
		await this._completeBuild({ style: templset.styles });
	}

	protected _hideAllComments(): void {
		this._mapOpenedPopovers.forEach(($popover, id) => {
			$popover.popover("hide");
		});
	}


	/** @override */
	protected _onPageStateChanged(page: UIBase.IBookPage, args: UIBase.TNavableStateChangedArgs): void {
		switch (args.stateNew) {
			case UIBase.NavableStates.Displayed: {
				if (this._state === UIBase.ControlStates.Init) {
					if (this._maths && this._maths.length > 0) {
						try {
							for (let i = 0; i < this._maths.length; i++) {
								let elemMath = this._maths[i];
								if (elemMath instanceof HTMLElement) {
									let hteMath = <HTMLElement>elemMath;
									let hteEquation = <HTMLElement>hteMath.querySelector("#equation");
									//
									let strTeX = hteEquation.innerText.trim();
									hteEquation.dataset.rawinfo = "TeX: " + strTeX;
									// formulas are rendered asynchronously
									EquationProvider.convertTeX2Svg(strTeX, hteMath).then((res: any) => {
										if (res instanceof Node) {
											let nodeRes = (res as Node);
											if (nodeRes.firstChild && nodeRes.firstChild.nodeName === "svg") {
												let svg = nodeRes.firstChild;
												(svg.parentNode as Node).removeChild(svg);
												hteEquation.innerHTML = "";
												(svg as Element).id = "visualcontent";
												hteEquation.appendChild(svg);
												//
												hteMath.classList.add("actual");
											}
										}
										//
										this._nDoneCounter++;
										if (this._maths && this._nDoneCounter >= this._maths.length) {
											this._changeState(UIBase.ControlStates.Work);
										}
										//
									}, (err) => {
										App.logError(err);
									});
								}
							}
						} catch (err) {
							App.logError(err);
							this._changeState(UIBase.ControlStates.Work); // ???
						}
					} else {
						this._changeState(UIBase.ControlStates.Work);
					}
				}
				//
				break;
			}
			case UIBase.NavableStates.Outgoing: {
				this._hideAllComments();
				break;
			}
		} // switch
	}

	protected _onMathClick(ev: Event): void {
		let hteEqu = ev.currentTarget as HTMLElement;
		if (this._ctrModal && hteEqu) {
			let hteVisualContent = hteEqu.querySelector("#visualcontent");
			if (hteVisualContent) {
				ev.preventDefault();
				//
				let hteVisualContentClone = hteVisualContent.cloneNode(true) as HTMLElement;
				this._ctrModal.setContent(hteEqu, hteVisualContentClone, hteEqu.dataset.rawinfo);
				this._page.showModal(this._ctrModal, { frame: "bg-white30" });
			}
		}
	}

	protected _onCommentClick(ev: Event): void {
		let hteTarget = <HTMLElement>ev.currentTarget;
		let key = hteTarget.dataset.key as string;
		let $target = this._mapOpenedPopovers.get(key);
		if (!$target) {
			$target = $(hteTarget);
			this._mapOpenedPopovers.set(key, $target);
			$target.popover({ html: true });
		}
		//
		$target.popover("toggle");
		//
		if ($target.is(":visible")) {
			ev.stopImmediatePropagation();
			App.doc.addEventListener("click", this._fOutsideClickHandler);
		}
	}

	private _onDocumentClick(ev: Event): void {
		App.doc.removeEventListener("click", this._fOutsideClickHandler);
		this._hideAllComments();
	}

} // class MathBox

