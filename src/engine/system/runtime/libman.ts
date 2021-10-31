import { Helper } from "../../service/aid/aid.js";
import * as UIBase from "../common/uibase.js";
import { App } from "./app.js";
//

type TModuleRef = { options: any, module: any };

export class ControlFactory implements UIBase.IControlFactory {
	/* Class Variables and Constants
	----------------------------------------------------------*/
	protected _libref: UIBase.IInnerLib;
	private _mapControlModules: Map<string, TModuleRef> = new Map<string, TModuleRef>();
	//
	constructor(libref: UIBase.IInnerLib, ctrlist: []) {
		this._libref = libref;
		//
		ctrlist.forEach((element: any) => {
			if (element.name) {
				if (element.startpoint) {
					element.startpoint = Helper.parseEnum(element.startpoint, UIBase.ControlStartPoints);
				}
				this._mapControlModules.set(element.name, { options: element, module: null });
			}
		});
	}


	/* Public members
	----------------------------------------------------------*/

	public get libref(): UIBase.IInnerLib {
		return <UIBase.IInnerLib>this._libref;
	}

	public has(controlname: string): boolean {
		return this._mapControlModules.has(controlname);
	}

	public async create(name: string, page: UIBase.IBookPage, presenter: HTMLElement, startpoint?: UIBase.ControlStartPoints): Promise<UIBase.IControlElement | null> {
		let ctr: UIBase.IControlElement | null = null;
		let mref = this._mapControlModules.get(name);
		if (mref) {
			if (!mref.module) {
				let pathModuleLocal = mref.options.module;
				mref.options.location = App.tube.extractDirectory(pathModuleLocal);
				let pathModuleFull = this._libref.makeFullPath(pathModuleLocal);
				mref.module = await import(pathModuleFull);
			}
			//
			ctr = new mref.module[name](this._libref, page, presenter, mref.options, startpoint);
		}
		//
		return ctr;
	}

	/* Internal Members
	----------------------------------------------------------*/


} // class ControlFactory

// =====================================================================

export class InnerLib implements UIBase.IInnerLib {
	// Class Variables and Constants
	// -------------------------------------------------------------------
	protected _joDef: any;
	protected _urlRoot: string;
	protected _urlAssets: string;
	protected _urlStrings: string;
	protected _langs: string[] = [];
	//
	protected _mapTemplScopes: Map<string, Map<string, HTMLTemplateElement>>;
	//

	// Construction / Initialization
	// -------------------------------------------------------------------

	constructor(joDef: any, pathRoot: string) {
		this._joDef = joDef;
		this._urlRoot = App.tube.ensureSepEnd(pathRoot);
		//
		this._urlAssets = App.tube.combinePath(this._urlRoot, "_assets" + App.tube.DIR_SEP);
		this._mapTemplScopes = new Map<string, Map<string, HTMLTemplateElement>>();
		//
		this._urlStrings = App.tube.combinePath(this._urlAssets, "strings" + App.tube.DIR_SEP);
		if (Helper.isString(joDef.langs)) {
			this._langs = (joDef.langs as string).split(",").map((item: string) => item.trim());
		}
	}

	// Infrastructure
	// -------------------------------------------------------------------



	// IStringsProvider implementation
	// -------------------------------------------------------------------

	public get hasStrings(): boolean {
		return this._langs.length > 0;
	}

	public get urlStrings(): string {
		return this._urlStrings;
	}

	public get langs(): string[] {
		return this._langs;
	}


	// ILibRef implementation
	// -------------------------------------------------------------------

	public get name(): string {
		return this._joDef.name;
	}

	public get urlRoot(): string {
		return this._urlRoot;
	}

	public get urlAssets(): string {
		return this._urlAssets;
	}

	public makeFullPath(innerpath: string): string {
		return App.tube.combinePath(this._urlRoot, innerpath);
	}


	// Public Members
	// -------------------------------------------------------------------



	// Internal Members
	// -------------------------------------------------------------------



} // class LibRef

// =====================================================================

export class SysLibrary extends InnerLib {
	// Class Variables and Constants
	// -------------------------------------------------------------------



	// Public Members
	// -------------------------------------------------------------------

	public resolveMarkupLinks(node: ParentNode): void {
		const listMarkupItems = node.querySelectorAll<HTMLElement>("[href], [src], svg use");
		//
		for (let i = 0; i < listMarkupItems.length; i++) {
			let hteMarkupItem = listMarkupItems[i];
			if (!hteMarkupItem.dataset.resolved) {
				if (hteMarkupItem.hasAttribute("href")) {
					hteMarkupItem.setAttribute("href", this.resolveResourceRef(<string>hteMarkupItem.getAttribute("href")));
					if (hteMarkupItem.tagName === "A") {
						hteMarkupItem.setAttribute("target", "_blank");
					}
					//
				} else if (hteMarkupItem.hasAttribute("src")) {
					hteMarkupItem.setAttribute("src", this.resolveResourceRef(<string>hteMarkupItem.getAttribute("src")));
				} else if (hteMarkupItem.tagName === "use") {
					hteMarkupItem.setAttribute("xlink:href", this.resolveResourceRef(<string>hteMarkupItem.getAttribute("xlink:href")));
				}
				//
				hteMarkupItem.dataset.resolved = "";
			}
		} // for
	}

