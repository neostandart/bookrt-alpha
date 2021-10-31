import { EventNest } from "../../system/runtime/event.js";
import * as UIBase from "../../system/common/uibase.js";
import { App } from "../../system/runtime/app.js";
import { Helper } from "../../service/aid/aid.js";
//

/*
	Implementation of the mechanism for navigating through the pages of a VMBook.
*/

// Animation Support

enum AnimEvents {
	End = "animationend"
}

enum TransEvents {
	End = "transitionend"
}

enum TranCssClasses {
	Outcoming = "anim-page-outcoming",
	Incoming = "anim-page-inсoming",
	Current = "current",

	MoveToLeft = "anim-page-toleft",
	MoveFromLeft = "anim-page-fromleft",
	MoveToRight = "anim-page-toright",
	MoveFromRight = "anim-page-fromright"
}


abstract class TransAnimation {
	public static transition(pageOut: UIBase.INavablePage, pageIn: UIBase.INavablePage): Promise<any> {
		return new Promise<any>((handlComplete: any) => {
			let strOutAnimClass: string = "";
			let strInAnimClass: string = "";
			let eDirection = (pageIn.index > pageOut.index) ? UIBase.TransDirections.Left : UIBase.TransDirections.Right;
			//
			switch (eDirection) {
				case UIBase.TransDirections.Left: {
					strOutAnimClass = TranCssClasses.MoveToLeft;
					strInAnimClass = TranCssClasses.MoveFromRight;
					break;
				}
				case UIBase.TransDirections.Right: {
					strOutAnimClass = TranCssClasses.MoveToRight;
					strInAnimClass = TranCssClasses.MoveFromLeft;
					break;
				}
			}
			//
			//
			setTimeout(() => {
				let bOutDone: boolean = false;
				let bInDone: boolean = false;

				//
				// Preparing Out 
				//
				let fOutFinished = () => {
					pageOut.presenter.removeEventListener(AnimEvents.End, fOutFinished);
					bOutDone = true;
					pageOut.presenter.classList.remove(strOutAnimClass, TranCssClasses.Current);
					onEndAnimation();
				};
				//
				pageOut.presenter.addEventListener(AnimEvents.End, fOutFinished);

				//
				// Preparing In
				//
				let fInFinished = () => {
					pageIn.presenter.removeEventListener(AnimEvents.End, fInFinished);
					bInDone = true;
					pageIn.presenter.classList.remove(strInAnimClass);
					onEndAnimation();
				};
				//
				pageIn.presenter.addEventListener(AnimEvents.End, fInFinished);

				//
				// Begin Animation
				//
				pageOut.presenter.classList.add(strOutAnimClass);
				pageIn.presenter.classList.add(strInAnimClass, TranCssClasses.Current);
				//
				// 
				function onEndAnimation() {
					if (bOutDone && bInDone) {
						handlComplete();
					}
				}
			}, 50);
		});
	}

	public static enterPage(presenterOut: HTMLElement, presenterIn: HTMLElement): Promise<any> {
		return new Promise<any>((handlComplete: any) => {
			let bOutDone: boolean = false;
			let bInDone: boolean = false;

			//
			// Preparing Out 
			//
			let fOutFinished = () => {
				presenterOut.removeEventListener(AnimEvents.End, fOutFinished);
				//
				bOutDone = true;
				presenterOut.classList.remove(TranCssClasses.Outcoming, TranCssClasses.Current);
				__onEndAnimation();
			};
			presenterOut.addEventListener(AnimEvents.End, fOutFinished);

			//
			// Preparing In
			//
			let fInFinished = () => {
				presenterIn.removeEventListener(AnimEvents.End, fInFinished);
				//
				bInDone = true;
				presenterIn.classList.remove(TranCssClasses.Incoming);
				__onEndAnimation();
			};
			presenterIn.addEventListener(AnimEvents.End, fInFinished);

			//
			// Begin Animation
			//
			presenterOut.classList.add(TranCssClasses.Outcoming);
			presenterIn.classList.add(TranCssClasses.Current, TranCssClasses.Incoming);
			//
			// 
			function __onEndAnimation() {
				if (bOutDone && bInDone) {
					handlComplete();
				}
			}
		});
	}

} // class TransAnimation

// =====================================================================

type TPageCache = Record<string, UIBase.INavablePage>;


export class BookPageHost {
	//  Class Variables and Constants
	// -------------------------------------------------------------------
	private _presenter: HTMLElement;
	private _cacheForevers: TPageCache; // отсюда могут быть удалены

