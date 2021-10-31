import { Helper } from "../../service/aid/aid.js";
import * as UIBase from "../../system/common/uibase.js";
//

/*
	Grigory. Очень слабо продуманный и проработанный раздел.
*/

enum AttractionStates {
	None,
	Delay,
	Preparing,
	Attraction,
	Stopping
}

class Attractable {
	/* Class Variables and Constants
	----------------------------------------------------------*/
	protected _scope: HTMLElement;
	protected _target: HTMLElement;
	protected _pointer?: HTMLElement;

	protected _strStrokeColor: string;
	protected _strFillColor: string;

	protected _cssBeginClass?: string;


	/* Construction / Initialization / Desctruction
	----------------------------------------------------------*/

	constructor(scope: HTMLElement, target: HTMLElement) {
		this._scope = scope;
		this._target = target;
		//
		const style: CSSStyleDeclaration = window.getComputedStyle(target, ":after");
		this._strStrokeColor = style.color;
		this._strFillColor = style.backgroundColor;
	}


	/* Public Members
	----------------------------------------------------------*/

	public beginAttraction(nDelay?: number, nDuration?: number): void {
		if (this._state === AttractionStates.None && this._pointer && this._cssBeginClass && nDuration !== 0) {
			if (nDelay && nDelay > 0) {
				this._changeState(AttractionStates.Delay);
				setTimeout((nDurationParam: number) => {
					if (this.state === AttractionStates.Delay) {
						this._startPreparing(nDurationParam);
					}
				}, nDelay, nDuration);
			} else {
				this._startPreparing(nDuration);
			}
		}
	}

	public endAttraction(): void {
		if (this._pointer) {
			switch (this._state) {
				case AttractionStates.Delay:
				case AttractionStates.Preparing: {
					this._stop();
					break;
				}
				case AttractionStates.Attraction: {
					this._stop();
					break;
				}
			}
		}
	}


	/* Internal Members
	----------------------------------------------------------*/

	protected _regPointer(path: string, cssBeginClass: string): void {
		this._cssBeginClass = cssBeginClass;
		//
		let pointer: HTMLElement = document.createElement("div");
		pointer.classList.add("tool-pointer", "sys-attract-fill");
		//
		this._pointer = pointer;
		this._scope.appendChild(this._pointer);
		//
		/*
		РАБОТАЕМ ЗДЕСЬ !!! 
		возможно надо перехв. и др. события н-р cancel !!!
		*/
		this._pointer.addEventListener("animationend", () => {
			if (this._state === AttractionStates.Stopping) {
				this._stop();
			}
		});
		this._pointer.addEventListener("transitionend", (ev: TransitionEvent) => {
			if (this._state === AttractionStates.Stopping) {
				this._stop();
			}
		});
	}

	protected _startPreparing(nDuration?: number): void {
		if (this._pointer && this._cssBeginClass) {
			this._changeState(AttractionStates.Preparing);
			this._doPosition();
			//
			this._pointer.classList.add(this._cssBeginClass);
			this._changeState(AttractionStates.Attraction);
			//
			if (nDuration && nDuration > 0) {
				setTimeout(this._stopByTimer.bind(this), nDuration);
			}
		}

	}

	/** @virtual */
	protected _doPosition(): void {
		//
	}

	private _stopByTimer(): void {
		this.endAttraction();
	}

	private _stop(): void {
		this._changeState(AttractionStates.None);
	}

	/* Event Handlers
	----------------------------------------------------------*/



	/* State Machine
	----------------------------------------------------------*/

	protected _state: AttractionStates = AttractionStates.None;

	public get state(): AttractionStates {
		return this._state;
	}

	public set state(stateNew: AttractionStates) {
		this._state = stateNew;
	}

	private _changeState(stateNew: AttractionStates): void {
		if (this.state === stateNew) { return; }
		//
		const stateOld: AttractionStates = this.state;
		this.state = stateNew;
		//
		const stateNow = this.state;
		switch (stateNow) {
			case AttractionStates.None: {
				if (stateOld === AttractionStates.Attraction) {
					if (this._pointer) {
						if (this._cssBeginClass) {
							this._pointer.classList.remove(this._cssBeginClass);
							this._pointer.classList.remove("attracting");
						}
					}
				}
				break;
			}
			case AttractionStates.Delay: {
				break;
			}
			case AttractionStates.Preparing: {
				break;
			}
			case AttractionStates.Attraction: {
				if (this._pointer && this._cssBeginClass) {
					this._pointer.classList.add(this._cssBeginClass);
					this._pointer.classList.add("attracting");
				}
				break;
			}
		}
	}

} // class AttractionTool


class AttractArrow extends Attractable {
	/* Class Variables and Constants
	----------------------------------------------------------*/
	private _enumSide?: UIBase.Sides;
	//

	/* Construction / Initialization / Desctruction
	----------------------------------------------------------*/

	constructor(scope: HTMLElement, target: HTMLElement) {
		super(scope, target);
		//
		let side: string = (target.dataset.side) ? target.dataset.side : "top";
		this._enumSide = Helper.parseEnum(side, UIBase.Sides);

		let pathPointerFile: string | null = null;
		let cssBeginClass: string | null = null;

		switch (this._enumSide) {
			case UIBase.Sides.Left: {
				pathPointerFile = "./_assets/images/tool/attract/arrow-fat-r.svg";
				cssBeginClass = "point-right";
				break;
			}
			case UIBase.Sides.Right: {
				pathPointerFile = "./_assets/images/tool/attract/arrow-fat-l.svg";
				cssBeginClass = "point-left";
				break;
			}
			case UIBase.Sides.Top: {
				pathPointerFile = "./_assets/images/tool/attract/arrow-fat-d.svg";
				cssBeginClass = "point-down";
				break;
			}
		}
		//
		if (pathPointerFile && cssBeginClass) {
			this._regPointer(pathPointerFile, cssBeginClass);
		}
	}


