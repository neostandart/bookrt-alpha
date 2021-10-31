import { Helper } from "../../service/aid/aid.js";
import { ErrorCase } from "./error.js";
import { EventNest } from "./event.js";
import { OuterTube } from "./outertube.js";
import * as UIBase from "../common/uibase.js";
import { LibManager } from "./libman.js";
import { StringsManager } from "./stringsman.js";
import { BookCatalog } from "../catalog/catalog.js";
import { MainView } from "../view/mainview.js";
import { AppDB } from "./appdb.js";
import { AppSettings } from "./settings.js";
//

// Enumerations
// =====================================================================

export enum SystemDefaults {
	AppConfigPath = "app/app-cfg.json",
	SysConfigPath = "config/sys-cfg.json",
	LibsConfigPath = "config/lib-cfg.json",
	ThirdPartyRoot = "third-party",
	CodeRoot = "code",
	FactoryModuleName = "factory.js",
	BookCatalogName = "catalog.json",
	AppTitleKey = "title"
}

export enum ViewObjectStates {
	Error = -1,
	Undef = 0,
	Opening = 1,
	Opened = 2,
	Closing = 3,
	Closed = 4
}


// Application
// =====================================================================

abstract class Application {
	// Variables and Constants
	// ---------------------------------------------------------
	private static _params: UIBase.ParameterSet = new UIBase.ParameterSet();
	private static _syscfg: UIBase.ParameterSet = new UIBase.ParameterSet();
	private static _appcfg: UIBase.ParameterSet = new UIBase.ParameterSet();

	private static _sysver: string = "0.1.0";
	private static _buildnum: string = "1"; // (exclusively for the application only)
	private static _wnd?: Window;
	private static _pathRoot: string = "";
	private static _pathStorage = "";
	private static _pathCatalog = "";
	private static _pathBooks = "";
	//
	private static _strings: StringsManager = new StringsManager();
	private static _libman: LibManager = new LibManager();
	private static _catalog: BookCatalog = new BookCatalog();
	private static _exchange: UIBase.IExchange | null = null;
	private static _tube: OuterTube;
	private static _db: AppDB;
	private static _settings: AppSettings;
	//
	private static _mainview: MainView | null = null;

	private static _warnings: string[] = [];

	private static _nNextId: number = 99;

	// Init
	// ---------------------------------------------------------