	private _pageIncoming: UIBase.INavablePage | null = null;
	private _pageWaiting: UIBase.INavablePage | null = null;
	private _pageCandidate: UIBase.INavablePage | null = null;
	private _pageCurrent: UIBase.INavablePage | null = null;
	private _bPageTransition: boolean = false;
	private _hteTransIndicator: HTMLElement;


	private _eventPageChanging: EventNest<UIBase.PageNavArgs>;
	private _eventPageChanged: EventNest<UIBase.PageNavArgs>;


	// Construction / Initialization
	// -------------------------------------------------------------------

	constructor(presenter: HTMLElement) {
		this._presenter = presenter;
		//
		this._cacheForevers = {};
		this._eventPageChanging = new EventNest<UIBase.PageNavArgs>(this);
		this._eventPageChanged = new EventNest<UIBase.PageNavArgs>(this);
		//
		// Transition Indicator
		this._hteTransIndicator = App.doc.createElement("div");
		this._hteTransIndicator.classList.add("trans-indicator");
		let hteIndicatorSign = App.doc.createElement("div");
		hteIndicatorSign.classList.add("trans-indicator-sign", "anim-blink-norm");
		this._hteTransIndicator.appendChild(hteIndicatorSign);
		this._hteTransIndicator.addEventListener("transitionend", (ev) => {
			const style: CSSStyleDeclaration = App.wnd.getComputedStyle(<HTMLElement>ev.currentTarget, "opacity");
			if (style.opacity === "0") {
				this._hteTransIndicator.style.display = "none";
			}
		});
		this._presenter.appendChild(this._hteTransIndicator);
	}


	// Infrastructure
	// -------------------------------------------------------------------

	public updateLayout(): void {
		if (this._pageCurrent) {
			this._pageCurrent.updateLayout();
		}
	}


	// Public Members
	// -------------------------------------------------------------------

	public get current(): UIBase.INavablePage | null {
		return this._pageCurrent;
	}

	public equalCurrent(page: UIBase.INavablePage): boolean {
		return page.equal(this._pageCurrent);
	}

	public navigate(pageIncoming: UIBase.INavablePage): void {
		if (
			(pageIncoming.state !== UIBase.NavableStates.Initial &&
				pageIncoming.state !== UIBase.NavableStates.Invisible) ||
			pageIncoming.equal(this._pageCurrent) ||
			(pageIncoming.equal(this._pageIncoming)) ||
			(pageIncoming.equal(this._pageWaiting)) ||
			(pageIncoming.equal(this._pageCandidate))
		) {
			return;
		}

		// Проверка "_pageCurrent" нужна чтобы искл. появ. индикатора при перех. на перв. страницу
		if (this._pageCurrent && !pageIncoming.isProcessed) { this._showTransition(); }
		this._eventPageChanging.raise({ pageNew: pageIncoming, pageOld: this.current });

		// Если уже есть Incoming - то тут кто вперёд будет готов (ф. readyNavigation)
		this._pageIncoming = pageIncoming;
		pageIncoming.readyNavigation().then((pageReady) => {
			// assert(pageReady.state === UIBase.NavableStates.Invisible)
			if (pageReady.state !== UIBase.NavableStates.Invisible) {
				App.logWarning(".Assert(pageReady.state !== UIBase.NavableStates.Invisible) | pageReady.state=" + pageReady.state + ".", Helper.getObjectName(this));
			}

			if (pageReady === this._pageIncoming) {
				this._pageIncoming = null;
				this._putInWaitingQueue(pageReady);
			} else {
				// другая страница опередила
				pageReady.notifyRejection();
			}
		});
	}

	/** Для книги (VMBook) эта функция никогда не будет использована, 
	 * поскольку из книги не могут удаляться страницы.
	 * Такое возможно только при обработке страниц приложения. В приложении
	 * страницы интерфейса могут динамически добавляться и удаляться 
	 */
	public discardPage(page: UIBase.INavablePage, pageNext: UIBase.INavablePage): void {
		// текущая ли страница? если да, то всё просто - переводим в Transit и уходим с неё на pageNext
		// а если нет - тут посложнее - надо с имитировать уход.
		page.forceLifeMode(UIBase.PageLifeKinds.Transit);
		if (this.equalCurrent(page)) {
			this.navigate(pageNext);
		} else {
			// страница не текущая, скорее всего книга которую закрывают с навигационной панели
			this._releasePage(page);
		}
	}

	// Public Events
	// -------------------------------------------------------------------

	public get eventPageChanging(): EventNest<UIBase.PageNavArgs> {
		return this._eventPageChanging;
	}

	public get eventPageChanged(): EventNest<UIBase.PageNavArgs> {
		return this._eventPageChanged;
	}


	// Internal Members
	// -------------------------------------------------------------------
	
