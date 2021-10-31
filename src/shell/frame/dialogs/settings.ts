import { Helper } from "../../../engine/service/aid/aid.js";
import { LangNames } from "../../../engine/system/common/uibase.js";
import * as Modal from "./../../../engine/system/view/modal.js";
import { AppSettings, Setting } from "../../../engine/system/runtime/settings.js";
import { App } from "../../../engine/system/runtime/app.js";
//

class SettingView {
	// Class Variables and Constants
	// -------------------------------------------------------------------
	protected _presenter?: HTMLElement;
	protected _setting: Setting;
	//

	// Construction / Initialization / Destruction
	// -------------------------------------------------------------------

	constructor(setting: Setting, slot: HTMLElement, pathTemplate: string, keyTemplate: string) {
		this._setting = setting;
		this._build(slot, pathTemplate, keyTemplate);
	}


	// Public Members
	// -------------------------------------------------------------------

	public get presenter(): HTMLElement {
		return <HTMLElement>this._presenter;
	}

	public get setting(): Setting {
		return this._setting;
	}


	// Internal Members
	// -------------------------------------------------------------------

	private async _build(slot: HTMLElement, pathTemplate: string, keyTemplate: string): Promise<void> {
		let templ = await App.libman.shell.getTemplate(pathTemplate, keyTemplate);
		if (templ) {
			let frag = templ.content.cloneNode(true) as DocumentFragment;
			await App.strings.processScope(frag);
			this._presenter = frag.firstElementChild as HTMLElement;
			await this._buildContent(this._presenter);
			slot.appendChild(this._presenter);
		}
	}


	// Virtuals
	// -------------------------------------------------------------------

	/** @virtual */
	protected async _buildContent(presenter: HTMLElement): Promise<void> { /* */ }

} // class SettingView

// =====================================================================

class SettingLang extends SettingView {
	// Class Variables and Constants
	// -------------------------------------------------------------------


	// Internal Members
	// -------------------------------------------------------------------

	/** @override */
	protected async _buildContent(presenter: HTMLElement): Promise<void> {
		let hteSelect = presenter.querySelector("#langselect") as HTMLElement;
		if (hteSelect) {
			let dataLang = this._setting.getData();
			if (dataLang && Helper.isArray(dataLang.langlist)) {
				let aLangs = dataLang.langlist as [];
				aLangs.forEach((strLangCode) => {
					//
					let strLangName: string | unknown = LangNames[strLangCode];
					if (!strLangName) {
						strLangName = strLangCode;
					}
					//
					let hteOption = App.doc.createElement("option") as HTMLOptionElement;
					hteOption.value = strLangCode;
					hteOption.innerHTML = <string>strLangName;
					if (App.lang === strLangCode) {
						hteOption.selected = true;
					}

					hteSelect.appendChild(hteOption);

				});
				//
				hteSelect.addEventListener("change", this._onSelectChange.bind(this));
			}
		}
	}


	/* Event Handlers
	----------------------------------------------------------*/

	protected _onSelectChange(ev: Event): void {
		let select = ev.target as HTMLSelectElement;
		let opt = select.options[select.selectedIndex];
		this._setting.value = opt.value;
	}

} // class SettingLang


// =====================================================================


export class AppSettingsDlg extends Modal.DialogBox {
	// Class Variables and Constants
	// -------------------------------------------------------------------
	private _settings: AppSettings;
	private _aViews: SettingView[];
	//

	// Construction / Initialization / Destruction
	// -------------------------------------------------------------------

	constructor(settings: AppSettings) {
		super(Modal.DialogKinds.SaveClose);
		//
		this._settings = settings;
		this._aViews = [];
	}


	// Internal Members
	// -------------------------------------------------------------------

	/** @override */
	protected async _buildContent(hteCaptionSlot: HTMLElement, hteContentSlot: HTMLElement): Promise<any> {
		this.presenter.classList.add(Helper.getObjectName(this).toLowerCase());
		//
		let templ = await App.libman.shell.getTemplate("/templates/settings", Helper.getObjectName(this));
		if (templ) {
			let frag = templ.content.cloneNode(true) as DocumentFragment;
			if (frag) {
				let hteCaption = frag.getElementById("caption");
				if (hteCaption) {
					hteCaptionSlot.appendChild(hteCaption);
					await App.strings.processScope(hteCaptionSlot);
				}
				//

				let fOnSettingChanged = this._onSettingChanged.bind(this);

				let hteContent = frag.getElementById("content");
				if (hteContent) {
					let aSettingList = this._settings.getSettingList();
					aSettingList.forEach((setting) => {
						switch (setting.name) {
							case "lang": {
								let divSlot = App.doc.createElement("div");
								divSlot.classList.add("settings-item");
								let view = new SettingLang(setting, divSlot, "/templates/settings.html", "SettingLang");
								this._aViews.push(view);
								setting.eventValueChanged.subscribe(fOnSettingChanged);
								hteContent?.appendChild(divSlot);
								break;
							}
						} // switch
					}); // forEach
					//
					hteContentSlot.appendChild(hteContent);
				}
			} // if (frag)
		} // if (templ)
		//
		this._updateUI();
	}

	/** @override */
	protected async _invokeAccept(): Promise<boolean> {
		this._settings.save();
		return true;
	}

	protected _updateUI(): void {
		let bHasChanged = false;
		this._aViews.forEach((view) => {
			if (view.setting.bChanged) {
				bHasChanged = true;
			}
		});
		//
		if (bHasChanged) {
			this._hteSaveBtn?.classList.remove("disabled");
		} else {
			this._hteSaveBtn?.classList.add("disabled");
		}
	}


	/* Event Handlers
	----------------------------------------------------------*/

	protected _onSettingChanged(sender: any, arg: boolean): void {
		this._updateUI();
	}

} // class AppSettingsDlg

