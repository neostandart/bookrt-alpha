import { Helper } from "../../service/aid/aid.js";
import { ErrorCase } from "../../system/runtime/error.js";
import { EventNest } from "../../system/runtime/event.js";
import * as UIBase from "../../system/common/uibase.js";
import * as Ctr from "../control/control.js";
import { App } from "../../system/runtime/app.js";
//

enum BkObjCategories {
	Element = "Element",
	Control = "Control",
	Activity = "Activity"
}


export class PageProcessor implements UIBase.IPageProcessor {
	/* Class Variables and Constants
	----------------------------------------------------------*/
	protected _page: UIBase.IBookPage;
	protected _cfgPage: UIBase.ParameterSet;
	protected _controls: UIBase.TControlMap;
	private _bEarlyProcessingDone: boolean;
	private _bLateProcessingDone: boolean;

	private _nDoneControlsCounter: number;
	private _fControlStateChangedHandler: (control: UIBase.IControlElement, args: UIBase.TControlStateChangedArgs) => void;
	//

	/* Construction / Initialization / Desctruction
	----------------------------------------------------------*/

	constructor(page: UIBase.IBookPage) {
		this._page = page;
		this._cfgPage = page.getCfg();
		this._controls = new Map<string, Ctr.UIControl>();
		this._bEarlyProcessingDone = false;
		this._bLateProcessingDone = false;
		this._nDoneControlsCounter = 0;
		this._fControlStateChangedHandler = this._onControlStateChanged.bind(this);
		this._eventStateChanged = new EventNest(this);

		this._page.eventStateChanged.subscribe((sender: any, args: UIBase.TNavableStateChangedArgs) => {
			this._onPageStateChanged(sender as UIBase.IBookPage, args);
		});

		this._page.eventPresenterReleased.subscribe(() => {
			this._bEarlyProcessingDone = false;
			this._bLateProcessingDone = false;
			//
			this._controls.forEach((value) => {
				value.dispose();
			});
			this._controls.clear();
			this._changeState(UIBase.PageProcessorStates.Init);
		});
	}


	/* Infrastructure
	----------------------------------------------------------*/

	protected async _provideControl(presenter: HTMLElement): Promise<UIBase.IControlElement> {
		let ctr: UIBase.IControlElement | null = null;
		//
		let strCtrName: string = presenter.dataset.control as string;
		if (strCtrName) { strCtrName = strCtrName.trim(); }
		if (strCtrName && strCtrName.length > 0) {
			let lib: UIBase.IExtLibrary | undefined;
			if (presenter.dataset.lib) {
				lib = App.libman.extlibs.get(presenter.dataset.lib);
			} else {
				for (let extlib of Array.from(App.libman.extlibs.values())) {
					if (extlib.factory.has(strCtrName)) {
						lib = extlib;
						break;
					}
				}
			}
			//
			if (lib) {
				ctr = await lib.factory.create(strCtrName, this._page, presenter);
			}
		}
		//
		if (!ctr) {
			throw new Error(`The control cannot be created! (ControlName=${strCtrName} | ${this._page.pubinfo}`);
		}
		//
		return ctr;
	}

	public async processBeforePageDisplay(): Promise<any> {
		if (!this._bEarlyProcessingDone) {
			this._changeState(UIBase.PageProcessorStates.Processing);
			//
			await this._processPage();
			this._forceReadyControls(UIBase.ControlStartPoints.BeforeAsync);
			await this._forceReadyControls(UIBase.ControlStartPoints.BeforeSync);
			this._bEarlyProcessingDone = true;
		}
	}

	public async processAfterPageDisplay(): Promise<any> {
		if (!this._bLateProcessingDone) {
			this._forceReadyControls(UIBase.ControlStartPoints.AfterAsync);
			await this._forceReadyControls(UIBase.ControlStartPoints.AfterSync);
			this._bLateProcessingDone = true;
		}
	}


	/* Public Members
	----------------------------------------------------------*/

	public get isProcessPhase(): boolean {
		return (this.state === UIBase.PageProcessorStates.Init || this.state === UIBase.PageProcessorStates.Processing);
	}

	public get isEarlyProcessingDone(): boolean {
		return this._bEarlyProcessingDone;
	}