	public resolveResourceRef(path: string): string {
		path = path.trim();
		return (Helper.startsWith(path, "http")) ? path : App.tube.combinePath(this.urlAssets, path);
	}

	public resolveFilePath(path: string): string {
		path = path.trim();
		return (Helper.startsWith(path, "http")) ? path : App.tube.combinePath(this._urlRoot, path);
	}

	public async getTemplate(templref: string, key: string): Promise<HTMLTemplateElement | null> {
		let mapTempls = this._mapTemplScopes.get(templref);
		if (!mapTempls) {
			let fullpath = App.tube.combinePath(this.urlAssets, templref);
			//
			mapTempls = new Map<string, HTMLTemplateElement>();
			let hteTempBox: HTMLElement = document.createElement("div");
			hteTempBox.innerHTML = await App.tube.loadHTML(App.tube.changeExtension(fullpath, "html"));
			//
			this.resolveMarkupLinks(hteTempBox);
			//
			for (let i = 0; i < hteTempBox.children.length; i++) {
				let hteChild = hteTempBox.children[i];
				if (hteChild instanceof HTMLTemplateElement) {
					let hteTempl = hteChild as HTMLTemplateElement;
					mapTempls.set(hteTempl.id, hteTempl);
				}
			}
			//
			this._mapTemplScopes.set(templref, mapTempls);
		}
		//
		let templ = mapTempls.get(key);
		return (templ) ? templ : null;
	}


	// Internal Members
	// -------------------------------------------------------------------



} // class SysLibrary

// =====================================================================

export class ExtLibrary extends InnerLib implements UIBase.IExtLibrary {
	// Class Variables and Constants
	// -------------------------------------------------------------------
	private _factory: ControlFactory;
	private _stylepath: string | null = null;
	//

	/* Construction / Initialization / Desctruction
	----------------------------------------------------------*/

	constructor(joDef: any, pathRoot: string) {
		super(joDef, pathRoot);
		//
		this._factory = new ControlFactory(this, Helper.isArray(joDef.controls) ? joDef.controls : []);
		//
		if (joDef.stylepath) {
			this._stylepath = this.makeFullPath(joDef.stylepath);
		}
	}


	// Infrastructure:
	// -------------------------------------------------------------------

	public async preload(): Promise<any> {
		//
		/** Здесь предположительно должны подгружаться модули контролов с атрибутом 'preload' */

	}


	// IExtLibrary Implementation
	// -------------------------------------------------------------------

	public get factory(): UIBase.IControlFactory {
		return this._factory;
	}

	public get stylepath(): string | null {
		return this._stylepath;
	}

	public resolveMarkupLinks(node: ParentNode, control: UIBase.IControlElement): void {
		const listMarkupItems = node.querySelectorAll<HTMLElement>("[href], [src]");
		//
		for (let i = 0; i < listMarkupItems.length; i++) {
			let hteMarkupItem = listMarkupItems[i];
			if (!hteMarkupItem.dataset.resolved) {
				if (hteMarkupItem.hasAttribute("href")) {
					hteMarkupItem.setAttribute("href", this.resolveResourceRef(<string>hteMarkupItem.getAttribute("href"), control));
					if (hteMarkupItem.tagName === "A") {
						hteMarkupItem.setAttribute("target", "_blank");
					}
					//
				} else if (hteMarkupItem.hasAttribute("src")) {
					hteMarkupItem.setAttribute("src", this.resolveResourceRef(<string>hteMarkupItem.getAttribute("src"), control));
				}
				//
				hteMarkupItem.dataset.resolved = "";
			}
		} // for
	}

	public resolveResourceRef(path: string, control: UIBase.IControlElement): string {
		path = path.trim();
		if (Helper.startsWith(path, "http")) {
			return path;
		}
		//
		if (Helper.startsWith(path, ".")) {
			return (App.tube.combinePath(control.resroot, path));
		}
		//
		return App.tube.combinePath(this.urlAssets, path);
	}

	public resolveFilePath(path: string, control: UIBase.IControlElement): string {
		path = path.trim();
		if (Helper.startsWith(path, "http")) {
			return path;
		}
		//
		if (Helper.startsWith(path, ".")) {
			return (App.tube.combinePath(control.location, path));
		}
		//
		return App.tube.combinePath(this.urlRoot, path);
	}

