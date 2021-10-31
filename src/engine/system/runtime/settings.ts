import { Helper } from "../../service/aid/aid.js";
import * as UIBase from "../common/uibase.js";
import { EventNest } from "./event.js";
import { App } from "./app.js";
//

export class Setting {
	/* Class Variables and Constants
	----------------------------------------------------------*/
	protected _name: string;
	protected _value: any;
	protected _bChanged: boolean = false;
	protected _eventValueChanged: EventNest<boolean>;
	//
	protected _objSetting: any;
	//

	/* Construction / Initialization / Desctruction
	----------------------------------------------------------*/

	constructor(objSetting: any) {
		if (objSetting.name) {
			this._name = objSetting.name;
		} else {
			throw new Error("The Setting does not have the \"name\" property.");
		}

		if (objSetting.value) {
			if (!Helper.isString(objSetting.value) || !Helper.isNumber(objSetting.value)) {
				this._value = objSetting.value;
			} else {
				throw new Error(`The Setting Value is not valid (name=${objSetting.name}).`);
			}
		} else {
			throw new Error(`The Setting does not have the \"value\" property (name=${objSetting.name}).`);
		}

		this._objSetting = objSetting;

		this._eventValueChanged = new EventNest<boolean>(this);
	}


	/* Infrastructure
	----------------------------------------------------------*/



	/* Public Members
	----------------------------------------------------------*/

	public get name(): string {
		return this._name;
	}

	public get value(): any {
		return this._value;
	}

	public set value(value: any) {
		this._value = value;
		this._bChanged = (this._objSetting.value !== this._value) ? true : false;
		this._eventValueChanged.raise(true);
	}

	public getString(): string {
		if (Helper.isString(this._value)) {
			return <string>this._value;
		}
		//
		if (Helper.isNumber(this._value)) {
			return String(this._value);
		}
		//
		return "";
	}

	public getNumber(): number {
		if (Helper.isNumber(this._value)) {
			return this._value;
		}
		//
		if (Helper.isString(this._value)) {
			return Number(this._value);
		}
		//
		return 0;
	}

	public getData(): any {
		return this._objSetting.data;
	}

	public get bChanged(): boolean {
		return this._bChanged;
	}

	public reject(): void {
		if (this._bChanged) {
			this._bChanged = false;
			this._eventValueChanged.raise(false);
		}
	}

	public informSaved(): void {
		this._bChanged = false;
		this._objSetting.value = this._value;
	}

	/* Public Events
	----------------------------------------------------------*/

	public get eventValueChanged(): EventNest<boolean> {
		return this._eventValueChanged;
	}


	/* Internal Members
	----------------------------------------------------------*/



	/* Event Handlers
	----------------------------------------------------------*/



} // class SettingBase

// =====================================================================

export class AppSettings implements UIBase.IAppSettings {
	/* Class Variables and Constants
	----------------------------------------------------------*/
	protected _objSettings: any;
	protected _mapSettings: Map<string, Setting>;
	//

	/* Construction / Initialization / Desctruction
	----------------------------------------------------------*/

	constructor() {
		this._mapSettings = new Map<string, Setting>();
	}


	/* IAppSettings Implementation
	----------------------------------------------------------*/

	public getValue(settingname: string): any {
		let setting = this._mapSettings.get(settingname);
		return setting ? setting.value : null;
	}

	public setValue(settingname: string, value: any): void {
		let setting = this._mapSettings.get(settingname);
		if (setting) {
			setting.value = value;
		} else {
			// пока ничего не делаем (может надо новое свойство добавлять???)
		}
	}

	public getString(settingname: string): string | null {
		let setting = this._mapSettings.get(settingname);
		return (setting) ? setting.getString() : null;
	}

	public getNumber(settingname: string): number | null {
		let setting = this._mapSettings.get(settingname);
		return (setting) ? setting.getNumber() : null;
	}


	/* Public Members
	----------------------------------------------------------*/

	public load(): void {
		this._objSettings = App.db.getLocalObjectData("appsettings");
		let sysverLocal = App.db.getLocalStringData("sysver");
		//
		if (this._objSettings && sysverLocal && Helper.compareIsNewerMajor(sysverLocal, App.sysver)) {
			// ! Grigory. Мажорная версия системы новее чем предыдущая версия при которой были сохранены 
			// локальные настройки. По идее, локальные настройки надо преобразовать в новую версию 
			// (если их формат как-то изменился)
			// Пока ничего не делаем.
		}
		//
		if (!this._objSettings) {
			this._objSettings = App.appcfg.getParam("settings");
			this.save();
		}
		//
		if (!this._objSettings) {
			this._objSettings = {};
		}
		//
		this._mapSettings.clear();
		if (Helper.isArray(this._objSettings)) {
			let aSettings = this._objSettings as [];
			for (let i = 0; i < aSettings.length; i++) {
				let objSetting = aSettings[i] as any;
				if (objSetting.name) {
					try {
						let setting = new Setting(objSetting);
						this._mapSettings.set(setting.name, setting);
					} catch (err) {
						App.logError(err);
					}
				} else {
					App.logError(new Error("The Application Setting does not have the \"name\" property"));
				}
			}
		} else {
			App.logError(new Error("Settings object must be Array"));
		}
	}

	public save(): void {
		this._mapSettings.forEach((setting) => setting.informSaved());
		App.db.saveLocalData("appsettings", JSON.stringify(this._objSettings));
		App.db.saveLocalData("sysver", App.sysver);
	}

	public reject(): void {
		this._mapSettings.forEach((setting) => setting.reject());
	}

	public reset(): void {
		App.db.removeLocalData("appsettings");
		this.load();
	}

	public getSettingList(): Setting[] {
		return Array.from(this._mapSettings.values());
	}

	/* Public Events
	----------------------------------------------------------*/



	/* Internal Members
	----------------------------------------------------------*/



	/* Event Handlers
	----------------------------------------------------------*/



} // class AppSettings


