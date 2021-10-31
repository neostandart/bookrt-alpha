import * as UIBase from "../../engine/system/common/uibase.js";
import { VMBook } from "../../engine/jet/book/book.js";
import { NormalBookPage } from "./bookpage.js";
import { MasterNav } from "./masternav.js";
//

export class VirtualBook extends VMBook {

	constructor(path: string) {
		super(path);
	}

	//

	/** @override */
	protected _createContents(jsonContents: any): MasterNav {
		return new MasterNav(jsonContents, this);
	}

	/** @override */
	protected _createPage(libref: UIBase.ISysLibrary, pagecfg: any, owner: UIBase.IBook, index: number, pagenum: string | null): NormalBookPage | null {
		return (pagecfg.kind === "normal") ? new NormalBookPage(libref, pagecfg, owner, index, pagenum) : null; 
	}

} // class VirtualBook

