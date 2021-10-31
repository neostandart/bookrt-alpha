import { Helper, Markup } from "../../../engine/service/aid/aid.js";
import * as UIBase from "../../../engine/system/common/uibase.js";
import { PackHtm } from "../../../engine/service/packhtm/packhtm.js";
import * as Ctr from "../../../engine/jet/control/control.js";
import { LazyFolder } from "../../_essentials/container/folder/lazyfolder.js";
import { App } from "../../../engine/system/runtime/app.js";
//

class AnncBoardItem extends Ctr.UIControl implements UIBase.IComparable<AnncBoardItem> {
	/* Class Variables and Constants
	----------------------------------------------------------*/
	private _created: Date = new Date();
	private _hteCollapse: HTMLElement | null = null;
	private _$hteCollapse?: JQuery;
	//

	/* Construction / Initialization / Desctruction
	----------------------------------------------------------*/

	constructor(libref: UIBase.IExtLibrary, page: UIBase.IBookPage, presenter: HTMLElement, options: Ctr.TControlOptions, startpoint: UIBase.ControlStartPoints, initdata: any) {
		super(libref, page, presenter, options, startpoint);
		//
		this._initdata = initdata;
	}


	/* Implementation IComparable
	----------------------------------------------------------*/

	public compareTo(other: AnncBoardItem): number {
		// Check if the dates are equal
		let bSame = this.created.getTime() === other.created.getTime();
		if (bSame) { return 0; }
		//
		return (this.created > other.created) ? 1 : -1;
	}


	/* Public Members
	----------------------------------------------------------*/

	public get created(): Date {
		return this._created;
	}

	public expand(): void {
		this._$hteCollapse?.collapse("show");
	}

	public collapse(): void {
		this._$hteCollapse?.collapse("hide");
	}


	/* Internal Members
	----------------------------------------------------------*/

	protected async _onStartPoint(): Promise<any> {
		let initdata = await this._fetchInitData();
		let templset: UIBase.TTemplateSet = await this._fetchTemplate();
		//
		let hteWorkArea = templset.elements.get("workarea") as HTMLElement;
		//
		this._hteCollapse = Markup.prepareBootstrapExpander(hteWorkArea, this.id,
			{
				onshow: (ev: Event) => {
					if (ev.target === this._hteCollapse) {
						let htePointerImage = <HTMLElement>this._presenter.querySelector("#collapsepointer");
						if (htePointerImage) {
							htePointerImage.classList.remove("anim-turn0-fast");
							htePointerImage.classList.add("anim-turn90-fast");
						}
					}
				},
				onshown: (ev: Event) => {
					if (ev.target === this._hteCollapse) {
						this._presenter.classList.add("opened");
					}
				},
				onhide: (ev: Event) => {
					if (ev.target === this._hteCollapse) {
						let htePointerImage = <HTMLElement>hteWorkArea.querySelector("#collapsepointer");
						if (htePointerImage) {
							htePointerImage.classList.add("anim-turn0-fast");
							htePointerImage.classList.remove("anim-turn90-fast");
						}
					}
				},
				onhidden: (ev: Event) => {
					if (ev.target === this._hteCollapse) {
						this._presenter.classList.remove("opened");
					}
				}
			} // TCollapseEventsArg			
		);
		//
		if (this._hteCollapse) {
			this._$hteCollapse = $(this._hteCollapse);
		}

		//
		// Type Sign of Announcement
		//
		if (initdata.type) {
			this._presenter.classList.add(initdata.type);
		}

		//
		// Header data of the Announcement
		//
		let hteAuthor = hteWorkArea.querySelector(".header-data #author") as HTMLElement;
		if (initdata.author && hteAuthor) {
			hteAuthor.innerHTML = initdata.author;
		}

		let hteCreated = hteWorkArea.querySelector(".header-data #created") as HTMLElement;
		if (initdata.created) {
			this._created = new Date(Date.parse(initdata.created));
			if (!isNaN(this._created.getTime())) {
				if (hteCreated) {
					hteCreated.innerHTML = this._created.toLocaleDateString();
				}
			}
		}

		let hteSubject = hteWorkArea.querySelector(".header-data #subject") as HTMLElement;
		if (initdata.subject && hteSubject) {
			hteSubject.innerHTML = initdata.subject;
		}

		//
		// Text of the Announcement
		//
		let hteText = hteWorkArea.querySelector("#Text") as HTMLElement;
		if (initdata.text && hteText) {
			let aExtraDataParsed: UIBase.THTMLElementArray = PackHtm.parseToArray(initdata.text, App.doc);
			for (let i = 0; i < aExtraDataParsed.length; i++) {
				hteText.appendChild(aExtraDataParsed[i]);
			}
		}
		//
		await this._completeBuild({ style: templset.styles, workarea: hteWorkArea });
	}

} // AnncBoardItem

type TAnncItemArray = AnncBoardItem[];

// =====================================================================

class AnncBoardList extends Ctr.UIControl {
	/* Class Variables and Constants
	----------------------------------------------------------*/
	private _hteItems: HTMLElement | null;
	private _items: TAnncItemArray;
	private _visualowner: UIBase.IVisualElement | null;
	//