	public static async launch(exchange: UIBase.IExchange, view: MainView, params: any, wnd: Window): Promise<any> {
		this._changeState(UIBase.AppStates.Init);
		//
		this._params.init(params);
		this._wnd = wnd;
		//
		this._exchange = exchange;
		this._mainview = view;
		//
		this._tube = new OuterTube();
		this._db = new AppDB();
		this._settings = new AppSettings();
		//
		this._pathRoot = this._tube.extractUrlBase(location.href);
		if (params.storage) {
			this._pathStorage = <string>params.storage;
		}
		//
		try {
			//
			// System Configuration
			//
			const pathSysConfig: string = this._tube.combinePath(this._pathRoot, SystemDefaults.SysConfigPath);
			let joSysCfg = await this._loadSysConfig(pathSysConfig);
			this._syscfg.init(joSysCfg);
			//
			if (this._syscfg.hasParam("version")) {
				this._sysver = <string>this._syscfg.getParam("version");
			}

			//
			// App Configuration
			//
			const pathAppConfig: string = this._tube.combinePath(this._pathRoot, SystemDefaults.AppConfigPath);
			let joAppCfg = await this._loadAppConfig(pathAppConfig);
			this._appcfg.init(joAppCfg);
			//
			if (this._appcfg.hasParam("buildnum")) {
				this._buildnum = <string>this._appcfg.getParam("buildnum");
			}

			//
			// Preparing user settings
			//
			this._settings.load();
			if (this.params.hasParam("lang")) {
				// if the language was passed as URL parameter
				this._settings.setValue("lang", this.params.getParamString("lang"));
				this._settings.save();
			}

			//
			// Init OuterTube
			//
			this._tube.setCacheVer(this._sysver.split(".").join("") + this._buildnum);

			//
			// The path to the book storage
			//
			if (!this._pathStorage) {
				// The path to the location of books either passed as a parameter or 
				// taken from the configuration file
				if (this._syscfg.hasParam("storage")) {
					this._pathStorage = <string>this._syscfg.getParam("storage");
				} else {
					throw new Error("Book Storage path was not found!");
				}
			}
			//
			if (!this._pathStorage.startsWith("http")) {
				this._pathStorage = this._tube.combinePath(this._pathRoot, this._pathStorage);
			}
			//
			if (this._pathStorage) {
				this._pathCatalog = this._tube.combinePath(this._pathStorage, "catalog");
				this._pathBooks = this._tube.combinePath(this._pathStorage, "books");
			}

			//
			//  Book Catalog
			//
			if (this._pathStorage) {
				let pathCatalog = this._tube.combinePath(this._pathCatalog, SystemDefaults.BookCatalogName);
				await this._catalog.init(pathCatalog);
			}

			//
			// Extension Libraries
			//
			await this._libman.init(
				this._tube.combinePath(this._pathRoot, SystemDefaults.LibsConfigPath),
				this._tube.combinePath(this._pathRoot, SystemDefaults.CodeRoot)
			);

			//
			//  StringProvider and TemplateProvider initializing
			//
			await this._strings.init(this.lang, Array.from(this._libman.syslibs.values()));

			//
			// Exchange object initializing
			//
			await this._exchange.__init();

			//
			// We can assume that the environment is ready to work, then you can open the main window
			//
			this._changeState(UIBase.AppStates.Ready);

			//
			// MainView initializing
			//
			const hteMainView: HTMLElement | null = this.doc.querySelector(".app-frame");
			if (hteMainView) {
				await this._mainview.open(hteMainView);
			} else {
				throw new Error("The MainView presenter element (.app-frame) was not found.");
			}
			//
			this._changeState(UIBase.AppStates.Work);
		} catch (errAppLaunch) {
			this._changeState(UIBase.AppStates.Error);
			// Displaying a fatal error message
			let strErrCaption = "System initialization error!";
			const errcase = ErrorCase.createFrom(errAppLaunch);
			errcase.setFatal(true);
			errcase.caption = strErrCaption;
			this.displayError(errcase);
			//
			try {
				(window as any).AppSpinner.stop();
			} catch (err) { /* */ }
		}
	}


	// Infrastructure
	// ---------------------------------------------------------

	public static get sysver(): string {
		return this._sysver;
	}

	public static get buildnum(): string {
		return this._buildnum;
	}

	public static getNextId(): string {
		this._nNextId++;
		return this._nNextId.toString();
	}

	public static delay(ms: number) {
		return new Promise((resolve) => setTimeout(resolve, ms));
	}
	public static getBookUrl(pathBook: string): string {
		let pathBookAbsolute = Helper.startsWith(pathBook, "http") ? pathBook : this._tube.combinePath(this._pathBooks, pathBook);
		return pathBookAbsolute;
	}


	// Public Members
	// ---------------------------------------------------------

	public static get wnd(): Window {
		return this._wnd ? this._wnd : window;
	}

	public static get doc(): Document {
		return this.wnd.document;
	}

	public static get params(): UIBase.ParameterSet {
		return this._params;
	}

	public static get syscfg(): UIBase.ParameterSet {
		return this._syscfg;
	}

	public static get appcfg(): UIBase.ParameterSet {
		return this._appcfg;
	}

	public static get url(): string {
		return this._pathRoot;
	}
	
	public static get pathStorage(): string {
		return this._pathStorage;
	}

	public static get pathCatalog(): string {
		return this._pathCatalog;
	}

	public static get pathBooks(): string {
		return this._pathBooks;
	}

	public static get strings(): UIBase.IStringsManager {
		return this._strings;
	}

	public static get libman(): UIBase.ILibManager {
		return this._libman;
	}

	public static get tube(): UIBase.IOuterTube {
		return this._tube;
	}

	public static get db(): UIBase.IAppDB {
		return this._db;
	}

	public static get settings(): UIBase.IAppSettings {
		return this._settings;
	}

	public static get mainview(): UIBase.IMainView {
		return <UIBase.IMainView>this._mainview;
	}

	public static get exchange(): UIBase.IExchange {
		return <UIBase.IExchange>this._exchange;
	}

	public static get catalog(): UIBase.IBookCatalog {
		return this._catalog;
	}

	public static get lang(): string {
		let lang = this._settings.getString("lang");
		return lang ? lang : this.langDefault;
	}

