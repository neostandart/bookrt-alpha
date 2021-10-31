import { Helper } from "../../service/aid/aid.js";
import { EventNest } from "../runtime/event.js";
//

// Common Enumerations
// =====================================================================

export enum Languages {
	English = "en",
	Russian = "ru",
	Spanish = "es",
	French = "fr",
	German = "de",
	Chinese = "zh"
}

export enum LangNames {
	en = "English",
	ru = "Русский",
	es = "Español",
	fr = "Français",
	de = "Deutsch",
	zh = "中国人"
}


export enum TransDirections {
	None,
	Left,
	Right,
	Up,
	Down
}

export enum SortDirections {
	Undef = 0,
	Ascending = 1,
	Descending = 2
}

export enum Sides {
	Top,
	Left,
	Right,
	Bottom
}

export enum Layouts {
	Undef,
	Top,
	TopLeft,
	TopCenter,
	TopRight,
	Center,
	CenterLeft,
	CenterRight,
	Bottom,
	BottomLeft,
	BottomCenter,
	BottomRight
}


export enum ScreenOrientations {
	Landscape,
	Portrait
}

export enum MessageTypes {
	Info,
	Success,
	Failure,
	Warning,
	Danger,
	Error
}

export enum WaitIndicatorTypes {
	Standart,
	Server
}

/** это перечисл. под вопросом ?? */
export enum AttractKinds {
	PulseFwd,
	PulseBck
}

export enum PageLifeKinds {
	Transit,
	Persistent,
	Forever
}

export enum PageDisplayPosition {
	Out,
	Back,
	Front
}

export enum ElemActiveCycle {
	None,
	Starting,
	Started,
	Stopping,
	Stopped
}


// Common Types/Classes/Interfaces
// =====================================================================

export type THTMLElementArray = HTMLElement[];


export class Attributes extends Map<string, unknown> {
	//
}

export type PageNavArgs = { pageNew: INavablePage, pageOld: INavablePage | null };


// ParameterSet Class
// =====================================================================

export class ParameterSet {
	private _params: any;

	constructor(params?: any) {
		this._params = params;
	}

	public init(params: any) {
		this._params = params;
	}

	public hasParam(key: string): boolean {
		return (!!this._params[key]);
	}

	public getParam(key: string): any {
		return this._params[key];
	}

	public getParamString(key: string): string {
		return this._params[key] as string;
	}

	public getParamStringOrNull(key: string): string | null {
		return (this._params[key]) ? this._params[key] as string : null;
	}

	public getString(key: string, lang: string, langDefault?: string): string {
		let strResult;
		let param = this._params[key];
		if (Helper.isJsonObject(param)) {
			strResult = param[lang];
			if (!strResult && langDefault) {
				strResult = param[langDefault];
			}
			if (!strResult) {
				let keys = Object.keys(param);
				if (keys.length > 0) {
					strResult = param[keys[0]] as string;
				}
			}
		} else {
			if (Helper.isString(param)) {
				strResult = <string>param;
			}
		}
		//
		return strResult;
	}

} // ParameterSet


// Event Support
// =====================================================================

export type EventHandler<TArgs> = (sender: any, args: TArgs) => void;

export interface IEventNest<TArgs> {
	subscribe(handler: EventHandler<TArgs>): void;
	unsubscribe(handler: EventHandler<TArgs>): void;
	raise(args: TArgs): void;
}

// IStringsProvider Interface
// =====================================================================

export interface IStringsProvider {
	readonly hasStrings: boolean;
	readonly urlStrings: string;
	readonly langs: string[];
}


// UIControl support
// =====================================================================

export class StylesMap extends Map<string, HTMLStyleElement> {
}

export class ElementsMap extends Map<string, HTMLElement> {
}

export class TemplatesMap extends Map<string, HTMLTemplateElement> {
}

export type TTemplateSet = { styles: StylesMap, templates: TemplatesMap, elements: ElementsMap };

