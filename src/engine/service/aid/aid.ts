// Common Helper
// =====================================================================

export abstract class Helper {
	public static hasString(str: string | undefined | null): boolean {
		return !!((str && str.length > 0)); // ???
	}

	public static isString(str: any): boolean {
		return (typeof str === "string");
	}

	public static isNumber(val: any): boolean {
		return (typeof val === "number");
	}

	public static fetchString(val: any): string {
		if (this.isString(val)) {
			return <string>val;
		}
		//
		return "";
	}


	public static formatString(str: string, ...args: any[]): string {
		if (!str) {
			return "undefined!";
		}
		//
		let a = Array.prototype.slice.call(args, 0);
		if (a.length === 0) {
			return str;
		}
		//
		if (Array.isArray(a[0])) {
			a = a[0];
		}
		//
		return str.replace(/\{(\d+)\}/g, (match, index) => {
			const param = a[index];
			return (param) ? param.toString() : "?";
		});
	}


	public static convertSecondsToTime(secs: number) {
		if (Number.isNaN(secs)) {
			secs = 0;
		}
		//
		let hours = Math.floor(secs / 3600);
		let minutes = Math.floor(secs % 3600 / 60);
		let seconds = Math.ceil(secs % 3600 % 60);
		//
		return (hours === 0 ? "" : hours > 0 && hours.toString().length < 2 ? "0" + hours + ":" : hours + ":") + (minutes.toString().length < 2 ? "0" + minutes : minutes) + ":" + (seconds.toString().length < 2 ? "0" + seconds : seconds);
	}

	public static convertNodeListToArray(list: NodeListOf<any>): any[] {
		return Array.prototype.slice.call(list);
	}

	public static zeroPad(num: number, places: number): string {
		let zero = places - num.toString().length + 1;
		return Array(+(zero > 0 && zero)).join("0") + num;
	}

	public static extractValue(strPair: string, strKey: string): string {
		let parts: string[] = strPair.split(strKey);
		return (parts.length > 1) ? parts[parts.length - 1].trim() : "";
	}

	public static extractTime(theDate: Date): string {
		return leftpad(theDate.getHours(), 2)
			+ ":" + leftpad(theDate.getMinutes(), 2)
			+ ":" + leftpad(theDate.getSeconds(), 2);
		//
		function leftpad(val: any, resultLength = 2, leftpadChar = "0"): string {
			return (String(leftpadChar).repeat(resultLength)
				+ String(val)).slice(String(val).length);
		}
	}

	public static convertDateToString(theDate: Date): string {
		let yyyy = theDate.getFullYear().toString();
		let nmm = theDate.getMonth() + 1;
		let ndd = theDate.getDate();

		let dd = (ndd < 10) ? `0${ndd}` : `${ndd}`;
		let mm = (nmm < 10) ? `0${nmm}` : `${nmm}`;

		let strDate = yyyy + "-" + mm + "-" + dd;
		return strDate;
	}

	public static convertDateTimeToString(theDate: Date): string {
		let yyyy = theDate.getFullYear().toString();
		let nmm = theDate.getMonth() + 1;
		let ndd = theDate.getDate();

		let dd = (ndd < 10) ? `0${ndd}` : `${ndd}`;
		let mm = (nmm < 10) ? `0${nmm}` : `${nmm}`;

		//

		let nh = theDate.getHours();
		let nm = theDate.getMinutes();
		let ns = theDate.getSeconds();

		let h = (nh < 10) ? `0${nh}` : `${nh}`;
		let m = (nm < 10) ? `0${nm}` : `${nm}`;
		let s = (ns < 10) ? `0${ns}` : `${ns}`;

		let strDateTime = yyyy + "-" + mm + "-" + dd + " " + h + ":" + m + ":" + s;
		return strDateTime;
	}

	public static getDateNowString(): string {
		return this.convertDateToString(new Date(Date.now()));
	}

	public static getDateTimeNowString(): string {
		return this.convertDateTimeToString(new Date(Date.now()));
	}


	public static startsWith(strSubj: string, strSearch: string): boolean {
		return strSubj.startsWith(strSearch);
	}

	public static ensureStartsWith(strSubj: string, strStart: string): string {
		return (strSubj.startsWith(strStart)) ? strSubj : (strStart + strSubj);
	}


	public static endsWith(strSubj: string, strSearch: string, nPos?: number): boolean {
		if (nPos === undefined || nPos > strSubj.length) {
			nPos = strSubj.length;
		}
		//
		nPos -= strSearch.length;
		const lastIndex = strSubj.indexOf(strSearch, nPos);
		return lastIndex !== -1 && lastIndex === nPos;
	}

