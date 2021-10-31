import * as UIBase from "../../system/common/uibase.js";
//

/*
	Grigory. Эти классы плохо продуманы и сделаны фактически наспех.
*/

export class PageTransAnimation {
	/* Class Variables and Constants
	----------------------------------------------------------*/
	protected _page: UIBase.INavablePage;
	protected _selector?: string;
	protected _hteTarget?: HTMLElement | null;
	protected _nDelay: number;

	constructor(page: UIBase.INavablePage, params: any) {
		this._page = page;
		this._page.eventStateChanged.subscribe(this._onPageStateChanged.bind(this));
		//
		if (params.selector) {
			this._selector = params.selector;
		}
		if (params.delay) {
			this._nDelay = params.delay;
		} else {
			this._nDelay = 0;
		}
	}


	/* Public Members
	----------------------------------------------------------*/

	public forceStart(delay: number = 0): void {
		this._nDelay = delay;
		this._animate();
	}


	/* Internal Members
	----------------------------------------------------------*/
	/** @virtual */
	protected _animate(): void { /**/ }


	/* Event Handlers
	----------------------------------------------------------*/

	/** @virtual */
	protected _onPageStateChanged(sender: any, args: UIBase.TNavableStateChangedArgs): void { /**/ }

} // class PageTransAnimation


enum AppearenceCssClasses {
	Init = "page-enter-init",
	Action = "page-enter-action",
	Finish = "page-enter-finish"
}


export class AppearencePageAnim extends PageTransAnimation {
	//
	private _bFirstEnter: boolean;

	/* Construction / Initialization / Desctruction
	----------------------------------------------------------*/

	constructor(page: UIBase.INavablePage, params: any) {
		super(page, params);
		//
		this._bFirstEnter = true;
	}


	/* Public Members
	----------------------------------------------------------*/



	/* Internal Members
	----------------------------------------------------------*/

	/** @virtual */
	protected _animate(): void {
		// Здесь всё несколько накручено, возможно надо оптимизировать код
		// (потом посмотрим)

		if (this._nDelay < 0) {
			this._nDelay = 0;
		}
		//
		setTimeout(() => {
			if (this._page.state === UIBase.NavableStates.Displayed) {
				(this._hteTarget as HTMLElement).classList.add(AppearenceCssClasses.Action);
				(this._hteTarget as HTMLElement).classList.remove(AppearenceCssClasses.Init);
				this._bFirstEnter = false;
			}
		}, this._nDelay);
	}


	/* Event Handlers
	----------------------------------------------------------*/

	/** @override */
	protected _onPageStateChanged(sender: any, args: UIBase.TNavableStateChangedArgs): void {
		switch (args.stateNew) {
			case UIBase.NavableStates.Invisible: {
				if (args.stateOld === UIBase.NavableStates.Preparing) {
					// the page already has a presenter
					this._hteTarget = (this._selector) ? <HTMLElement>this._page.presenter.querySelector(this._selector) : this._page.presenter;
					if (this._hteTarget) {
						this._hteTarget.classList.add(AppearenceCssClasses.Init);
					}
				}
				break;
			}
			case UIBase.NavableStates.Displaying: {
				if (!this._bFirstEnter) {
					if (this._hteTarget) {
						this._hteTarget.classList.remove(AppearenceCssClasses.Init, AppearenceCssClasses.Action);
						this._hteTarget.classList.add(AppearenceCssClasses.Finish);
					}
				}
				break;
			}
			case UIBase.NavableStates.Displayed: {
				if (this._nDelay >= 0 && this._bFirstEnter) {
					this._animate();
				}
				break;
			}
		} // switch
	}

} // class AppearencePageAnim


export abstract class PageAnimationProvider {
	public static provide(page: UIBase.INavablePage, params: any): PageTransAnimation | null {
		let anim: PageTransAnimation | null = null;

		if (params && params.name) {
			switch (params.name) {
				case "appearance": {
					anim = new AppearencePageAnim(page, params);
					break;
				}
			}
		}
		//
		return anim;
	}
}
