import { Helper } from "../../service/aid/aid.js";
import * as UIBase from "../../system/common/uibase.js";
import { App } from "../../system/runtime/app.js";
//

/*
Предполагается использование этого класса для сопровождения учебного материала 
дополнительным видеогидом (плеером) который может появляться и висеть поверх 
страниц, а так же посылать различные команды в механизм управления книгой для выполнения 
заданных интерактиных действий (перейти к нужному контенту, привлечь внимание, активировать 
элемент и т.д.) Пока этот класс не реализован, и его роль до конца не продумана.
*/
export class VideoTutor {
	/* Class Variables and Constants
	----------------------------------------------------------*/
	private _libref: UIBase.ISysLibrary;
	private _presenter: HTMLElement;
	private _book: UIBase.IBook;
	private _data: any;


	/* Construction / Initialization / Desctruction
	----------------------------------------------------------*/

	constructor(presenter: HTMLElement, book: UIBase.IBook, data: any) {
		this._libref = App.libman.engine;
		this._presenter = presenter;
		this._book = book;
		this._data = data;
	}

	private async _build(): Promise<any> {
		let templ = await this._libref.getTemplate("/templates/tutor", Helper.getObjectName(this));
		if (templ) {
			let frag: DocumentFragment = <DocumentFragment>templ.content.cloneNode(true);
			let clientarea = <HTMLElement>frag.getElementById("clientarea");
			//
			this._presenter.appendChild(clientarea);
			//
			// this._book.frame.
			//
		}
	}


	/* Infrastructure
	----------------------------------------------------------*/



	/* I### Implementation
	----------------------------------------------------------*/



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



} // class VideoTutor

