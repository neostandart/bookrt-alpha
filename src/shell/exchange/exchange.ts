import { ErrorCase } from "../../engine/system/runtime/error.js";
import { EventNest } from "../../engine/system/runtime/event.js";
import * as UIBase from "../../engine/system/common/uibase.js";
import { App, ViewObjectStates } from "../../engine/system/runtime/app.js";
import { Helper } from "../../engine/service/aid/aid.js";
//

export enum ExchRetCodes {
	UNDEF = -1,
	OK = 0,
	FALURE = 1,
	UNDEFEXCEP = 1000,
	SYSTEMEXCEP = 1001,
	MODULEEXCEP = 1002,
	REQUESTFORMAT = 1012,
	PARAMSUNFIT = 1013,
	UNKNOWNCOMMAND = 1014,
	MODVALIDATION = 1020,
	USERVALIDATION = 1021
}

export enum ExchCommands {
	UNDEF = 0,
	GET_STATE = 1,
	SET_STATE = 2,
	GET_USERINFO = 3,
	SET_USERINFO = 4
}


export enum ExchObjectStates {
	Init,
	Ready,
	Busy,
	Error
}

export type ServerResult = { retcode: ExchRetCodes, data: any };

/*
	Grigory. Этот класс пока не используется и является заготовкой. Класс предназначен для 
	взаимодействия со специализированным плагином работающем в среде LMS Moodle, который
	в свою очередь обеспечивает	доступ к данным авторизованного пользователя (в системе Moodle)
	(плагин также ещё не реализован). 
*/
export class Exchange implements UIBase.IExchange {
	// Class Variables and Constants
	// ---------------------------------------------------------
	private _bc: BroadcastChannel | undefined;
	//
	private _uid: number = 0; // User ID
	private _cmid: number = 0; // Course Module ID
	//
	private _pathExchange: string = ""; // The path to the php file
	//
	private _eventStateChanged: EventNest<any>;
	//
	private _error: ErrorCase | null = null;
	//

	// Construct/Init | Destruct
	// ---------------------------------------------------------

	public constructor() {
		this._changeState(ExchObjectStates.Init);
		this._eventStateChanged = new EventNest(this);
	}

	public __init(): Promise<any> {
		return new Promise<any>((resolve: any, reject: any) => {
			if (App.params.hasParam("exch")) {
				this._pathExchange = App.params.getParamString("exch");
				//
				this._changeState(ExchObjectStates.Ready);
				resolve();
			} else {
				// this._error = new ErrorCase("Exchange: " + "'exch' parameter is not found.");
				// this._changeState(ExchObjectStates.Error);
				// reject(this._error);
				//
				resolve();
			}
		});
	}


	// Public Members
	// ---------------------------------------------------------

	public get uid(): number {
		return this._uid;
	}

	public get cmid(): number {
		return this._cmid;
	}

	public get error(): ErrorCase | null {
		return this._error;
	}


	// Public Events
	// ---------------------------------------------------------

	public get eventStateChanged(): EventNest<any> {
		return this._eventStateChanged;
	}

	public do(cmd: ExchCommands, exchdata: any, broadcast: boolean = false): Promise<ServerResult> {
		return new Promise<ServerResult>(async (resolve: any, reject: any) => {
			let postbody: string = JSON.stringify({ command: cmd, uid: this._uid, cmid: this._cmid, data: exchdata });
			try {
				const response: Response = await fetch(this._pathExchange, {
					method: "POST", // или 'PUT'
					cache: "no-cache",
					body: postbody, // данные могут быть 'строкой' или {объектом}!
					headers: {
						"Content-Type": "application/json"
					}
				});
				//
				let result: ServerResult = { retcode: ExchRetCodes.UNDEF, data: null };
				//
				const jsonResponse: any = await response.json();
				if ("retcode" in jsonResponse) {
					result.retcode = jsonResponse.retcode;
					if (result.retcode === ExchRetCodes.OK || result.retcode === ExchRetCodes.FALURE) {
						// Запрос успешно обработан на сервере
						// FALURE - это не глюк, это сообщение об отрицательном результате.
						// извлекаем data
						if ("data" in jsonResponse) {
							result.data = jsonResponse.data;
						}
						//
						if (broadcast) {
							if (this._bc) {
								// вопрос: cmd в данном случае как будет восприниматься в структуре?
								this._bc.postMessage({ uid: this._uid, cmid: this._cmid, cmd, data: result });
							}
						}
						//
						resolve(result);
					} else {
						let msg = this._processExchError(ExchRetCodes.UNDEF, jsonResponse);
						reject(new ErrorCase(msg));
					}
				} else {
					let msg = this._processExchError(ExchRetCodes.UNDEF, "Нет кода возврата! " + jsonResponse);
					reject(new ErrorCase(msg));
				}

			} catch (error) {
				console.error("Исключение: ", error);
				let msg = this._processExchError(ExchRetCodes.UNDEF, error);
				reject(new ErrorCase(msg));
			}
		});
	}