	public static ensureEndsWith(strSubj: string, strEnd: string): string {
		return (this.endsWith(strSubj, strEnd)) ? strSubj : (strSubj + strEnd);
	}


	public static cutEnd(strSubj: string, strEnd: string): string {
		let nPos = strSubj.indexOf(strEnd);
		if (nPos >= 0) {
			strSubj = strSubj.substr(0, nPos);
		}
		//
		return strSubj;
	}


	public static isObject(obj: any): boolean {
		return (typeof obj === "object");
	}

	public static isJsonObject(variable: any): boolean {
		return (variable && !Array.isArray(variable)) ? (typeof variable === "object") : false;
	}

	public static isArray(variable: any): boolean {
		return (variable && Array.isArray(variable));
	}

	public static hasArrayItem<T>(arr: T[], value: T): boolean {
		for (let i = 0; i < arr.length; i++) {
			if (arr[i] === value) {
				return true;
			}
		}
		//
		return false;
	}

	public static findInArray<T>(arr: T[], value: T): number {
		let nResult = -1;
		for (let i = 0; i < arr.length; i++) {
			if (arr[i] === value) {
				nResult = i;
				break;
			}
		}
		//
		return nResult;
	}

	public static getInteger(val: any): number | null {
		if (val === undefined || val === null) {
			return null;
		}
		//
		return parseInt(val.toString(), 0);
	}


	public static parseEnum<T>(value: string, enumType: T): T[keyof T] | undefined {
		if (!value) {
			return undefined;
		}
		//
		value = value.toLowerCase();
		// tslint:disable-next-line: forin
		for (const property in enumType) {
			const enumMember = enumType[property];
			if (typeof enumMember === "string") {
				if (enumMember.toLowerCase() === value) {
					const key = enumMember as string as keyof typeof enumType;
					return enumType[key];
				}
			}
		}
		//
		return undefined;
	}

	/* Can be replaced with Object.keys(Enum) */
	public static extractEnumKeys<O extends object, K extends keyof O = keyof O>(obj: O): K[] {
		return Object.keys(obj).filter((k) => Number.isNaN(+k)) as K[];
	}

	public static getObjectName(obj: any): string {
		if (obj && obj.constructor) {
			return obj.constructor.name;
		}
		//
		return "Unknown";
	}


	public static compareIsNewerMajor(strOldVer: string, strNewVer: string): boolean {
		const aPartsOld = strOldVer.split(".");
		const aPartsNew = strNewVer.split(".");
		//
		if (aPartsOld.length > 0 && aPartsNew.length > 0) {
			const nMajorOld = parseInt(aPartsOld[0], 10);			
			const nMajorNew = parseInt(aPartsNew[0], 10);
			return (nMajorNew > nMajorOld);
		}
		//
		return (aPartsNew.length > 0);
	}


} // END Helper Class


// UI Aux
// =====================================================================

export type TCollapseEventsArg = {
	onshow?: (ev: Event) => void,
	onshown?: (ev: Event) => void,
	onhide?: (ev: Event) => void,
	onhidden?: (ev: Event) => void
};

export abstract class Markup {
	public static changeClass(hte: HTMLElement | null, strClassNew: string | null, strClassOld?: string | null, strQuerySelector?: string | null): void {
		if (hte) {
			const hteTarget: HTMLElement | null = (strQuerySelector) ? hte.querySelector(strQuerySelector) : hte;
			if (hteTarget) {
				if (strClassOld) {
					hteTarget.classList.remove(strClassOld);
				}
				if (strClassNew) {
					hteTarget.classList.add(strClassNew);
				}
			}
		}
	}

	public static isVisible(hte: HTMLElement): boolean {
		return (hte.offsetParent !== null);
	}

	public static enable(elem?: HTMLElement | null, bEnable: boolean = true): void {
		if (elem instanceof HTMLButtonElement || elem instanceof HTMLInputElement) {
			if (bEnable) {
				elem.removeAttribute("disabled");
			} else {
				elem.setAttribute("disabled", "disabled");
			}
		} else if (elem instanceof HTMLAnchorElement) {
			if (bEnable) {
				elem.classList.remove("disabled");
			} else {
				elem.classList.add("disabled");
			}
		} else if (elem instanceof HTMLElement) {
			if (bEnable) {
				elem.classList.remove("sys-disabled");
			} else {
				elem.classList.add("sys-disabled");
			}
		}

	}

	public static isEnabled(hte: HTMLElement): boolean {
		return !(hte.classList.contains("disabled") || hte.classList.contains("sys-disabled"));
	}