	/* Infrastructure
	----------------------------------------------------------*/



	/* Public Members
	----------------------------------------------------------*/



	/* Public Events
	----------------------------------------------------------*/



	/* Internal Members
	----------------------------------------------------------*/

	/** @override */
	protected _doPosition(): void {
		switch (this._enumSide) {
			case UIBase.Sides.Left: {
				this._positionLeftSide();
				break;
			}
			case UIBase.Sides.Right: {
				this._positionRightSide();
				break;
			}
			case UIBase.Sides.Top: {
				this._positionTopSide();
				break;
			}

		} // switch
	}

	private _positionLeftSide(): void {
		if (this._pointer) {
			//
			// Координаты всех участников относительно Document
			// 
			let rectScope: DOMRect = this._scope.getBoundingClientRect();
			let rectPointer: DOMRect = this._pointer.getBoundingClientRect();
			let rectTarget: DOMRect = this._target.getBoundingClientRect();

			//
			// Координаты _pointer и _target относительно _scope
			// 
			rectPointer = new DOMRect(rectPointer.x - rectScope.x, rectPointer.y - rectScope.y, rectPointer.width, rectPointer.height);
			rectTarget = new DOMRect(rectTarget.x - rectScope.x, rectTarget.y - rectScope.y, rectTarget.width, rectTarget.height);

			let nPointerLeft = (rectTarget.left - rectPointer.width);
			let nPointerTop = rectTarget.top + ((rectTarget.height - rectPointer.height) / 2);

			this._pointer.style.left = nPointerLeft.toString() + "px";
			this._pointer.style.top = nPointerTop.toString() + "px";
		}
	}

	private _positionRightSide(): void {
		if (this._pointer) {
			//
			// Координаты всех участников относительно Document
			// 
			let rectScope: DOMRect = this._scope.getBoundingClientRect();
			let rectPointer: DOMRect = this._pointer.getBoundingClientRect();
			let rectTarget: DOMRect = this._target.getBoundingClientRect();

			//
			// Координаты _pointer и _target относительно _scope
			// 
			rectPointer = new DOMRect(rectPointer.x - rectScope.x, rectPointer.y - rectScope.y, rectPointer.width, rectPointer.height);
			rectTarget = new DOMRect(rectTarget.x - rectScope.x, rectTarget.y - rectScope.y, rectTarget.width, rectTarget.height);

			let nPointerLeft = rectTarget.right;
			let nPointerTop = rectTarget.top + ((rectTarget.height - rectPointer.height) / 2);

			this._pointer.style.left = nPointerLeft.toString() + "px";
			this._pointer.style.top = nPointerTop.toString() + "px";
		}
	}

	private _positionTopSide(): void {
		if (this._pointer) {
			//
			// Координаты всех участников относительно Document
			// 
			let rectScope: DOMRect = this._scope.getBoundingClientRect();
			let rectPointer: DOMRect = this._pointer.getBoundingClientRect();
			let rectTarget: DOMRect = this._target.getBoundingClientRect();

			//
			// Координаты _pointer и _target относительно _scope
			// 
			rectPointer = new DOMRect(rectPointer.x - rectScope.x, rectPointer.y - rectScope.y, rectPointer.width, rectPointer.height);
			rectTarget = new DOMRect(rectTarget.x - rectScope.x, rectTarget.y - rectScope.y, rectTarget.width, rectTarget.height);

			let nPointerLeft = rectTarget.left + ((rectTarget.width - rectPointer.width) / 2);
			let nPointerTop = rectTarget.top - rectPointer.height;

			this._pointer.style.left = nPointerLeft.toString() + "px";
			this._pointer.style.top = nPointerTop.toString() + "px";
		}
	}

	private _positionBottomSide(): void {
		//
	}


	/* Event Handlers
	----------------------------------------------------------*/



	/* State Machine
	----------------------------------------------------------*/


}

type TAttractableMap = Map<string, Attractable>;

export class AttractionTool {
	/* Class Variables and Constants
	----------------------------------------------------------*/
	private _scope?: HTMLElement;
	private _mapAttractable: TAttractableMap;
	//

	/* Construction / Initialization / Desctruction
	----------------------------------------------------------*/

	constructor() {
		this._mapAttractable = new Map<string, Attractable>();
	}


	/* Public Members
	----------------------------------------------------------*/

	public processScope(scope: HTMLElement): void {
		let attractables = scope.querySelectorAll("[data-attract]");
		for (let i = 0; i < attractables.length; i++) {
			let target = <HTMLElement>attractables[i];
			if (target.id) {
				switch (target.dataset.attract) {
					case "arrow": {
						let attractArrow = new AttractArrow(scope, target);
						this._mapAttractable.set(target.id, attractArrow);
						break;
					}
					// других пока нет
				}
			}
		} // for

	}

	public attract(id: string, nDelay: number, nDuration?: number): void {
		let attractable = this._mapAttractable.get(id);
		if (attractable) {
			attractable.beginAttraction(nDelay, nDuration);
		}
	}

	public stop(id: string): void {
		let attractable = this._mapAttractable.get(id);
		if (attractable) {
			attractable.endAttraction();
		}
	}

	public stopAll(): void {
		// setTimeout(() => {
		this._mapAttractable.forEach((value: Attractable, key: string) => {
			value.endAttraction();
		});
		// }, 0);
	}


	/* Public Events
	----------------------------------------------------------*/



	/* Internal Members
	----------------------------------------------------------*/



	/* Event Handlers
	----------------------------------------------------------*/



	/* State Machine
	----------------------------------------------------------*/



} // class AttractionTool