export type TControlBuildParts = {
	style?: HTMLStyleElement | StylesMap;
	header?: HTMLElement;
	lower?: HTMLElement[];
	workarea?: HTMLElement;
	upper?: HTMLElement[];
	footer?: HTMLElement;
};

export enum ControlStartPoints {
	BeforeSync,
	BeforeAsync,
	AfterSync,
	AfterAsync,
	Manual
}

export enum ControlStates {
	Init,
	Work,
	Pending,
	Error
}

export type TControlStateChangedArgs = { stateNew: ControlStates, stateOld: ControlStates };

export interface IComparable<T> {
	compareTo(other: T): number;
}

export interface IDisposable {
	dispose(): void;
}


export interface IBookItem {
	readonly classname: string;
	readonly page: IBookPage;
	readonly attrs: Attributes;
}


export interface IControlElement extends IDisposable, IVisualElement, IBookItem {
	readonly id: string;
	readonly startpoint: ControlStartPoints;
	forceStartPoint(startpoint: ControlStartPoints): void;
	readonly libref: IExtLibrary;
	readonly location: string;
	readonly resroot: string;

	readonly eventStateChanged: EventNest<TControlStateChangedArgs>;
}

export type TControlMap = Map<string, IControlElement>;

export interface IControlFactory {
	readonly libref: IInnerLib;
	has(controlname: string): boolean;
	create(name: string, page: IBookPage, presenter: HTMLElement, startpoint?: ControlStartPoints): Promise<IControlElement | null>;
}


// Book support
// =====================================================================

export interface IVisualElement {
	readonly presenter: HTMLElement;
}

export interface ILazyProvider {
	getLazyContainer(lazyowner: IVisualElement, token: any): IVisualElement;
	fillLazyContainer(container: IVisualElement): Promise<void>;
}

export enum NavableStates {
	Initial,
	Preparing,
	Displaying,
	Displayed,
	Outgoing,
	Invisible
}

export type TNavableStateChangedArgs = { stateNew: NavableStates, stateOld: NavableStates };
export type TNavableAttachedArgs = { isAttached: boolean };

export interface INavablePage extends IVisualElement {
	readonly life: PageLifeKinds;
	readonly index: number;
	readonly isProcessed: boolean;
	// 
	readyNavigation(): Promise<INavablePage>;
	notifyRejection(): void;
	notifyAttached(): Promise<INavablePage>;
	notifyDetached(): void;
	notifyComing(): Promise<INavablePage>;
	notifyDisplay(): void;
	notifyOutgoing(): Promise<INavablePage>;
	notifyHidden(): void;
	updateLayout(): void;
	forceLifeMode(mode: PageLifeKinds): void;
	equal(another?: INavablePage | null): boolean;
	//
	readonly state: NavableStates;
	readonly isAttached: boolean;
	eventStateChanged: EventNest<TNavableStateChangedArgs>;
	eventProcessed: EventNest<void>;
}

export interface IBookNavigation {
	readonly canNextPage: boolean;
	readonly canPrevPage: boolean;
	toStartPage(): void;
	toCover(): void;
	toContents(): void;
	toNextPage(): void;
	toPrevPage(): void;
	toPage(page: INavablePage): void;
}

export interface IDynamicExtensions {
	attachStyle(key: string, style: HTMLStyleElement | StylesMap): void;
	detachStyle(key: string): void;
	attachScript(key: string, script: HTMLScriptElement): void;
	detachScript(key: string): void;
	//
	attachStyleLink(key: string, filepath: string): Promise<HTMLLinkElement | null>;
	unloadStyle(key: string): void;
	loadScript(key: string, filepath: string): Promise<HTMLScriptElement>;
	unloadScript(key: string): void;
}


export interface IBookFrame extends IBookNavigation, IDynamicExtensions {
	readonly book: IBook;
	notifyUsedLibrary(libref: IExtLibrary): Promise<void>;
	readonly eventNavigating: EventNest<PageNavArgs>;
	readonly eventNavigated: EventNest<PageNavArgs>;
}