	/* Construction / Initialization / Desctruction
	----------------------------------------------------------*/

	constructor(libref: UIBase.IExtLibrary, page: UIBase.IBookPage, presenter: HTMLElement, options: Ctr.TControlOptions, initdata: any, visualowner: UIBase.IVisualElement | null = null) {
		super(libref, page, presenter, options, UIBase.ControlStartPoints.Manual);
		//
		this._initdata = initdata;
		this._hteItems = null;
		this._items = [];
		this._visualowner = visualowner;
	}


	/* Public Members
	----------------------------------------------------------*/



	/* Internal Members
	----------------------------------------------------------*/

	protected async _onStartPoint(): Promise<any> {
		let initdata = await this._fetchInitData();
		let templset: UIBase.TTemplateSet = await this._fetchTemplate();
		//
		let hteHeader = templset.elements.get("header") as HTMLElement;
		let hteWorkArea = templset.elements.get("workarea") as HTMLElement;
		//
		let btnCollapseAll: HTMLElement = hteHeader.querySelector("#collapse_all") as HTMLElement;
		if (btnCollapseAll) {
			btnCollapseAll.addEventListener("click", this._doCollapseAll.bind(this));
		}
		//
		let btnGoTop: HTMLElement = hteWorkArea.querySelector("#go_top") as HTMLElement;
		if (btnGoTop) {
			btnGoTop.addEventListener("click", this._goTop.bind(this));
		}
		//
		if (initdata.caption) {
			let hteCaption = hteWorkArea.querySelector("#caption") as HTMLElement;
			if (hteCaption) {
				hteCaption.innerHTML = initdata.caption;
			}
		}
		//
		let selSort: HTMLSelectElement = hteHeader.querySelector("#sort_selector") as HTMLSelectElement;
		if (selSort) {
			selSort.addEventListener("change", (ev: Event) => {
				let sortdir = this._getSortDirection(<HTMLSelectElement>ev.currentTarget);
				if (sortdir !== undefined && sortdir !== UIBase.SortDirections.Undef) {
					this._togglePending(sortdir);
				}
			});
		}
		//
		//
		this._hteItems = hteWorkArea.querySelector("#items");
		if (this._hteItems) {
			let joData = await App.tube.loadJson(this._page.book.resolveBookPath(initdata.path, this._page));
			if (Helper.isArray(joData.items)) {
				let aItemPromises: Promise<any>[] = [];
				let aItemsSrc: [] = joData.items;
				for (let i = 0; i < aItemsSrc.length; i++) {
					let oAnncItem = new AnncBoardItem(this._libref, this._page, Ctr.UIControl._createPresenter(AnncBoardItem.name), { location: "/anncboard", templpath: "/templates/anncboard.html" }, UIBase.ControlStartPoints.Manual, aItemsSrc[i]);
					aItemPromises.push(oAnncItem.beReady());
					this._items.push(oAnncItem);
				}
				//
				await Promise.all(aItemPromises);
				//
				// sorting according to the default value
				if (selSort) {
					let sortdir = this._getSortDirection(selSort);
					if (sortdir !== undefined && sortdir !== UIBase.SortDirections.Undef) {
						this._sortitems(sortdir);
					}
				}
				//
				await this._fillItems(this._items);
			}
		}
		//
		await this._completeBuild({ style: templset.styles, header: hteHeader, workarea: hteWorkArea });
	}

	private _getSortDirection(hteSelect: HTMLSelectElement): UIBase.SortDirections | undefined {
		let sortdir: UIBase.SortDirections | undefined = Helper.parseEnum((hteSelect).value, UIBase.SortDirections) as UIBase.SortDirections;
		return sortdir;
	}

	private _sortitems(direction: UIBase.SortDirections): void {
		this._items.sort((item1, item2) => {
			let nResult = item1.compareTo(item2);
			if (nResult > 0 && direction === UIBase.SortDirections.Descending) {
				nResult = -1;
			}
			return nResult;
		});
	}

	private async _fillItems(items: TAnncItemArray): Promise<void> {
		if (this._hteItems) {
			this._hteItems.innerHTML = "";
			if (items.length > 0) {
				for (let i = 0; i < items.length; i++) {
					this._hteItems.appendChild(items[i].presenter);
				}
			} else {
				await Ctr.UIControl._showNoData(this._hteItems);
			}
		}
	}

	/** @override */
	protected async _onPending(params: any): Promise<void> {
		if (params) {
			this._sortitems(<UIBase.SortDirections>params);
			await this._fillItems(this._items);
		}
	}


	/* Command Handlers
	----------------------------------------------------------*/

	private _doCollapseAll(): void {
		for (let item of this._items) {
			item.collapse();
		}
	}

	private _goTop(): void {
		if (this._items.length > 0) {
			this._page.ensureVisible((this._visualowner) ? this._visualowner : this, UIBase.Layouts.Top, 20);
		}
	}

} // AnncBoardList

// =====================================================================

