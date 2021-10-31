import { Helper } from "../../service/aid/aid.js";
import { IAppDB } from "../common/uibase.js";
import { App } from "./app.js";
//

enum LaunchStates {
	Starting,
	Started
}

export class AppDB implements IAppDB {
	/* Class Variables and Constants
	----------------------------------------------------------*/
	private _nRespondLimit: number = 1000;
	private _id = Date.now();
	private _stateLaunch: LaunchStates = LaunchStates.Starting;

	private _bFirstInSession: boolean = true;
	private _tokenAwaitingBook: string | null = null;
	//


	constructor() {
		App.wnd.addEventListener("storage", this.onStorageEvent.bind(this));
		//
		this.detectAppSessionStart().then(() => {
			if (this._stateLaunch === LaunchStates.Starting) {
				this._stateLaunch = LaunchStates.Started;
			}
			//
			if (this._bFirstInSession) {
				this._onAppSessionStart();
			}
		});
	}

	private async detectAppSessionStart(): Promise<void> {
		return new Promise<void>((resolve, reject) => {
			localStorage.setItem("message", "request_anyone");
			localStorage.removeItem("message");
			//
			setTimeout(() => {
				resolve();
			}, this._nRespondLimit);
		});
	}

	private onStorageEvent(ev: StorageEvent): void {
		switch (this._stateLaunch) {
			case LaunchStates.Starting: {
				if (ev.key === "opened" && ev.newValue === "yes") {
					this._bFirstInSession = false;
					this._stateLaunch = LaunchStates.Started;
				}
				break;
			}
			//
			case LaunchStates.Started: {
				if (ev.key === "message" && ev.newValue === "request_anyone") {
					localStorage.setItem("opened", "yes");
					localStorage.removeItem("opened");
				}
				break;
			}
		} // switch (this._stateLaunch)
	}


	/* Construction / Initialization / Desctruction
	----------------------------------------------------------*/




	/* Infrastructure
	----------------------------------------------------------*/



	/* IAppDB Implementation
	----------------------------------------------------------*/

	public informBookOpened(booktoken: string): void {
		if (this._stateLaunch === LaunchStates.Started) {
			booktoken = App.tube.ensureNoSepEnd(booktoken);
			//
			let key = App.url + "@openbooks";
			let storeddata = localStorage.getItem(key);
			let data = (storeddata) ? JSON.parse(storeddata) as any : {};
			//
			if (data[booktoken]) {
				let nCount: number = data[booktoken];
				nCount = nCount + 1;
				data[booktoken] = nCount;
			} else {
				data[booktoken] = 1;
			}
			//
			localStorage.setItem(key, JSON.stringify(data));
		} else {
			this._tokenAwaitingBook = booktoken;
		}
	}

	public informBookClosed(booktoken: string): void {
		booktoken = App.tube.ensureNoSepEnd(booktoken);
		//
		let key = App.url + "@openbooks";
		let storeddata = localStorage.getItem(key);
		let data = (storeddata) ? JSON.parse(storeddata) as any : {};
		//
		if (data[booktoken]) {
			let nCount: number = data[booktoken];
			nCount = nCount - 1;
			if (nCount > 0) {
				data[booktoken] = nCount;
			} else {
				delete data[booktoken];
			}
			localStorage.setItem(key, JSON.stringify(data));
		} else {
			App.logError(new Error(`The information of the closed Book not found in AppDB (path:${booktoken})`));
		}
	}

	public isBookOpened(booktoken: string): boolean {
		booktoken = App.tube.ensureNoSepEnd(booktoken);
		//
		let key = App.url + "@openbooks";
		let storeddata = localStorage.getItem(key);
		let data = (storeddata) ? JSON.parse(storeddata) as any : {};
		//
		return (!!data[booktoken]);
	}

	public getOpenedBooksInfo(): Map<string, number> {
		let key = App.url + "@openbooks";
		let storeddata = localStorage.getItem(key);
		let data = (storeddata) ? JSON.parse(storeddata) as any : {};
		let map = new Map<string, number>(Object.entries(data));
		//
		return map;
	}

	public clearBookOpened(): void {
		let data = {};
		let key = App.url + "@openbooks";
		localStorage.setItem(key, JSON.stringify(data));
	}

	//

	public saveLocalData(key: string, data: string | number | object): void {
		let strData: string = Helper.isString(data) ? <string>data :
			Helper.isObject(data) ? JSON.stringify(data) : String(data);
		//
		localStorage.setItem(key, strData);
	}

	public getLocalNumberData(key: string): number {
		let saved = localStorage.getItem(key);
		if (!saved) { return Number.NaN; } 
		//
		return Number(saved);
	}

	public getLocalStringData(key: string): string {
		let saved = localStorage.getItem(key);
		if (!saved) { return ""; } 
		//
		return String(saved);
	}

	public getLocalObjectData(key: string): any {
		let saved = localStorage.getItem(key);
		if (!saved) { return null; } 
		//
		return JSON.parse(<string>saved);
	}
	
	public removeLocalData(key: string): void {
		localStorage.removeItem(key);
	}


	/* Public Members
	----------------------------------------------------------*/



	/* Public Events
	----------------------------------------------------------*/



	/* Internal Members
	----------------------------------------------------------*/

	private _onAppSessionStart(): void {
		// Если был сбой браузера, то возможно в localStorage осталась не удалённая
		// информация об открытых Книгах - (на всякий случай) мы её удаляем. 
		this.clearBookOpened();
		//
		if (this._tokenAwaitingBook) {
			this.informBookOpened(this._tokenAwaitingBook);
			this._tokenAwaitingBook = null;
		}
	}


	/* Event Handlers
	----------------------------------------------------------*/




	/* State Machine
	----------------------------------------------------------*/



} // class AppDB
