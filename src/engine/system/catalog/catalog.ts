import { Helper } from "../../service/aid/aid.js";
import * as UIBase from "../common/uibase.js";
import { App } from "../runtime/app.js";
import { ErrorCase } from "../runtime/error.js";
//

/*
	Grigory. Каталог доступных для установки и открытия книг, находится пока что
	в самом зачаточном состоянии. Предполагается в перспективе развитие как интерфейса так
	и функциональности до необходимого уровня, предположительно:
	— Видеть полный каталог доступных книг на сервере (платных и бесплатных);
	— Устанавливать/загружать книги на свой компьютер;
	— Работать с установленными книгами;
	— ...
*/

export class BookCatalog implements UIBase.IBookCatalog {
	/* Class Variables and Constants
	----------------------------------------------------------*/
	private _root: any[] = [];
	private _mapBookById: Map<string, any> = new Map<string, any>();


	/* Construction / Initialization / Desctruction
	----------------------------------------------------------*/

	public async init(path: string): Promise<any> {
		try {
			let data = await App.tube.loadJson(path);
			//
			// Начинаем с рутового массива
			let dataRoot = data.content;
			if (Helper.isArray(dataRoot)) {
				await this._processJsonArray(dataRoot);
			} else {
				throw new Error(await App.strings.getString("errCatalogParse"));
			}
		} catch (err) {
			if (err instanceof XMLHttpRequest && ((<XMLHttpRequest>err).status === 404)) {
				App.logWarning("The Book Catalog was not found.", Helper.getObjectName(this));
			} else {
				throw new Error(ErrorCase.extractMessage(err));
			}
		}
	}


	/* IBookCatalog Implementation
	----------------------------------------------------------*/

	public getBookInfoById(id: string): any {
		return (this._mapBookById.has(id)) ? this._mapBookById.get(id) : null;
	}

	public getBookPathById(id: string): string | null {
		let path = this._mapBookById.get(id).path;
		return (Helper.isString(path)) ? (path.length > 0 ? path : null) : null;
	}

	public getBookInfoList(bSort?: boolean): any[] {
		// no sorting yet :-((
		let aBooks = Array.from(this._mapBookById.values());
		return aBooks;
	}

	public getRoot(): [] {
		// not implemented yet
		return [];
	}

	public resolvePath(pathInner: string): string {
		return App.tube.combinePath(App.pathCatalog, pathInner);
	}

	/* Public Events
	----------------------------------------------------------*/




	/* Internal Members
	----------------------------------------------------------*/

	private async _processJsonArray(jsonArray: []): Promise<void> {
		jsonArray.forEach(async (jsonItem: any) => {
			if (Helper.isJsonObject(jsonItem)) {
				await this._processJsonObject(jsonItem);
			} else if (Helper.isArray(jsonItem)) {
				await this._processJsonArray(jsonItem);
			}
		});
	}

	private async _processJsonObject(jsonObject: object): Promise<void> {
		Object.entries(jsonObject).forEach(async ([key, value]) => {
			if (key === "type") {
				switch (value) {
					case "folder": {
						await this._processFolder(jsonObject);
						break;
					}
					case "book": {
						await this._processBook(jsonObject);
						break;
					}
				} // switch
			}
		});
	}

	private async _processBook(jsonBook: any): Promise<void> {
		if (!Helper.isString(jsonBook.path)) {
			throw new Error(await App.strings.getFormatted("errCatalogFormat", null, "path"));
		}

		let strId = <string>jsonBook.id;
		if (Helper.isString(strId)) {
			strId = strId.trim();
			if (strId.length === 0) {
				throw new Error(await App.strings.getFormatted("errCatalogFormat", null, "id"));
			}
			//
			this._mapBookById.set(strId, jsonBook);
		} else {
			throw new Error(await App.strings.getFormatted("errCatalogFormat", null, "id"));
		}
	}

	private async _processFolder(jsonFolder: object): Promise<void> {
		Object.entries(jsonFolder).forEach(async ([key, value]) => {
			switch (key) {
				case "content": {
					if (Helper.isArray(value)) {
						await this._processJsonArray(value);
					} else {
						App.logWarning("BookCatalog: The \"folder\" element must be an array.");
					}
					break;
				}
			}
		});
	}


	/* Event Handlers
	----------------------------------------------------------*/



	/* State Machine
	----------------------------------------------------------*/



} // BookCatalog
