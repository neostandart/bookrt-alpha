import { Helper } from "../../service/aid/aid.js";
import * as UIBase from "../common/uibase.js";
//

// Files Read/Write Support
// =====================================================================

export class OuterTube implements UIBase.IOuterTube {
	public readonly DIR_SEP = "/";
	public readonly WINDIR_SEP = "\\";
	//
	private _cachever: string;
	//

	// Construction
	// -------------------------------------------------------------------

	constructor() {
		this._cachever = "010";
	}

	// Infrastructure
	// -------------------------------------------------------------------

	public setCacheVer(version: string): void {
		this._cachever = version;
	}

	// IOuterTube Implementation
	// -------------------------------------------------------------------

	public getFileName(strPath: string): string {
		let strFilename = strPath.substring(strPath.lastIndexOf("/") + 1);
		return strFilename;
	}

	public changeExtension(fileName: string, strExtension: string): string {
		let nExtenstionStart = -1;
		for (let i = fileName.length - 1; i > 0; i--) {
			let char = fileName[i];
			if (char === "\\" || char === "/") { break; }
			if (char === ".") {
				nExtenstionStart = i;
				break;
			}
		}

		if (nExtenstionStart > 0) {
			fileName = fileName.substr(0, nExtenstionStart);
		}

		if (!Helper.startsWith(strExtension, ".")) {
			fileName = fileName + ".";
		}

		return (fileName + strExtension);
	}

	public extractDirectory(path: string): string {
		try {
			let pos = path.lastIndexOf("/");
			if (pos < 0) { pos = path.lastIndexOf("\\"); }
			//
			return (pos > path.lastIndexOf(".")) ?
				path :
				path.substring(0, pos + 1);
		} catch (err) {
			return "???";
		}
	}

	public splitFileName(path: string): [string, string | null] {
		let ext: string | null = null;
		let nIndex = path.lastIndexOf(".");
		if (nIndex > 0) {
			ext = path.substr(nIndex);
			path = path.substr(0, nIndex);
		}
		//
		return [path, ext];
	}

	public separateQueryString(path: string): [string, string | null] {
		let nIndex = path.lastIndexOf("?");
		let result: [string, string | null] = (nIndex >= 0) ?
			[path.substr(0, nIndex), path.substr(nIndex + 1)] :
			[path, null];
		//
		return result;
	}

	public ensureSepStart(path: string): string {
		if (path.startsWith(this.DIR_SEP)) { return path; }
		//
		let nIndex;
		for (nIndex = 0; nIndex < path.length; nIndex++) {
			let char = path[nIndex];
			if (char !== "." && char !== this.WINDIR_SEP) {
				break;
			}
		}
		//
		if (nIndex > 0) {
			path = path.substr(nIndex);
		}
		//
		return (path.startsWith(this.DIR_SEP)) ? path : this.DIR_SEP + path;
	}

	public ensureNoSepStart(path: string): string {
		let nIndex = 0;
		for (; nIndex < path.length; nIndex++) {
			let char = path[nIndex];
			if (char !== " " && char !== "." && char !== this.WINDIR_SEP && char !== this.DIR_SEP) {
				break;
			}
		}
		//
		return (nIndex > 0) ? path.substr(nIndex) : path;
	}

	public ensureSepEnd(path: string): string {
		if (path.endsWith(this.DIR_SEP)) { return path; }
		//
		let nIndex;
		let nLastChar = path.length - 1;
		for (nIndex = nLastChar; nIndex >= 0; nIndex--) {
			let char = path[nIndex];
			if (char !== this.WINDIR_SEP) {
				break;
			}
		}

		if (nIndex < nLastChar) {
			path = path.substr(0, nIndex) + 1;
		}

		return path + this.DIR_SEP;
	}

	public ensureNoSepEnd(path: string): string {
		if (path.endsWith(this.DIR_SEP)) {
			path = path.substr(0, path.length - 1);
		}
		//
		return path;
	}


	/** Extract URL without parameters (?...) */
	public extractUrlBase(path: string): string {
		let pasParamsStart = path.indexOf("?");
		if (pasParamsStart > 0) {
			path = path.substr(0, pasParamsStart);
		}
		//
		if (!Helper.endsWith(path, "/")) {
			path += "/";
		}
		//
		return path;
	}

	public equalPaths(path1: string, path2: string): boolean {
		path1 = this.ensureNoSepStart(path1);
		path1 = this.ensureNoSepEnd(path1);

		path2 = this.ensureNoSepStart(path2);
		path2 = this.ensureNoSepEnd(path2);
		
		return path1 === path2;
	}

	public combinePath(path1: string, path2: string): string {
		path1 = this.ensureSepEnd(path1);
		path2 = this.ensureNoSepStart(path2);
		//
		return path1 + path2;
	}

	public loadJson(path: string, extra?: string): Promise<any> {
		path += (extra) ? `?${this._cachever}${extra}` : `?${this._cachever}`;
		//
		return new Promise<any>((resolve: any, reject: any) => {
			let xhr = new XMLHttpRequest();
			xhr.onreadystatechange = () => {
				if (xhr.readyState === XMLHttpRequest.DONE) {
					if (xhr.status === 200) {
						let filecontent: any;
						try {
							filecontent = JSON.parse(xhr.responseText);
							resolve(filecontent);
						} catch (err: any) {
							if (err.message) {
								// err = new Error(err.message + ` (path=${path})`);
								err = new Error(`${err.message ? err.message : "Could not load JSON file"}  (path: ${path})`);
							}
							reject(err);
						}
					} else {
						reject(xhr);
					}
				}
			};
			xhr.open("GET", path, true);
			xhr.send();
		});
	}

	public async loadHTML(path: string, extra?: string): Promise<string> {
		path += (extra) ? `?${this._cachever}${extra}` : `?${this._cachever}`;
		//
		let text: string = "";
		try {
			let response = await fetch(path);
			if (response.status === 200) {
				text = await response.text();
			} else {
				throw new Error(response.statusText);
			}
		} catch (err: any) {
			throw new Error(`${ err.message ? err.message : "Could not load HTML file"} (path: ${path})`);
		}
		//
		return text;
	}

} // END OuterTube