	public static get langDefault(): string {
		return UIBase.Languages.English;
	}

	public static displayTitle(strTitle?: string): void {
		let strAppTitle = (strTitle) ? strTitle : this.appcfg.getString(SystemDefaults.AppTitleKey, this.lang, this.langDefault);
		if (strAppTitle) {
			this.doc.title = strAppTitle;
		}
	}

	public static hasGlobalVar(strVarName: string): boolean {
		let wnd: any = (this._wnd) ? this._wnd : window;
		return !!wnd[strVarName];
	}

	public static getGlobalVar(strVarName: string): any {
		let wnd: any = (this._wnd) ? this._wnd : window;
		return wnd[strVarName];
	}

	public static deleteGlobalVar(strVarName: string): boolean {
		let wnd: any = (this._wnd) ? this._wnd : window;
		return delete wnd[strVarName];
	}
	

	public static makeThirdPartyPath(pathInner: string): string {
		let pathThirdParty = this._tube.combinePath(this._pathRoot, SystemDefaults.ThirdPartyRoot);
		let pathTarget = this._tube.combinePath(pathThirdParty, pathInner);
		return pathTarget;
	}

	public static displayWarning(strWarning: string): void {
		this._warnings.push(strWarning);
	}

	public static logWarning(strWarning: string, sender?: string): void {
		if (sender) {
			console.log(Helper.getDateTimeNowString() + " BookRT Warning (Sender: " + sender + "): " + strWarning);
		} else {
			console.log(Helper.getDateTimeNowString() + " BookRT Warning: " + strWarning);
		}
	}

	public static displayError(error: unknown): void {
		let errcase: ErrorCase = (error instanceof ErrorCase) ? error : new ErrorCase(error, "System error!");
		this.logError(errcase);
		errcase.display(this.doc);
	}

	public static logError(error: unknown): void {
		let errcase: ErrorCase = (error instanceof ErrorCase) ? error : new ErrorCase(error, "System error!");
		console.error(errcase.message);
	}


	// Public Events
	// ---------------------------------------------------------

	public static get eventStateChanged(): EventNest<UIBase.TAppStateChangedArgs> {
		return this._eventStateChanged;
	}


	// Internal Members
	// ---------------------------------------------------------

// Внимание!!!
// sys-cfg.json - надо всегда загружать раскештрованным (поскольку в этот момент версия ещё не известна)
// да и app-cfg тоже! А можетввести отдельный файл version и там например: 0.1.0.1 - последняя цифра 
// это номер сборки приложения. Нет это плохо (при обновл системы) Может два файла: sysver.txt и appver.txt 
// (можно без расширения) - просто текст ... ???


	private static async _loadSysConfig(path: string): Promise<any> {
		let result = await this._tube.loadJson(path, Date.now().toString());
		return result;
	}

	private static async _loadAppConfig(path: string): Promise<any> {
		let result;
		try {
			result = await this._tube.loadJson(path, Date.now().toString());
		} catch (err: any) {
			Application.logError("The \"appcfg.json\" file not loaded: " + ((err.statusText) ? err.statusText : err.toString()));
		}
		//
		return result;
	}


	// Event Handlers
	// ---------------------------------------------------------



	// State Machine
	// ---------------------------------------------------------

	private static _eventStateChanged: EventNest<UIBase.TAppStateChangedArgs> = new EventNest(null);

	private static _state: UIBase.AppStates = UIBase.AppStates.Undef;

	public static get state(): UIBase.AppStates {
		return this._state;
	}

	private static _changeState(stateNew: UIBase.AppStates): void {
		if (this.state === stateNew) { return; }
		//
		const stateOld: UIBase.AppStates = this.state;
		this._state = stateNew;
		//
		const stateNow = this.state;
		switch (stateNow) {
			case UIBase.AppStates.Init: {

				break;
			}
			case UIBase.AppStates.Ready: {

				break;
			}
			case UIBase.AppStates.Work: {

				break;
			}
			case UIBase.AppStates.Stopping: {

				break;
			}
			case UIBase.AppStates.Stoped: {

				break;
			}
			case UIBase.AppStates.Error: {

				break;
			}
		} // switch (stateNow)
		//
		if (this._state !== stateOld) {
			this._eventStateChanged.raise({ stateNew: this._state, stateOld });
		}
	}

} // END class Runtime

//
//

export { Application as App };