class AnncBoardArchive extends Ctr.UIControl implements UIBase.ILazyProvider {
	/* Class Variables and Constants
	----------------------------------------------------------*/
	private _aFolders: LazyFolder[];
	//

	/* Construction / Initialization / Desctruction
	----------------------------------------------------------*/

	constructor(libref: UIBase.IExtLibrary, page: UIBase.IBookPage, presenter: HTMLElement, options: Ctr.TControlOptions, initdata: any) {
		super(libref, page, presenter, options, UIBase.ControlStartPoints.Manual);
		//
		this._initdata = initdata;
		this._aFolders = [];
	}


	/* IVisualProvider Implementation
	----------------------------------------------------------*/

	public getLazyContainer(lazyowner: UIBase.IVisualElement, token: any): UIBase.IVisualElement {
		let hteAnncBoardList = Ctr.UIControl._createPresenter(AnncBoardList.name);
		hteAnncBoardList.classList.add("archive");
		let options: Ctr.TControlOptions = { location: "/anncboard", templpath: "/templates/anncboard.html" };
		let ctrAnncBoardList = new AnncBoardList(this._libref, this._page, hteAnncBoardList, options, token, lazyowner);
		return ctrAnncBoardList;
	}

	public async fillLazyContainer(container: UIBase.IVisualElement): Promise<void> {
		let ctr = <AnncBoardList>container;
		await ctr.beReady();
	}


	/* Internal Members
	----------------------------------------------------------*/

	protected async _onStartPoint(): Promise<any> {
		let initdata = await this._fetchInitData();
		let templset: UIBase.TTemplateSet = await this._fetchTemplate();
		//
		let hteWorkArea = templset.elements.get("workarea") as HTMLElement;
		//
		if (initdata.caption) {
			let hteCaption = hteWorkArea.querySelector("#caption") as HTMLElement;
			if (hteCaption) {
				hteCaption.innerHTML = initdata.caption;
			}
		}
		//
		//
		let refs: [] | undefined = initdata.refs;
		if (refs && Helper.isArray(refs) && refs.length > 0) {
			for (let i = 0; i < refs.length; i++) {
				// Creating a Lazyholder for each archive file
				let ref: any = refs[i];
				let hteLazyFolder = Ctr.UIControl._createPresenter(LazyFolder.name);
				hteLazyFolder.dataset.init = `{"caption": "${ref.caption ? ref.caption : ""}"}`;
				let folder = await this._page.processor.createControl(hteLazyFolder) as LazyFolder;
				if (folder) {
					await folder.beReady();
					folder.regProvider(this, ref);
					this._aFolders.push(folder);
					hteWorkArea.appendChild(hteLazyFolder);
				}
			}
			//
		} else {
			await Ctr.UIControl._showNoData(hteWorkArea);
		}
		//
		await this._completeBuild({ style: templset.styles, workarea: hteWorkArea });
	}
} // AnncArchive

// =====================================================================

export class AnncBoard extends Ctr.UIControl {
	/* Class Variables and Constants
	----------------------------------------------------------*/
	private _anncActual?: AnncBoardList;
	private _anncArchive?: AnncBoardArchive;
	//

	/* Construction / Initialization / Desctruction
	----------------------------------------------------------*/

	constructor(libref: UIBase.IExtLibrary, page: UIBase.IBookPage, presenter: HTMLElement, options: Ctr.TControlOptions, startpoint?: UIBase.ControlStartPoints) {
		super(libref, page, presenter, options, startpoint);
		//
	}


	/* Internal Members
	----------------------------------------------------------*/

	protected async _onStartPoint(): Promise<any> {
		let initdata = await this._fetchInitData();
		let templset: UIBase.TTemplateSet = await this._fetchTemplate();
		//
		let hteWorkArea = templset.elements.get("workarea") as HTMLElement;
		//
		if (initdata.actual) {
			this._anncActual = new AnncBoardList(this._libref, this._page, Ctr.UIControl._createPresenter(AnncBoardList.name), { location: "/anncboard", templpath: "/templates/anncboard.html" }, initdata.actual);
			await this._anncActual.beReady(); // если по new создали — __beReady() обязательно!
			hteWorkArea.appendChild(this._anncActual.presenter);
		}
		//
		if (initdata.archive) {
			this._anncArchive = new AnncBoardArchive(this._libref, this._page, Ctr.UIControl._createPresenter(AnncBoardArchive.name), { location: "/anncboard", templpath: "/templates/anncboard.html" }, initdata.archive);
			await this._anncArchive.beReady();
			hteWorkArea.appendChild(this._anncArchive.presenter);
		}
		//
		await this._completeBuild({ style: templset.styles, workarea: hteWorkArea });
	}


	/* Event Handlers
	----------------------------------------------------------*/

	/** @override */
	private _onPageStateChange(sender: any, args: UIBase.TNavableStateChangedArgs): void {
		super._onPageStateChanged(sender, args);
		// (for example...)
		switch (args.stateNew) {
			case UIBase.NavableStates.Displayed: {
				break;
			}
		}
	}

} // class AnncBoard

