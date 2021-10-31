import { IBookFrame, TBookEventArgs } from "../../../engine/system/common/uibase.js";
import { EventNest } from "../../../engine/system/runtime/event.js";
import { App } from "../../../engine/system/runtime/app.js";
//

enum MainStates {
	Undef,
	Init,
	Work
}


export abstract class EquationProvider {
	/* Class Variables and Constants
	----------------------------------------------------------*/
	private static _scriptTeX2Svg: HTMLScriptElement | null = null;
	private static _objMathJax: any;
	private static _eventWorkState: EventNest<void> = new EventNest<void>(null);
	//

	/* Public Members
	----------------------------------------------------------*/

	public static async convertTeX2Svg(strSrc: string, hteOutput: HTMLElement, bOptionsDisplay: boolean = true): Promise<any> {
		if (this._state === MainStates.Undef) {
			this._changeState(MainStates.Init);

			let objMathJax: any;

			let book = App.mainview.getActiveBook();
			if (book && book.frame) {
				objMathJax = await this._makeMathJaxObject(book.frame);
			}

			if (objMathJax) {
				this._objMathJax = App.getGlobalVar("MathJax");
				this._objMathJax.startup.document.updateDocument();
				this._changeState(MainStates.Work);
			} else {
				this._changeState(MainStates.Undef);
				return null; // ???
			}
		}

		if (this._state === MainStates.Init) {
			await this._waitWorkState();
		}

		if (this._state === MainStates.Work) {
			let res = await this._doTeX2Svg(this._objMathJax, strSrc, hteOutput, bOptionsDisplay);
			return res;
		}
		//
		return null;
	}


	/* Internal Event Handlers
	----------------------------------------------------------*/

	private static _onBookClosed = (sender: any, args: TBookEventArgs): void => {
		EquationProvider._changeState(MainStates.Undef);
	}


	/* Internal Members
	----------------------------------------------------------*/

	private static async _doTeX2Svg(objMathJax: any, strSrc: string, hteOutput: HTMLElement, bOptionsDisplay: boolean = true): Promise<any> {
		let options = objMathJax.getMetricsFor(hteOutput);
		options.display = bOptionsDisplay;
		options.scale = 1.0;
		//
		return await objMathJax.tex2svgPromise(strSrc, options);
	}

	private static async _makeMathJaxObject(bookframe: IBookFrame): Promise<any> {
		(<any>App.wnd).MathJax = {
			startup: {
				typeset: false,
				document: "" // prevents adding special styles to the <head> element (styles will be added manually)
			}
		};
		//
		EquationProvider._scriptTeX2Svg = await bookframe.loadScript("tex2svg", App.makeThirdPartyPath("mathjax/tex-svg.js"));
		return App.getGlobalVar("MathJax");
	}

	private static _waitWorkState(): Promise<void> {
		return new Promise<void>((resolve: any) => {
			this._eventWorkState.subscribe((sender: any, args: void) => {
				resolve();
			});
		});
	}

	private static _reset(): void {
		App.deleteGlobalVar("MathJax");
		//
		this._objMathJax = null;
		this._scriptTeX2Svg = null;
		//
		App.mainview.eventBookClosed.unsubscribe(this._onBookClosed);
	}


	/* State Machine
	----------------------------------------------------------*/

	private static _state: MainStates = MainStates.Undef;

	public static get state(): MainStates {
		return this._state;
	}

	private static _setState(stateNew: MainStates) {
		this._state = stateNew;
	}

	protected static _changeState(stateNew: MainStates): void {
		if (this.state === stateNew) { return; }
		//
		const stateOld: MainStates = this.state;
		this._setState(stateNew);
		//
		const stateNow = this.state;
		switch (stateNow) {
			case MainStates.Undef: {
				this._reset();
				break;
			}
			case MainStates.Init: {
				this._reset();
				App.mainview.eventBookClosed.subscribe(this._onBookClosed);
				break;
			}
			case MainStates.Work: {
				this._eventWorkState.raise();
				this._eventWorkState.resetHandlers();
				break;
			}
		} // switch (stateNow)
	}

} // class EquationProvider