	public get isLateProcessingDone(): boolean {
		return this._bLateProcessingDone;
	}

	public get controls(): UIBase.TControlMap {
		return this._controls;
	}

	// 

	public async createControl(hteMarkupItem: HTMLElement): Promise<UIBase.IControlElement | null> {
		let ctr: UIBase.IControlElement | null = null;
		//
		try {
			ctr = await this._provideControl(hteMarkupItem);
		} catch (err) {
			hteMarkupItem.innerHTML = "";
			hteMarkupItem.classList.add("errorbanner");
			hteMarkupItem.appendChild(new ErrorCase(err, undefined, PageProcessor.constructor.name).getView());
		}
		//
		return ctr;
	}

	public resolvePath(path: string): string {
		path = path.trim();
		if (Helper.startsWith(path, "http")) {
			// пока только "http" рассматривается как внешняя ссылка
			return path;
		}
		//
		path = this._page.book.resolveBookPath(path, this._page);
		return path;
	}

	public async processHTMLScope(hte: HTMLElement, mapControls?: UIBase.TControlMap): Promise<void> {
		const listMarkupItems = hte.querySelectorAll<HTMLElement>("[data-app], [data-control]");
		for (let i = 0; i < listMarkupItems.length; i++) {
			let hteMarkupItem = listMarkupItems[i];
			if (hteMarkupItem.dataset.control) {
				if (!hteMarkupItem.hasAttribute("data-constructed")) {
					let ctr = await this.createControl(hteMarkupItem);
					if (ctr) {
						await (ctr as Ctr.ControlElement).beReady();
						mapControls?.set(hteMarkupItem.id, ctr);
					}
				}
			} else if (hteMarkupItem.dataset.app) {
				this._processAppCfgProp(hteMarkupItem);
			}
		}
	}

	public resolveMarkupLinks(hte: HTMLElement): void {
		const listMarkupItems = hte.querySelectorAll<HTMLElement>("[href], [src], svg use");
		//
		for (let i = 0; i < listMarkupItems.length; i++) {
			let hteMarkupItem = listMarkupItems[i];
			if (!hteMarkupItem.hasAttribute("data-resolved")) {
				if (hteMarkupItem.hasAttribute("href")) {
					hteMarkupItem.setAttribute("href", this.resolvePath(<string>hteMarkupItem.getAttribute("href")));
					if (hteMarkupItem.tagName === "A") {
						hteMarkupItem.setAttribute("target", "_blank");
					}
					//
				} else if (hteMarkupItem.hasAttribute("src")) {
					hteMarkupItem.setAttribute("src", this.resolvePath(<string>hteMarkupItem.getAttribute("src")));
				} else if (hteMarkupItem.tagName === "use") {
					hteMarkupItem.setAttribute("xlink:href", this.resolvePath(<string>hteMarkupItem.getAttribute("xlink:href")));
				}
				//
				hteMarkupItem.dataset.resolved = "";
			}
		} // for
	}


	/* Public Events
	----------------------------------------------------------*/

	public get eventStateChanged(): EventNest<UIBase.TPageProcessorStateChangedArgs> {
		return this._eventStateChanged;
	}


	/* Internal Members
	----------------------------------------------------------*/

	private async _processPage(): Promise<void> {
		const listMarkupItems = this._page.presenter.querySelectorAll<HTMLElement>("[data-app], [data-prop], [data-control]");
		for (let i = 0; i < listMarkupItems.length; i++) {
			let hteMarkupItem = listMarkupItems[i];
			//
			if (hteMarkupItem.dataset.control) {
				// The (UI) Control
				let ctr = await this.createControl(hteMarkupItem);
				if (ctr) {
					this._controls.set(hteMarkupItem.id, ctr);
					ctr.eventStateChanged.subscribe(this._fControlStateChangedHandler);
				}
			} else if (hteMarkupItem.dataset.app) {
				// Value from appcfg.json
				this._processAppCfgProp(hteMarkupItem);
			} else if (hteMarkupItem.dataset.prop) {
				// Value from main.json (page property)
				this._processPageCfgProp(hteMarkupItem);
			}
		} // for
		//
		if (this._controls.size === 0) {
			this._changeState(UIBase.PageProcessorStates.Processed);
		}
	}

