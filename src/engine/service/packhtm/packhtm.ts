import { Helper } from "../../service/aid/aid.js";
import * as UIBase from "../../system/common/uibase.js";
import { App } from "../../system/runtime/app.js";
//

/*
	Grigory. Идея такого упакованного HTML исходника в JSON формат, мне кажется удобной 
	(хотя возможно есть готовые решения, не такие самопальные). Но реализация 
	парсера "class PackHtm" и самого формата, — слабо продуманы и сделаны на скорую руку.
	Этим надо серьёзно заняться при возможности.
*/


//
//  JSON (Packed HTML) to normal HTML converting
//

enum PackHtm_ItemTypes {
	Unknown,
	String,
	Object,
	Array
}

type TPackHtm_ParsedKey = { isContainer: boolean, tag: string | null, class: string };


export abstract class PackHtm {
	/* Class Variables and Constants
	----------------------------------------------------------*/
	private static _doc: Document = document;


	/* Construction / Initialization / Desctruction
	----------------------------------------------------------*/



	/* Infrastructure
	----------------------------------------------------------*/



	/* Public Members
	----------------------------------------------------------*/

	public static parseToArray(jsonsrc: any, doc: Document = document): UIBase.THTMLElementArray {
		this._doc = doc;
		let aResult: UIBase.THTMLElementArray = [];
		//
		// Верхний уровень
		//
		if (Helper.isArray(jsonsrc)) {
			let aJsonSrc = jsonsrc as [];
			for (let i = 0; i < aJsonSrc.length; i++) {
				this._doParse(aJsonSrc[i], aResult, null);
			}
		} else if (Helper.isJsonObject(jsonsrc)) {
			this._doParse(jsonsrc, aResult, null);
		} else if (Helper.isString(jsonsrc)) {
			let hteDiv = doc.createElement("div");
			hteDiv.innerHTML = <string>jsonsrc;
			aResult.push(hteDiv);
		}
		//
		return aResult;
	}

	public static parseToElement(jsonsrc: any, doc: Document = document): HTMLElement {
		let aResult: UIBase.THTMLElementArray = this.parseToArray(jsonsrc, doc);
		//
		let hteResult: HTMLElement;
		if (aResult.length === 1) {
			hteResult = aResult[0];
		} else {
			hteResult = doc.createElement("div");
			hteResult.append(...aResult);
		}
		//
		hteResult.classList.add("bk-packhtm");
		return hteResult;
	}


	/* Internal Members
	----------------------------------------------------------*/

	/** Recursive function
	 * The item can only be a object or an array  
	 */
	private static _doParse(item: any, aResult: UIBase.THTMLElementArray, hteParent: HTMLElement | null): void {
		switch (this._getJsongItemType(item)) {
			case PackHtm_ItemTypes.Object: {
				let keys = Object.keys(item);
				for (let iKey = 0; iKey < keys.length; iKey++) {
					let strKey = keys[iKey];
					let prop: any = item[strKey];
					switch (this._getJsongItemType(prop)) {
						case PackHtm_ItemTypes.Object: {
							this._process_Object(strKey, prop, aResult, hteParent);
							break;
						}
						case PackHtm_ItemTypes.Array: {
							this._process_Array(strKey, prop, aResult, hteParent);
							break;
						}
						case PackHtm_ItemTypes.String: {
							this._process_String(strKey, prop, aResult, hteParent);
							break;
						}
					} // switch
				}
				break;
			}
			case PackHtm_ItemTypes.Array: {
				for (let i = 0; i < item.length; i++) {
					let nesteditem = item[i];
					if (this._getJsongItemType(nesteditem) === PackHtm_ItemTypes.Object) {
						this._doParse(nesteditem, aResult, hteParent);
					} else {
						App.logWarning(PackHtm.name + "." + PackHtm._doParse.name + ": Wrong type of the JSON Item.", Helper.getObjectName(this));
					}
				}
				break;
			}
			default: {
				App.logWarning(PackHtm.name + "." + PackHtm._doParse.name + ": Wrong type of the JSON Item.", Helper.getObjectName(this));
				break;
			}
		} // switch
	}