	public static isDisabled(hte: HTMLElement): boolean {
		return (hte.classList.contains("disabled") || hte.classList.contains("sys-disabled"));
	}

	public static clear(elem?: HTMLElement | null): void {
		if (elem instanceof HTMLInputElement) {
			(<HTMLInputElement>elem).value = "";
			(<HTMLInputElement>elem).checked = false;
		}
	}

	public static canHorizontallyScroll(element: HTMLElement): boolean {
		return (window.getComputedStyle(element).overflowY === "scroll") ? (element.scrollHeight > element.clientHeight) : false;
	}

	public static lockUI(list: NodeListOf<Element> | null): void {
		if (list) {
			list.forEach((elem: Element) => {
				if (elem instanceof HTMLElement && !elem.hasAttribute("sys-nolock")) {
					this.enable(elem, false);
				}
			});
		}
	}

	public static unlockUI(list: NodeListOf<Element> | null): void {
		if (list) {
			list.forEach((elem: Element) => {
				if (elem instanceof HTMLElement && !elem.hasAttribute("sys-nolock")) {
					this.enable(elem, true);
				}
			});
		}
	}

	public static getAbsoluteHeight(hte: HTMLElement | undefined | null): number {
		let nHeight: number = 0;
		if (hte) {
			nHeight = hte.offsetHeight;
			nHeight += parseInt(window.getComputedStyle(hte).getPropertyValue("margin-top"), 10);
			nHeight += parseInt(window.getComputedStyle(hte).getPropertyValue("margin-bottom"), 10);

		}
		return nHeight;

		/*
		https://stackoverflow.com/questions/10787782/full-height-of-a-html-element-div-including-border-padding-and-margin
		*/
		/* др. вариант
		let style = window.getComputedStyle(hte);
		let height = ["height", "padding-top", "padding-bottom"]
			.map((key) => parseInt(style.getPropertyValue(key), 10))
			.reduce((prev, cur) => prev + cur);
		*/
	}

	public static getMarginHeight(hte: HTMLElement): number {
		let nHeight: number = parseInt(window.getComputedStyle(hte).getPropertyValue("margin-top"), 10);
		nHeight += parseInt(window.getComputedStyle(hte).getPropertyValue("margin-bottom"), 10);
		return nHeight;
	}

	public static isHtmlAnchor(elem: HTMLElement): boolean {
		return (elem.tagName === "A");
	}

	public static copyElementStyle(hteSource: HTMLElement, hteTarget: HTMLElement) {
		const computedStyle = window.getComputedStyle(hteSource);
		Array.from(computedStyle).forEach((key) => {
			hteTarget.style.setProperty(key, computedStyle.getPropertyValue(key));
		});
	}


	public static prepareBootstrapExpander(hteExpander: HTMLElement, strId: string, handlers?: TCollapseEventsArg): HTMLElement | null {
		let togglers = hteExpander.querySelectorAll("[data-bs-target]");
		let hteCollapse: HTMLElement | null = null;
		if (togglers.length > 0) {
			hteCollapse = <HTMLElement>hteExpander.querySelector(".collapse");
			if (hteCollapse) {
				hteCollapse.dataset.bsParent = "#" + strId;
				let strCollapseElemId = strId + "Collapse";
				hteCollapse.id = strCollapseElemId;
				//
				for (let i = 0; i < togglers.length; i++) {
					(<HTMLElement>togglers[i]).dataset.bsTarget = "#" + strCollapseElemId;
				}
				//
				if (handlers) {
					if (handlers.onshow) {
						hteCollapse.addEventListener("show.bs.collapse", handlers.onshow);
					}
					if (handlers.onshown) {
						hteCollapse.addEventListener("shown.bs.collapse", handlers.onshown);
					}
					if (handlers.onhide) {
						hteCollapse.addEventListener("hide.bs.collapse", handlers.onhide);
					}
					if (handlers.onhidden) {
						hteCollapse.addEventListener("hidden.bs.collapse", handlers.onhidden);
					}
				} // if (handlers)
			}
		}
		//
		return hteCollapse;
	}

	public static getBoundsWithin(hteScope: HTMLElement, hteTarget: HTMLElement): DOMRect {
		let rcScope = hteScope.getBoundingClientRect();
		let rcTarget = hteTarget.getBoundingClientRect();
		//
		let rcResult: DOMRect = new DOMRect(rcTarget.left - rcScope.left, rcTarget.top - rcScope.top, rcTarget.width, rcTarget.height);
		return rcResult;
	}

} // Markup

