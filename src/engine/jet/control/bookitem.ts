import * as UIBase from "../../system/common/uibase.js";
//

/**
 * Это корневой класс в цепочке наследования для всех элементов управления
 * размещаемых на страницах виртуальной книги.
 */
export class BookItem implements UIBase.IBookItem {
	/* Class Variables and Constants
	----------------------------------------------------------*/
	protected _page: UIBase.IBookPage;
	protected _attrs = new UIBase.Attributes();

	
	/* Construction / Initialization / Desctruction
	----------------------------------------------------------*/
	constructor(page: UIBase.IBookPage) {
		//
		this._page = page;
	}
	
	/* Infrastructure
	----------------------------------------------------------*/
	
	
	

	/* IBookItem Implementation
	----------------------------------------------------------*/

	public get classname(): string {
		return this.constructor.name;
	}

	public get page(): UIBase.IBookPage {
		return this._page;
	}

	public get attrs(): UIBase.Attributes {
		return this._attrs;
	}


	/* Public Members
	----------------------------------------------------------*/



	
	/* Public Events
	----------------------------------------------------------*/
	

	
	
	/* Internal Members
	----------------------------------------------------------*/




	/* Event Handlers
	----------------------------------------------------------*/

	
	

	/* State Machine
	----------------------------------------------------------*/
	
	


} // class BookItem
