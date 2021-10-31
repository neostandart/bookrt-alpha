import { Helper } from "../../../engine/service/aid/aid.js";
import { EventNest } from "../../../engine/system/runtime/event.js";
import { PackHtm } from "../../../engine/service/packhtm/packhtm.js";
import * as Modal from "../../../engine/system/view/modal.js";
import { App } from "../../../engine/system/runtime/app.js";
//

export class BookPickerDlg extends Modal.DialogBox {
	// Class Variables and Constants
	// -------------------------------------------------------------------
	private static _eventInvokeOpenBook: EventNest<{ bookpath: string }> = new EventNest<{ bookpath: string }>(null);
	//

	// Construction / Initialization / Destruction
	// -------------------------------------------------------------------

	constructor() {
		super(Modal.DialogKinds.Close);
		//
	}


	/* Public Events
	----------------------------------------------------------*/

	public static get eventInvokeOpenBook(): EventNest<{ bookpath: string }> {
		return this._eventInvokeOpenBook;
	}


	// Internal Members
	// -------------------------------------------------------------------

	/** @override */
	protected async _buildContent(hteCaptionSlot: HTMLElement, hteContentSlot: HTMLElement): Promise<any> {
		this.presenter.classList.add(Helper.getObjectName(this).toLowerCase());
		//
		let templ = await App.libman.shell.getTemplate("/templates/bookpicker", Helper.getObjectName(this));
		if (templ) {
			let frag = templ.content.cloneNode(true) as DocumentFragment;
			if (frag) {
				await App.strings.processScope(frag);
				//
				let hteCaption = frag.getElementById("caption");
				if (hteCaption) {
					hteCaptionSlot.appendChild(hteCaption);
				}
				//
				let hteContent = frag.getElementById("content");
				if (hteContent) {
					//
					let rectempl = await App.libman.shell.getTemplate("/templates/bookpicker.html", "BookRecord") as HTMLTemplateElement;
					let recFragTempl = rectempl.content.cloneNode(true) as DocumentFragment;
					await App.strings.processScope(recFragTempl);
					//
					let mapOpenedBooks = App.db.getOpenedBooksInfo(); // !!!
					let hteBookList = hteContent.querySelector("#booklist") as HTMLElement;
					//
					let listBook = App.catalog.getBookInfoList();
					for (let i = 0; i < listBook.length; i++) {
						let bookinfo = listBook[i];
						//
						let bookname = bookinfo.name;
						let bookid = bookinfo.id;
						let bookdescr = bookinfo.description;
						//
						if (!bookname || !bookid) {
							App.logWarning(`The book info record of the catalog (index: ${i}) is not correct.`);
							continue;
						}
						//
						let fragRec = recFragTempl.cloneNode(true) as DocumentFragment;

						if (bookinfo.image) {
							let pathImage = App.catalog.resolvePath(bookinfo.image);
							let hteBanner = fragRec.getElementById("bookbanner") as HTMLImageElement;
							if (hteBanner) {
								hteBanner.src = pathImage;
							}
						}

						let strOpenedBooksMapKey = App.tube.ensureNoSepEnd(bookinfo.path);

						let hteStatesign = fragRec.getElementById("statesign") as HTMLImageElement;
						if (hteStatesign) {
							if (mapOpenedBooks.has(strOpenedBooksMapKey)) {
								hteStatesign.classList.add("icon-opened");
							} else {
								hteStatesign.classList.add("icon-closed");
							}
						} // if (hteStatesign)

						let hteBookStateInfo = fragRec.getElementById("stateinfo") as HTMLImageElement;
						if (hteBookStateInfo) {
							if (mapOpenedBooks.has(strOpenedBooksMapKey)) {
								let openbookcount = mapOpenedBooks.get(strOpenedBooksMapKey);
								if (openbookcount) {
									let bookCurrent = App.mainview.getActiveBook();
									if (bookCurrent) {
										if (bookCurrent.equalLocalPath(strOpenedBooksMapKey)) {
											if (openbookcount > 1) {
												hteBookStateInfo.innerHTML = await App.strings.getString("BookPickerDlg_opened_here_another");
											} else {
												hteBookStateInfo.innerHTML = await App.strings.getString("BookPickerDlg_bookopened");
											}
										} else {
											hteBookStateInfo.innerHTML = await App.strings.getString("BookPickerDlg_opened_another");
										}
									} else {
										hteBookStateInfo.innerHTML = await App.strings.getString("BookPickerDlg_opened_another");
									}
								} else {
									hteBookStateInfo.innerHTML = await App.strings.getString("BookPickerDlg_bookclosed");
								}
							} else {
								hteBookStateInfo.innerHTML = await App.strings.getString("BookPickerDlg_bookclosed");
							}
						}

						let hteBookName = fragRec.getElementById("bookname") as HTMLImageElement;
						if (hteBookName) {
							hteBookName.innerHTML = bookname;
						}

						if (bookdescr) {
							let hteDescr = fragRec.getElementById("bookdescr");
							if (hteDescr) {
								hteDescr.append(...PackHtm.parseToArray(bookdescr));
							}
						}

						let hteOpen = fragRec.getElementById("open") as HTMLElement;
						if (hteOpen) {
							hteOpen.dataset.bookindex = i.toString();
							hteOpen.addEventListener("click", this._onOpenBookClick.bind(this));
						}

						hteBookList.appendChild(fragRec);
					}
					//
					hteContentSlot.appendChild(hteContent);
				}
			} // if (frag)
		} // if (templ)
	}

	/** @override */
	protected async _invokeSave(): Promise<boolean> {
		return false;
	}


	/* Event Handlers
	----------------------------------------------------------*/

	private _onOpenBookClick(ev: Event): void {
		let strIndex = (ev.currentTarget as HTMLElement).dataset.bookindex;
		if (strIndex) {
			let bookindex = parseInt(strIndex, 10);
			let listBook = App.catalog.getBookInfoList();
			let infoBook = listBook[bookindex];
			//
			this._close(true);
			//
			BookPickerDlg._eventInvokeOpenBook.raise({ bookpath: infoBook.path });
		}
	}

} // class AppSettingsDlg