	// Internal Members
	// ---------------------------------------------------------

	private async _processMessage(ev: MessageEvent): Promise<any> {
		switch (ev.data.state) {
			case ViewObjectStates.Opened: {
				// просят активировать окно
				// window.focus(); // это не работает :-()
				break;
			}
			case ViewObjectStates.Closing: {

				break;
			}
			case ViewObjectStates.Closed: {

				break;
			}
			default: {

				break;
			}
		} // switch
	}

	private _processExchError(retcode: ExchRetCodes, errinfo: any): string {
		this._error = new ErrorCase(errinfo);
		this._error.addMessage("Error interacting with the server. Retcode: " + retcode + ".");
		//
		switch (retcode) {
			case ExchRetCodes.UNDEF: {

				break;
			}
			case ExchRetCodes.UNDEFEXCEP: {

				break;
			}
			case ExchRetCodes.SYSTEMEXCEP: {

				break;
			}
			case ExchRetCodes.MODULEEXCEP: {

				break;
			}
			case ExchRetCodes.REQUESTFORMAT: {

				break;
			}
			case ExchRetCodes.PARAMSUNFIT: {

				break;
			}
			case ExchRetCodes.UNKNOWNCOMMAND: {

				break;
			}
			case ExchRetCodes.MODVALIDATION: {

				break;
			}
			case ExchRetCodes.USERVALIDATION: {

				break;
			}
			default: {
				App.logWarning("Неизвестный код возврата сервера: " + retcode, Helper.getObjectName(this));
			}
		} // switch
		//
		this._changeState(ExchObjectStates.Error);
		return "Ошибка на сервере! Код возврата: " + retcode;
	}


	// Event Handlers
	// ---------------------------------------------------------

	private _onBcMessage(ev: MessageEvent): void {
		if ((ev.data.uid && ev.data.uid === this._uid) && (ev.data.cmid && ev.data.cmid === this._cmid)) {
			// ("Сообщение от BroadcastChannel: " + ev.data);
			this._processMessage(ev);
		}
	}

	private _onUnload(ev: Event): void {
		if (this._bc) {
			this._bc.postMessage({ uid: this._uid, cmid: this._cmid, data: { state: ViewObjectStates.Closed } });
		}
	}


	// State Machine
	// ---------------------------------------------------------

	private _state: ExchObjectStates = ExchObjectStates.Init;

	public get state(): ExchObjectStates {
		return this._state;
	}

	private _changeState(stateNew: ExchObjectStates): void {
		if (this.state === stateNew) { return; }
		//
		const stateOld: ExchObjectStates = this.state;
		this._state = stateNew;
		//
		const stateNow: ExchObjectStates = this.state;
		switch (stateNow) {
			case ExchObjectStates.Init: {

				break;
			}
			case ExchObjectStates.Ready: {

				break;
			}
			case ExchObjectStates.Busy: {

				break;
			}
			case ExchObjectStates.Error: {

				break;
			}
		} // switch (stateNow)
		//
		if (this._state !== stateOld) {
			this._eventStateChanged.raise({ data: this._state });
		}
	}

} // class Exchange