	/** Вернёт null если файл шаблона загружен, а шаблон по заданному key не найден. */
	public async getTemplate(templref: string, key: string, control: UIBase.IControlElement): Promise<HTMLTemplateElement | null> {
		let mapTempls = this._mapTemplScopes.get(templref);
		if (!mapTempls) {
			let fullpath: string;
			if (Helper.startsWith(templref, "/")) {
				fullpath = App.tube.combinePath(this.urlAssets, templref);
			} else {
				fullpath = App.tube.combinePath(control.resroot, templref);
			}
			//
			mapTempls = new Map<string, HTMLTemplateElement>();
			let hteTempBox: HTMLElement = document.createElement("div");
			hteTempBox.innerHTML = await App.tube.loadHTML(App.tube.changeExtension(fullpath, "html"));
			//
			this.resolveMarkupLinks(hteTempBox, control);
			//
			for (let i = 0; i < hteTempBox.children.length; i++) {
				let hteChild = hteTempBox.children[i];
				if (hteChild instanceof HTMLTemplateElement) {
					let hteTempl = hteChild as HTMLTemplateElement;
					mapTempls.set(hteTempl.id, hteTempl);
				}
			}
			//
			this._mapTemplScopes.set(templref, mapTempls);
		}
		//
		let templ = mapTempls.get(key);
		return (templ) ? templ : null;
	}


	// Internal Members
	// -------------------------------------------------------------------



} // class ExtLibrary


// Libraries Manager
// =====================================================================

export class LibManager implements UIBase.ILibManager {
	// Class Variables and Constants
	// -------------------------------------------------------------------
	private _pathRoot: string = "";
	private _joSource: any;
	private _mapSysLibs: Map<string, SysLibrary>;
	private _mapExtLibs: Map<string, ExtLibrary>;

	private _engine: SysLibrary | null = null;
	private _shell: SysLibrary | null = null;


	// Construction / Initialization
	// -------------------------------------------------------------------

	constructor() {
		this._mapSysLibs = new Map<string, SysLibrary>();
		this._mapExtLibs = new Map<string, ExtLibrary>();
	}

	// Infrastructure
	// -------------------------------------------------------------------


	public async init(pathCfg: string, pathRoot: string): Promise<any> {
		this._pathRoot = App.tube.ensureSepEnd(pathRoot);
		//
		this._joSource = await App.tube.loadJson(pathCfg);
		//
		let aSysLibs: any[] = (Helper.isArray(this._joSource.system) ? <any[]>this._joSource.system : []);
		for (let i = 0; i < aSysLibs.length; i++) {
			let joLibDef = aSysLibs[i];
			if (joLibDef.name) {
				let libname = joLibDef.name.trim();
				let libpath = App.tube.combinePath(this._pathRoot, libname);
				let libref = new SysLibrary(joLibDef, libpath);
				this._mapSysLibs.set(libname, libref);
				switch (libname) {
					case "engine": {
						this._engine = libref;
						break;
					}
					case "shell": {
						this._shell = libref;
						break;
					}
				}
			}
		}
		//
		if (this._mapSysLibs.size < 2) {
			throw new Error("Incorrect System Libraries definition!");
		}

		if (!this._engine || !this._shell) {
			throw new Error("Required system libraries (one or more) are not registered!");
		}

		//
		//

		let aPreloadPromises: any[] = [];
		let aExtLibs: any[] = (Helper.isArray(this._joSource.extension) ? <any[]>this._joSource.extension : []);
		for (let i = 0; i < aExtLibs.length; i++) {
			let joLibDef = aExtLibs[i];
			if (joLibDef.name) {
				let libname = joLibDef.name.trim();
				let libpath = App.tube.combinePath(App.tube.combinePath(this._pathRoot, "libs"), libname);
				let libref = new ExtLibrary(joLibDef, libpath);
				aPreloadPromises.push(libref.preload());
				this._mapExtLibs.set(libname, libref);
			}
		}
		//
		if (aPreloadPromises.length > 0) {
			await Promise.all(aPreloadPromises);
		}
	}


	// ILibManager Implementation
	// -------------------------------------------------------------------

	public get engine(): UIBase.ISysLibrary {
		return <SysLibrary>this._engine;
	}

	public get shell(): UIBase.ISysLibrary {
		return <SysLibrary>this._shell;
	}

	public get syslibs(): Map<string, UIBase.ISysLibrary> {
		return this._mapSysLibs;
	}

	public get extlibs(): Map<string, UIBase.IExtLibrary> {
		return this._mapExtLibs;
	}

	public getLibByName(strName: string): UIBase.IInnerLib | null {
		return (this._mapSysLibs.has(strName)) ? this._mapSysLibs.get(strName) as InnerLib :
			(this._mapExtLibs.has(strName)) ? this._mapExtLibs.get(strName) as InnerLib : null;
	}
	
} // class LibraryManager

