import { Helper } from "../../service/aid/aid.js";
import * as UIBase from "../common/uibase.js";
import { ErrorCase } from "./error.js";
import { App } from "./app.js";
//

// Strings Manager Class
// =====================================================================

export class StringsManager implements UIBase.IStringsManager {
	// Class Variables and Constants
	// -------------------------------------------------------------------
	private _lang: string = "";

	private _aBaseProviders: UIBase.IStringsProvider[] = [];
	private _strings: any;
	private _mapDynamicProviders = new Map<UIBase.IStringsProvider, any>();
	private _queue: unknown[] = new Array();
	//

	// Construction / Initialization
	// -------------------------------------------------------------------

	public async init(lang: string, aBaseProviders: UIBase.IStringsProvider[]): Promise<any> {
		this._aBaseProviders = aBaseProviders;
		this._lang = lang;
		this._strings = await this._loadBaseStrings();
		this._checkQueue();
	}


	// Infrastructure
	// -------------------------------------------------------------------

	public async setLang(lang: string): Promise<any> {
		this._lang = lang;
		//
		this._mapDynamicProviders.clear();
		//
		this._strings = await this._loadBaseStrings();
		this._checkQueue();
	}


	// IStringsManager Implementation
	// -------------------------------------------------------------------

	public async getString(key: string, provider?: UIBase.IStringsProvider | null): Promise<string> {
		let strings = (provider) ? await this._getProviderStrings(provider) : this._strings;
		return strings[key];
	}

	public async getFormatted(key: string, outersrc: UIBase.IStringsProvider | null | undefined, ...args: any[]): Promise<string> {
		let str = await this.getString(key, outersrc);
		return Helper.formatString(str, args);
	}

	public async processText(text: string, provider?: UIBase.IStringsProvider): Promise<string> {
		// the function is not debugged
		let aResults: string[] = [];
		let entryOpen = "{#";
		let entryClose = "#}";
		//
		let nIndexCurrent = 0;
		do {
			let nIndexStart = text.indexOf(entryOpen, nIndexCurrent);
			if (nIndexStart > 0) {
				let nIndexStartKey = nIndexStart + entryOpen.length;
				let nIndexEnd = text.indexOf(entryClose, nIndexStartKey);
				if (nIndexEnd > 0) {
					aResults.push(text.substr(nIndexCurrent, nIndexStart));
					let strKey = text.substr(nIndexStartKey, (nIndexEnd - nIndexStartKey));
					let strTarget = await this.getString(strKey, provider);
					aResults.push(strTarget);
					//
					nIndexStart = (nIndexEnd + entryClose.length);
				} else {
					nIndexCurrent = -1;
				}
			} else {
				nIndexCurrent = -1;
			}
		} while (nIndexCurrent > 0);
		//
		return aResults.join();
	}

	public async processScope(scope: HTMLElement | DocumentFragment, provider?: UIBase.IStringsProvider): Promise<void> {
		if (!(this._strings)) {
			this._queue.push(scope);
			return;
		}
		//
		const stringsApp: any = this._strings;
		const stringsExtra: any = (provider) ? await this._getProviderStrings(provider) : null;
		//
		let elements: NodeListOf<Element> = this._extractStringElements(scope);
		for (let i: number = 0; i < elements.length; i++) {
			let elem: HTMLElement = elements[i] as HTMLElement;
			//
			let strParams = elem.dataset.str as string;
			//
			//
			if (strParams) {
				let aParamItem: string[] = strParams.replace(";", ",").split(",");
				for (let j: number = 0; j < aParamItem.length; j++) {
					let operator: string[] = aParamItem[j].split(":");
					if (operator.length < 1 || operator.length > 2) { continue; }
					//
					let strAttrName: string = ""; let strValueRef: string = "";
					if (operator.length === 1) {
						strValueRef = operator[0].trim();
					} else {
						strAttrName = operator[0].trim();
						strValueRef = operator[1].trim();
					}
					//
					let strSuffix: string | null = null;
					let nSuff = strValueRef.indexOf("@");
					if (nSuff >= 0) {
						strSuffix = strValueRef.substr(nSuff + 1);
						strValueRef = strValueRef.substr(0, nSuff);
					}
					//
					let strValue: string | null = null;
					if (Helper.startsWith(strValueRef, "~")) {
						if (stringsExtra) {
							strValue = stringsExtra[strValueRef.substring(1)];
						}
					} else {
						strValue = stringsApp[strValueRef];
					}
					//
					if (strValue && strSuffix) {
						if (!Helper.endsWith(strValue, strSuffix)) {
							strValue += strSuffix;
						}
					}
					//
					if (strValue) {
						if (strAttrName) {
							elem.setAttribute(strAttrName, strValue);
						} else {
							elem.innerHTML = strValue;
						}
					}
				}
			} // for j
		} // for i
	}


	// Internal Members
	// -------------------------------------------------------------------

	private async _loadBaseStrings(): Promise<any> {
		let aPromises: Promise<any>[] = [];
		for (let i = 0; i < this._aBaseProviders.length; i++) {
			let provider = this._aBaseProviders[i];
			if (provider.urlStrings) {
				let pathStringsFile: string;
				if (Helper.hasArrayItem(provider.langs, this._lang)) {
					pathStringsFile = App.tube.combinePath(provider.urlStrings, this._lang + ".json");
				} else {
					// otherwise, we use the first language for this source(provider)
					pathStringsFile = App.tube.combinePath(provider.urlStrings, provider.langs[0] + ".json");
				}
				//
				aPromises.push(App.tube.loadJson(pathStringsFile));
			}
		}
		//
		let results = await Promise.all(aPromises);
		let target = results[0];
		if (results.length > 1) {
			// we combining string resources into a common container (only for base libraries)
			for (let j = 1; j < results.length; j++) {
				target = Object.assign(target, results[j]);
			}
		}
		//
		return target;
	}

	private async _getProviderStrings(provider: UIBase.IStringsProvider): Promise<any> {
		let objStrings = this._mapDynamicProviders.get(provider);
		if (!objStrings) {
			if (provider.hasStrings) {
				let pathStringsFile: string;
				if (Helper.hasArrayItem(provider.langs, this._lang)) {
					pathStringsFile = App.tube.combinePath(provider.urlStrings, this._lang + ".json");
				} else {
					// otherwise, we use the first language for this source(provider)
					pathStringsFile = App.tube.combinePath(provider.urlStrings, provider.langs[0] + ".json");
				}
				//
				try {
					objStrings = await App.tube.loadJson(pathStringsFile);
				} catch (err) {
					let strMessage = `${ErrorCase.extractMessage(err)} | path=${pathStringsFile}`;
					throw new Error(await this.getFormatted("errStringsLoad", null, strMessage));
				}
			} else {
				objStrings = {};
			}
			//
			this._mapDynamicProviders.set(provider, objStrings);
		}
		//
		return objStrings;
	}


	private _extractStringElements(scope: HTMLElement | DocumentFragment): NodeListOf<Element> {
		return scope.querySelectorAll("[data-str]");
	}

	private _checkQueue(): void {
		if (this._queue.length > 0) {
			for (let i: number = 0; i < this._queue.length; i++) {
				let item: unknown = this._queue[i];
				if (item instanceof DocumentFragment) {
					this.processScope(<DocumentFragment>item);
				} else {
					this.processScope(<HTMLElement>item);
				}
			}
			//
			this._queue.length = 0;
		}
	}
	
} // END class StringsManager