	//
	// Не факт, что аргументы функций окончательно определены ...
	//

	private static _process_String(strKey: string | null, strSrc: string, aResult: UIBase.THTMLElementArray, hteParent: HTMLElement | null, deftag: string | null = null): void {
		/*
			Вызов этой ф. может быть в трёх ситуациях:
			1) Из ф. _parseFormattedTextItem, когда item явл. Объектом и значение (prop) явл. строкой.
			В этом случае strKey не null, а deftag = null.
		
			2) Из ф. _processFT_Object, в этом случае (с выс. вероятн.) hteParent <> null, а deftag (вероятно) "p". 

			3) Из ф. _processFT_Array (далее будем думать ...).
		*/

		let hteResult: HTMLElement | null = null;

		if (strKey) {

			// Анализируем key: 
			// 1) имеет ли в начале "<",
			// 2) а открыт или закрыт в конце (т.е. ">") - не имеет значения!

			let parsedkey: TPackHtm_ParsedKey = this._parseKey(strKey);
			if (!parsedkey.tag) {
				parsedkey.tag = "div";
			}
			//
			hteResult = this._buildHTMLElement(parsedkey, strSrc);
		} else {
			// в этом случае строка поступила из массива и тут:
			// если Key для массива был закрыт, то hteParent должен быть null,
			// если Key для массива был открыт то будет hteParent (но это не касается списков: ul и ol парент всегда должен быть)

			// !!! Возможно НАДО ВВЕСТИ ПАРАМЕТР/АРГУМЕНТ DefaultTag !!! (p, li и т.п. для разных случаев!!!)

		}

		if (hteResult) {
			if (hteParent) {
				hteParent.appendChild(hteResult);
			} else {
				aResult.push(hteResult);
			}
		}
	}

	private static _process_Object(strKey: string | null, obj: any, aResult: UIBase.THTMLElementArray, hteParent: HTMLElement | null): void {
		//
		// по идее:
		// если strKey = null то hteParent != null ???

	}

