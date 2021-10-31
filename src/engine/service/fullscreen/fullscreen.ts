/*
	MDN Fullscreen API
	https://developer.mozilla.org/en-US/docs/Web/API/Fullscreen_API

	Пример проекта из MDN
	https://glitch.com/edit/#!/fullscreen-requestfullscreen-demo?path=README.md%3A1%3A0

*/

export abstract class FullScreenToggler {
	// Class Variables and Constants
	// -------------------------------------------------------------------
	private static _theDoc: Document = document;
	private static _doc: any = document;
	private static _elemFullScreen?: HTMLElement = undefined;
	private static _eventChanged: Event = new Event("fullscreentoggled");
	private static _eventError: Event = new Event("fullscreenfailed");
	//

	// Initialization
	// -------------------------------------------------------------------

	public static init(doc?: Document): void {
		if (doc) {
			this._theDoc = doc;
			this._doc = doc;
		}
		//
		this._theDoc.addEventListener("fullscreenchange", this._onFullScreenChange.bind(this), false);
		document.addEventListener("fullscreenerror", this._onFullScreenError.bind(this), false);

		document.addEventListener("mozfullscreenchange", this._onFullScreenChange.bind(this), false);
		document.addEventListener("mozfullscreenerror", this._onFullScreenError.bind(this), false);

		document.addEventListener("webkitfullscreenchange", this._onFullScreenChange.bind(this), false);
		document.addEventListener("webkitfullscreenerror", this._onFullScreenError.bind(this), false);
	}


	// Public Members
	// -------------------------------------------------------------------

	public static isFullScreenEnabled(): boolean {
		return (this._doc.fullscreenEnabled || this._doc.mozFullScreenEnabled || this._doc.webkitFullscreenEnabled);
	}

	public static get isFullScreen(): boolean {
		return !!this.getFullScreenElement();
	}

	public static getFullScreenElement(): HTMLElement {
		return (this._doc.fullscreenElement || this._doc.mozFullScreenElement || this._doc.webkitFullscreenElement);
	}


	public static doFullScreen(hteFullScreen: HTMLElement): void {
		if (this._elemFullScreen) {
			return;
		}
		//  
		this._elemFullScreen = hteFullScreen;
		let fse: any = hteFullScreen;
		let rqs: any;

		if (fse.requestFullscreen) {
			rqs = fse.requestFullscreen;
		} else if (fse.mozRequestFullScreen) {
			rqs = fse.mozRequestFullScreen;
		} else if (fse.webkitRequestFullscreen) {
			rqs = fse.webkitRequestFullscreen;
		}
		//
		if (rqs) {
			rqs.call(fse);
		}
	}

	public static cancelFullScreen(): void {
		if (this._doc.cancelFullScreen) {
			this._doc.cancelFullScreen();
		} else if (this._doc.mozCancelFullScreen) {
			this._doc.mozCancelFullScreen();
		} else if (this._doc.webkitCancelFullScreen) {
			this._doc.webkitCancelFullScreen();
		}
	}

	// Event Handlers
	// -------------------------------------------------------------------
	
	private static _onFullScreenChange(): void {
		let elemCurrent: HTMLElement = this.getFullScreenElement();

		if (elemCurrent) {
			elemCurrent.dispatchEvent(this._eventChanged);
		} else {

			if (this._elemFullScreen) {
				this._elemFullScreen.dispatchEvent(this._eventChanged);
			}
		}
		//
		this._elemFullScreen = elemCurrent;
	}

	private static _onFullScreenError(): void {
		if (this._elemFullScreen) {
			this._elemFullScreen.dispatchEvent(this._eventError);
		}
		//
		this._elemFullScreen = undefined;
	}

} // class FullScreenToggler
