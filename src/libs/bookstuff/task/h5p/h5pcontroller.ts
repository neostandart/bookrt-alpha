import { Queue } from "../../../../engine/system/common/uilib.js";
import { IBookFrame, TBookEventArgs } from "../../../../engine/system/common/uibase.js";
import { EventNest } from "../../../../engine/system/runtime/event.js";
import { BookFrame } from "../../../../engine/jet/bookframe/bookframe.js";
import { App } from "../../../../engine/system/runtime/app.js";
//
import { H5PPlayer } from "./h5pplayer.js";
//

enum MainStates {
	Undef,
	Init,
	Work,
	Error
}


export abstract class H5PController {
	/* Class Variables and Constants
	----------------------------------------------------------*/
	private static _mapPlayers: Map<string, H5PPlayer> = new Map<string, H5PPlayer>();
	//
	private static _objPlayerCreating: any = null;
	private static _queueForCreation: Queue<any> = new Queue<any>();
	//
	private static _eventInitialized: EventNest<void> = new EventNest<void>(null);
	//

	/* Public Members
	----------------------------------------------------------*/

	public static regInstance(ctr: H5PPlayer): void {
		this._mapPlayers.set(ctr.id, ctr);
		//
		if (this._state === MainStates.Undef) {
			this._changeState(MainStates.Init);
			//
			// Загружаем код H5PStandalonePlayer и H5PResizer
			//
			setTimeout(async () => {
				let bookframe = ctr.page.book.frame as BookFrame;
				let promises: Promise<HTMLScriptElement>[] = [];
				try {
					// В этом нет необходимости: "...resize code is already bundled in main.bundle.js"
					// promises.push(bookframe.loadScript("h5presizer", App.makeThirdPartyPath("h5p/resizer.js")));
					promises.push(bookframe.loadScript("h5pstandalone", App.makeThirdPartyPath("h5p/standalone/main.bundle.js")));
					await Promise.all(promises);
					//
					let H5P = (App.getGlobalVar("H5P"));
					if (H5P) {
						H5P.externalDispatcher.on("xAPI", this._onH5PxAPI.bind(this));
					} else {
						throw new Error("H5P global object was not created!");
					}
					//
					this._changeState(MainStates.Work);
				} catch (err) {
					App.logError(err);
					this._changeState(MainStates.Error);
				}
			}, 0);
		}
	}

	public static unregInstance(ctr: H5PPlayer): void {
		this._mapPlayers.delete(ctr.id);
		//
		if (ctr.idContent) {
			this._removeH5PContent(ctr.idContent);
		}
	}

	public static waitReady(): Promise<boolean> {
		return new Promise<boolean>((resolve: any) => {
			if (this._state === MainStates.Work) {
				resolve(true);
			} else if (this._state === MainStates.Error) {
				resolve(false);
			} else {
				this._eventInitialized.subscribe((sender: any, args: void) => {
					resolve(this._state === MainStates.Work ? true : false);
				});
			}
		});
	}

	/** @return {Promise} Returns the created H5PStandalone object 
	 * !!! К сожалению Promise в действительности возвращает undefined 
	 * (это вопрос реализации класса H5PStandalone)
	 */
	public static buildH5PContent(ctr: H5PPlayer): Promise<any> {
		return new Promise<string>((resolve, reject) => {
			let objH5PStandalone = App.getGlobalVar("H5PStandalone");
			if (objH5PStandalone && objH5PStandalone.H5P) {
				this._createStandalonePlayer(ctr.containerH5P, ctr.optionsH5P, (player) => {
					resolve(player);
				});
			} else {
				reject("buildH5PContent: H5P not initialized!");
			}
		});
	}

	/**
	 * Recreates the H5PStandalone object again
	 * @return {Promise} Returns the created H5PStandalone object
	 */
	public static resetH5PContent(ctr: H5PPlayer): Promise<any> {
		ctr.containerH5P.innerHTML = "";
		this._removeH5PContent(<string>ctr.idContent);
		return this.buildH5PContent(ctr);
	}


	/* Internal Event Handlers
	----------------------------------------------------------*/

	private static _onBookClosed = (sender: any, args: TBookEventArgs): void => {
		H5PController._changeState(MainStates.Undef);
	}

	private static _onH5PxAPI(ev: any): void {
		if (ev.data && ev.data.statement) {
			let player = this._mapPlayers.get(ev.data.statement.object?.id);
			if (player) {
				player.notifyH5PEvent(ev.data.statement);
			}
		}
	}

	private static _removeH5PContent(cid: string): void {
		let objH5PIntegration: any = App.getGlobalVar("H5PIntegration");
		if (objH5PIntegration) {
			cid = "cid-" + cid;
			delete objH5PIntegration.contents[cid];
		}
	}


	/* Internal Members
	----------------------------------------------------------*/

	private static _reset(): void {
		App.deleteGlobalVar("H5PIntegration");
		App.deleteGlobalVar("H5P");
		App.deleteGlobalVar("H5PStandalone");
	}

	private static async _createStandalonePlayer(prmContainer: HTMLElement, prmOptions: any, fCallback: (player: any) => void): Promise<void> {
		let createinfo = { container: prmContainer, options: prmOptions, callback: fCallback };

		if (this._objPlayerCreating === null) {
			this._objPlayerCreating = createinfo;

			let objH5PStandalone = App.getGlobalVar("H5PStandalone");
			let objH5PPlayer = await new objH5PStandalone.H5P(createinfo.container, createinfo.options);
			this._objPlayerCreating = null;

			if (this._queueForCreation.length > 0) {
				let createinfoNext = this._queueForCreation.pop();
				this._createStandalonePlayer(createinfoNext.container, createinfoNext.options, createinfoNext.callback);
			}

			fCallback(objH5PPlayer);
		} else {
			this._queueForCreation.push(createinfo);
		}

		// END _createStandalonePlayer
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
				if (stateOld === MainStates.Work) {
					this._reset();
				}
				break;
			}
			case MainStates.Init: {
				this._reset();
				App.mainview.eventBookClosed.subscribe(this._onBookClosed);
				break;
			}
			case MainStates.Work: {
				this._eventInitialized.raise();
				this._eventInitialized.resetHandlers();
				break;
			}
			case MainStates.Error: {
				this._reset();
				this._eventInitialized.raise();
				this._eventInitialized.resetHandlers();
				break;
			}
		} // switch (stateNow)
	}

} // class H5PController