	private static _process_Array(strKey: string | null, aSrc: [], aResult: UIBase.THTMLElementArray, hteParent: HTMLElement | null): void {
		// если strKey = null то hteParent != null ???

		if (strKey) {
			let parsedkey: TPackHtm_ParsedKey = this._parseKey(strKey);
			if (parsedkey.tag === "ol" || parsedkey.tag === "ul") {
				// this is a List
				let hteList = this._buildHTMLElement(parsedkey);
				if (hteParent) {
					hteParent.appendChild(hteList);
				} else {
					aResult.push(hteList);
				}
				//
				for (let i = 0; i < aSrc.length; i++) {
					let hteListItem: HTMLElement = this._doc.createElement("li");
					hteList.appendChild(hteListItem);
					//
					let oArrayElem: any = aSrc[i];
					switch (this._getJsongItemType(oArrayElem)) {
						case PackHtm_ItemTypes.String: {
							hteListItem.innerHTML = oArrayElem as string;
							break;
						}
						case PackHtm_ItemTypes.Object: {
							this._process_Object(null, oArrayElem, aResult, hteListItem);
							break;
						}
						case PackHtm_ItemTypes.Array: {
							this._process_Array(null, oArrayElem, aResult, hteListItem);
							break;
						}
					}
				} // for
			} else {
				// that is, not a list
				if (!parsedkey.tag) {
					parsedkey.tag = "div";
				}
				//
				if (parsedkey.isContainer) {
					let hteArrayItemParent = this._buildHTMLElement(parsedkey);
					if (hteParent) {
						hteParent.appendChild(hteArrayItemParent);
					} else {
						aResult.push(hteArrayItemParent);
					}
					//
					for (let i = 0; i < aSrc.length; i++) {
						let oArrayElem: any = aSrc[i];
						switch (this._getJsongItemType(oArrayElem)) {
							case PackHtm_ItemTypes.String: {
								let hteParagraph = this._doc.createElement("p");
								hteParagraph.innerHTML = oArrayElem as string;
								hteArrayItemParent.appendChild(hteParagraph);
								break;
							}
							case PackHtm_ItemTypes.Object: {
								this._process_Object(null, oArrayElem, aResult, hteArrayItemParent);
								break;
							}
							case PackHtm_ItemTypes.Array: {
								this._process_Array(null, oArrayElem, aResult, hteArrayItemParent);
								break;
							}
						}
					} // for
				} else {
					for (let i = 0; i < aSrc.length; i++) {
						let hteNew: HTMLElement = this._buildHTMLElement(parsedkey);
						if (hteParent) {
							hteParent.appendChild(hteNew);
						} else {
							aResult.push(hteNew);
						}
						//
						let oArrayItem: any = aSrc[i];
						switch (this._getJsongItemType(oArrayItem)) {
							case PackHtm_ItemTypes.String: {
								hteNew.innerHTML = oArrayItem as string;
								break;
							}
							case PackHtm_ItemTypes.Object: {
								this._process_Object(null, oArrayItem, aResult, hteNew);
								break;
							}
							case PackHtm_ItemTypes.Array: {
								this._process_Array(null, oArrayItem, aResult, hteNew);
								break;
							}
						}
					} // for
				}
			}
		} else {
			// да, если массив оказался в др. массиве. будет ли обрабатываться эта ситуация?
			// по идее hteParent != null (в этой ситуации)
			// пока не обрабатываем:
			App.logWarning(PackHtm.name + "." + PackHtm._process_Array.name + ": Wrong data type (Array without Key).", Helper.getObjectName(this));
		}
	}

	// 

	private static _getJsongItemType(item: any): PackHtm_ItemTypes {
		if (Helper.isJsonObject(item)) {
			return PackHtm_ItemTypes.Object;
		} else if (Helper.isArray(item)) {
			return PackHtm_ItemTypes.Array;
		} else if (Helper.isString(item)) {
			return PackHtm_ItemTypes.String;
		} else {
			return PackHtm_ItemTypes.Unknown;
		}
	}


	/* Service 
	----------------------------------------------------------*/

	private static _parseKey(strKey: string): TPackHtm_ParsedKey {
		strKey = strKey.trim();
		//
		let hasTag: boolean = Helper.startsWith(strKey, "<");
		let nEndTrimPos: number = (Helper.endsWith(strKey, "/>") ? 2 : (Helper.endsWith(strKey, ">") ? 1 : 0));
		let bSingleElem: boolean = nEndTrimPos === 0;
		//
		let nStart: number = (hasTag) ? 1 : 0;
		let strKeyData = strKey.substr(nStart, (bSingleElem) ? undefined : (strKey.length - (nStart + nEndTrimPos))).trim();
		//
		let strTag: string | null = null;
		if (hasTag) {
			nStart = strKeyData.indexOf(" ");
			if (nStart > 0) {
				strTag = strKeyData.substr(0, nStart);
				strKeyData = strKeyData.substr(nStart + 1).trim();
			} else {
				strTag = strKeyData;
				strKeyData = "";
			}
		}
		//
		let res: TPackHtm_ParsedKey = { isContainer: bSingleElem, tag: strTag, class: strKeyData };
		return res;
	}

	private static _buildHTMLElement(parsedkey: TPackHtm_ParsedKey, data: string | null = null): HTMLElement {
		let hte: HTMLElement = PackHtm._doc.createElement(parsedkey.tag as string);
		hte.className = parsedkey.class;
		if (data) {
			hte.innerHTML = data;
		}
		//
		return hte;
	}


	/* Event Handlers
	----------------------------------------------------------*/



	/* State Machine
	----------------------------------------------------------*/



} // PackHtm