	private _putInWaitingQueue(pageWaiting: UIBase.INavablePage): void {
		// здесь уже presenter у pageWaiting гарантированно есть!
		if (this._cacheForevers[pageWaiting.index]) {
			// это отдельный случай
			this._pageWaiting = null;
			this._assignCandidate(pageWaiting);
		} else {
			this._pageWaiting = pageWaiting;
			if (pageWaiting.life === UIBase.PageLifeKinds.Forever) {
				this._cacheForevers[pageWaiting.index] = pageWaiting;
			}
			//
			this._presenter.appendChild(pageWaiting.presenter);
			pageWaiting.notifyAttached().then((pageReady) => {
				if (pageReady === this._pageWaiting) {
					this._pageWaiting = null;
					this._assignCandidate(pageReady);
				} else {
					// кто-то опередил :=(
					if (pageWaiting.life !== UIBase.PageLifeKinds.Forever) {
						this._presenter.removeChild(pageReady.presenter);
						pageReady.notifyDetached(); // может надо после notifyRejection() ?
					}
					pageReady.notifyRejection();
				}
			});
		}
	}

	private _assignCandidate(pageCandidate: UIBase.INavablePage): void {

		if (this._pageCandidate === pageCandidate) {
			// просто перестраховка :-( (такого не должно быть)
			App.logWarning("WARNING: (_assignCandidate) this._pageCandidate === pageCandidate.", Helper.getObjectName(this));
			return;
		}
		//
		if (this._pageCandidate) {
			// новый кандидат опередил предыдущего (возможно из-за перехода между страницами)
			this._pageCandidate.notifyRejection();
			this._pageCandidate = null;
		}
		//
		if (!this._bPageTransition) {
			this._display(pageCandidate);
		} else {
			this._pageCandidate = pageCandidate;
		}
	}

	private _display(pageIn: UIBase.INavablePage): void {
		this._bPageTransition = true;
		//
		// К этому моменту pageIn.presenter добавлен к _host
		const pageOut: UIBase.INavablePage | null = this._pageCurrent;
		this._pageCurrent = pageIn;
		//
		pageIn.eventProcessed.subscribe(this._fOnPageProcessed);
		if (pageOut) {
			pageOut.eventProcessed.unsubscribe(this._fOnPageProcessed);
		}
		//
		// Всё готово для начала анимации смены страниц
		//
		pageIn.notifyComing().then((/* не важно */) => {
			if (pageOut) {
				TransAnimation.transition(pageOut, pageIn).then(() => {
					pageIn.notifyDisplay();
					this._releasePage(pageOut);
					//
					this._eventPageChanged.raise({ pageNew: pageIn, pageOld: pageOut });
					//
					this._bPageTransition = false;
					this._checkCandidate();
				});
			} else {
				// нет предыдущей страницы, значит это первая страница Книги 
				pageIn.presenter.classList.add(TranCssClasses.Current);
				pageIn.notifyDisplay();
				//
				// оповещаем (кому это надо?)
				this._eventPageChanged.raise({ pageNew: pageIn, pageOld: null });
				//
				this._bPageTransition = false;
				this._checkCandidate();
			}
			//
			setTimeout(() => {
				if (pageIn.isProcessed) {
					this._hideTransition();
				}
			}, 10);
		});
	}

	private _releasePage(pageOutgoing: UIBase.INavablePage): void {
		// notifyOutgoing - ждём и если 
		pageOutgoing.notifyOutgoing().then((pageOut) => {
			if (pageOut.life !== UIBase.PageLifeKinds.Forever) {
				this._presenter.removeChild(pageOut.presenter);
				pageOut.notifyDetached();
				if (this._cacheForevers[pageOut.index]) {
					// The "forever" status could have been changed
					delete this._cacheForevers[pageOut.index]; // Is it correct to use the "delete" operator with the Record type?
				}
			}
			//
			pageOut.notifyHidden();
		});
	}

	private _checkCandidate(): void {
		setTimeout(() => {
			if (!this._bPageTransition && this._pageCandidate) {
				const pageCandidate: UIBase.INavablePage = this._pageCandidate;
				this._pageCandidate = null;
				this._display(pageCandidate);
			}
		}, 0);
	}

	//
	// Indication for Page transitions
	//

	protected _showTransition(): void {
		this._hteTransIndicator.style.display = "block";
		setTimeout(() => {
			this._hteTransIndicator.classList.add("display");
		}, 0);
	}

	protected _hideTransition(): void {
		this._hteTransIndicator.classList.remove("display");
	}

	protected _fOnPageProcessed = (sender: unknown, args: void) => {
		this._hideTransition();
	}

} // BookPageHost