	private async _forceReadyControls(startpoint: UIBase.ControlStartPoints): Promise<any> {
		let promises: Promise<any>[] = [];
		for (let ctr of this._controls.values()) {
			if (ctr.startpoint === startpoint) {
				promises.push((<Ctr.ControlElement>ctr).beReady());
			}
		}
		//
		if (promises.length > 0) {
			switch (startpoint) {
				case UIBase.ControlStartPoints.BeforeSync:
				case UIBase.ControlStartPoints.AfterSync:
					{
						await Promise.all(promises);
						break;
					}
				case UIBase.ControlStartPoints.BeforeAsync:
				case UIBase.ControlStartPoints.AfterAsync: {
					Promise.all(promises); // ???
					break;
				}
			}
		}
	}

	private _processAppCfgProp(hteMarkupItem: HTMLElement): void {
		let strCfgPropName = hteMarkupItem.dataset.app as string;
		hteMarkupItem.innerHTML = App.appcfg.getString(strCfgPropName, App.lang, App.langDefault);
	}

	private _processPageCfgProp(hteMarkupItem: HTMLElement): void {
		let strPropName = hteMarkupItem.dataset.prop as string;
		hteMarkupItem.innerHTML = this._cfgPage.getString(strPropName, App.lang, App.langDefault);
	}


	/* Event Handlers
	----------------------------------------------------------*/

	protected _onPageStateChanged(page: UIBase.IBookPage, args: UIBase.TNavableStateChangedArgs): void {
		switch (args.stateNew) {
			case UIBase.NavableStates.Displayed: {
				break;
			}
		}
	}

	protected _onControlStateChanged(ctr: UIBase.IControlElement, args: UIBase.TControlStateChangedArgs): void {
		if (args.stateNew === UIBase.ControlStates.Work || args.stateNew === UIBase.ControlStates.Error) {
			ctr.eventStateChanged.unsubscribe(this._fControlStateChangedHandler);
			this._nDoneControlsCounter++;
			//
			if (this._nDoneControlsCounter >= this._controls.values.length && this.state === UIBase.PageProcessorStates.Processing) {
				this._changeState(UIBase.PageProcessorStates.Processed);
			}
		}
	}


	/* State Machine
	----------------------------------------------------------*/

	private _eventStateChanged: EventNest<UIBase.TPageProcessorStateChangedArgs>;

	private _state: UIBase.PageProcessorStates = UIBase.PageProcessorStates.Init;

	public get state(): UIBase.PageProcessorStates {
		return this._state;
	}

	private _changeState(stateNew: UIBase.PageProcessorStates): void {
		if (this.state === stateNew) { return; }
		//
		const stateOld = this.state;
		this._state = stateNew;
		//
		switch (this.state) {
			case UIBase.PageProcessorStates.Processing: {
				break;
			}
			case UIBase.PageProcessorStates.Processed: {
				break;
			}
			case UIBase.PageProcessorStates.Error: {
				// it is not yet clear how to use it
				break;
			}
		}
		//
		if (stateNew !== stateOld) {
			this._eventStateChanged.raise({ stateNew, stateOld });
		}
	}
} // class PageProcessor

//
//

/*
	Grigory. Для будущей реализации (возможно). Я предполагаю, что для инициализации контролов
	(помимо уже существующих способов) может использоваться файл в формате json асинхронно подгружаемый
	следом за страницей содержащий объекты с данными ассоциируемые с контролами на странице через
	id (или как-то ещё). Возможно такой подход удобен для больших тестов (с множеством отдельных заданий)
	или в каких-то других случаях. Но пока этот вопрос остаётся открытым.
*/
// public 	getBehind(): Promise<any> {
// 	return new Promise<any>( (handComplete: any, handError: any) => {
// 		if (this._behind) {
// 			handComplete(this._behind);
// 		} else {
// 			// Используя соглашение добавл. к имени странцы - "-behind.json"
// 			let pathBehind = Helper.addPathEnd(this._path, "-behind", "json");
// 			Helper.loadJSON(pathBehind, (behind) => {
// 				this._behind = behind;
// 				handComplete(behind);
// 			}, (err) => {
// 				handError(null);
// 			});
// 		}
// 	});
// }