export interface IPopupModal {
	presenter: HTMLElement;
	isProcessed: boolean;

	init(): Promise<any>;
	notifyAttached(): void;
	notifyOpened(): Promise<void>;
	notifyDetached(): void;
	callbackCloseMe: () => void;
}

export type TModalExtCss = { frame?: string | undefined, close?: string | undefined };


export enum PageProcessorStates {
	Init,
	Processing,
	Processed,
	Error
}

export type TPageProcessorStateChangedArgs = { stateNew: PageProcessorStates, stateOld: PageProcessorStates };

export interface IPageProcessor {
	readonly state: PageProcessorStates;
	readonly eventStateChanged: EventNest<TPageProcessorStateChangedArgs>;
	createControl(hteMarkupItem: HTMLElement): Promise<IControlElement | null>;
	processHTMLScope(hte: HTMLElement, mapControls?: TControlMap): Promise<void>;
	resolvePath(path: string): string;
	resolveMarkupLinks(hte: HTMLElement): void;
}


export interface IBookPage extends INavablePage {
	readonly id: string;
	readonly book: IBook;
	readonly urlPage: string;
	readonly urlRoot: string;
	readonly number: string | null;
	readonly pubinfo: string;
	readonly eventPresenterCreated: EventNest<HTMLElement>;
	readonly eventPresenterReleased: EventNest<null>;
	readonly eventScroll: EventNest<Event>;
	readonly eventResize: EventNest<Event>;

	readonly processor: IPageProcessor;

	// Infrastructure
	getCfg(): any;

	// Modal support
	showModal(modal: IPopupModal, extcss?: TModalExtCss): void;
	hideModal(): void;
	isModal: boolean;

	// Service
	getClientVisibleArea(): DOMRect;
	translateClientRect(ve: IVisualElement | HTMLElement): DOMRect;
	getElemVisibleArea(velem: IVisualElement): DOMRect | null;
	ensureVisible(velem: IVisualElement, gravity: Layouts, indent: number): void;

	// Aux
	readonly hasPresenter: boolean;
	getPageBody(): HTMLElement | null;
	getPathView(): string;
	tag: any;
}

export type TBookPages = IBookPage[];

export interface IBookContents {
	readonly presenter: HTMLElement;
	readonly book: IBook;
}

export interface IBook extends IStringsProvider {
	readonly frame: IBookFrame | null;
	readonly pathLocal: string;
	readonly url: string;	
	readonly id: string;
	readonly name: string;
	readonly version: string;
	readonly cachever: string;
	readonly token: string;
	readonly contents: IBookContents | undefined;
	readonly pages: TBookPages;
	readonly pageCover: IBookPage | null;
	readonly pageContents: IBookPage | null;
	readonly isLoaded: boolean;
	equalLocalPath(path: string): boolean;
	resolveBookPath(pathInner: string, page?: IBookPage): string;
	getPageById(strId: string): IBookPage | null;
	getPageByIndex(nIndex: number): IBookPage;
}


export type TBooks = IBook[];


// System support
// =====================================================================

export interface IAppSettings {
	getValue(settingname: string): any;
	getString(settingname: string): string | null;
	getNumber(settingname: string): number | null;
}

export interface IExchange {
	__init(): Promise<any>;
	do(cmd: unknown, exchdata: unknown, broadcast: boolean): Promise<unknown>;
}

export interface IStringsManager {
	getString(key: string, provider?: IStringsProvider | null): Promise<string>;
	getFormatted(key: string, provider: IStringsProvider | null | undefined, ...args: any[]): Promise<string>;
	processText(text: string, provider?: IStringsProvider): Promise<string>;
	processScope(scope: HTMLElement | DocumentFragment, provider?: IStringsProvider): Promise<void>;
}

export interface ILibManager {
	readonly engine: ISysLibrary;
	readonly shell: ISysLibrary;
	readonly syslibs: Map<string, ISysLibrary>;
	readonly extlibs: Map<string, IExtLibrary>;
	getLibByName(strName: string): IInnerLib | null;

}

export interface IInnerLib extends IStringsProvider {
	readonly name: string;
	readonly urlRoot: string;
	readonly urlAssets: string;
	//
	makeFullPath(innerpath: string): string;
}

export interface ISysLibrary extends IInnerLib {
	resolveMarkupLinks(node: ParentNode): void;
	resolveResourceRef(path: string): string;
	resolveFilePath(path: string): string;
	getTemplate(templref: string, key: string): Promise<HTMLTemplateElement | null>;
}

export interface IExtLibrary extends IInnerLib {
	readonly factory: IControlFactory;
	readonly stylepath: string | null;
	resolveMarkupLinks(node: ParentNode, control: IControlElement): void;
	resolveResourceRef(path: string, control: IControlElement): string;
	resolveFilePath(path: string, control: IControlElement): string;
	getTemplate(templref: string, key: string, control: IControlElement): Promise<HTMLTemplateElement | null>;
}

export interface IBookCatalog {
	getBookInfoById(id: string): any;
	getBookPathById(id: string): string | null;
	getBookInfoList(bSort?: boolean): any[];
	getRoot(): [];
	resolvePath(pathInner: string): string;
}

export interface IOuterTube {
	readonly DIR_SEP: string;
	readonly WINDIR_SEP: string;

	getFileName(strPath: string): string;
	changeExtension(fileName: string, strExtension: string): string;
	extractDirectory(path: string): string;
	splitFileName(path: string): [string, string | null];
	separateQueryString(path: string): [string, string | null];
	ensureSepStart(path: string): string;
	ensureNoSepStart(path: string): string;
	ensureSepEnd(path: string): string;
	ensureNoSepEnd(path: string): string;
	equalPaths(path1: string, path2: string): boolean;
	extractUrlBase(path: string): string;
	combinePath(path1: string, path2: string): string;
	loadJson(path: string, vernum?: string): Promise<any>;
	loadHTML(path: string, vernum?: string): Promise<string>;
}

export enum AppStates {
	Error = -1,
	Undef = 0,
	Init = 1,
	Ready = 2,
	Work = 3,
	Stopping = 4,
	Stoped = 5
}

export enum ActiveBookStates {
	Undef,
	NoBook,
	Opening,
	Opened
}

export type TAppStateChangedArgs = { stateNew: AppStates, stateOld: AppStates };

export type TBookEventArgs = { book: IBook };


export interface IAppDB {
	informBookOpened(booktoken: string): void;
	informBookClosed(booktoken: string): void;
	isBookOpened(booktoken: string): boolean;
	getOpenedBooksInfo(): Map<string, number>;
	clearBookOpened(): void;
	//
	saveLocalData(key: string, data: string | number | object): void;
	getLocalNumberData(key: string): number;
	getLocalStringData(key: string): string;
	getLocalObjectData(key: string): any;
	removeLocalData(key: string): void;
}

export interface IMainView {
	showModal(modal: IPopupModal): void;
	hideModal(): void;
	isModal: boolean;
	//
	showMessage(type: MessageTypes, message: string, caption?: string, displaytime?: number): void;
	showError(err: unknown, displaytime?: number): void;
	showInfoPanel(): void;
	hideInfoPanel(): void;
	//
	readonly stateActiveBook: ActiveBookStates;
	readonly eventBookOpened: EventNest<TBookEventArgs>;
	readonly eventBookClosed: EventNest<TBookEventArgs>;
	//
	openBook(bookpath: string, startpageid: string | null): Promise<IBookFrame>;
	closeBook(book: IBook | null): void;
	readonly hasActiveBook: boolean;
	getActiveBook(): IBook | null;
}

export interface IShell {
	/*
		This interface must be implemented in the VMBook System for Books to interact with the System Shell and with each other.
		In Mobclass, this interface is not used.
	 */
	readonly openedbooks: TBooks;
	toHome(): void; // Go to the home page of the System Shell.
}

