import { Markup } from "../../../../engine/service/aid/aid.js";
import * as UIBase from "../../../../engine/system/common/uibase.js";
import * as Ctr from "../../../../engine/jet/control/control.js";
//

export class LazyFolder extends Ctr.UIControl {
	/* Class Variables and Constants
	----------------------------------------------------------*/
	private _provider?: UIBase.ILazyProvider;
	private _token: any;
	private _container?: UIBase.IVisualElement;
	private _collapse: HTMLElement | null;
	//

	/* Construction / Initialization / Desctruction
	----------------------------------------------------------*/

	constructor(libref: UIBase.IExtLibrary, page: UIBase.IBookPage, presenter: HTMLElement, options: Ctr.TControlOptions, startpoint?: UIBase.ControlStartPoints) {
		super(libref, page, presenter, options, startpoint);
		//
		this._collapse = null;
	}

	public regProvider(provider: UIBase.ILazyProvider, token: any): void {
		this._provider = provider;
		this._token = token;
	}


	/* Internal Members
	----------------------------------------------------------*/

	protected async _onStartPoint(): Promise<any> {
		let initdata = await this._fetchInitData();
		let templset: UIBase.TTemplateSet = await this._fetchTemplate();
		//
		let hteWorkArea = templset.elements.get("workarea") as HTMLElement;
		//
		this._collapse = Markup.prepareBootstrapExpander(hteWorkArea, this.presenter.id,
			{
				onshow: (ev: Event) => {
					if (ev.target === this._collapse) {
						let htePointerImage = <HTMLElement>this._presenter.querySelector("#pointer");
						if (htePointerImage) {
							htePointerImage.classList.remove("anim-turn0-fast");
							htePointerImage.classList.add("anim-turn90-fast");
						}
					}
				},
				onshown: (ev: Event) => {
					if (ev.target === this._collapse) {
						this._presenter.classList.add("opened");
						//
						if (!this._container) {
							this._loadContent();
						}
					}
				},
				onhide: (ev: Event) => {
					if (ev.target === this._collapse) {
						let htePointerImage = <HTMLElement>hteWorkArea.querySelector("#pointer");
						if (htePointerImage) {
							htePointerImage.classList.add("anim-turn0-fast");
							htePointerImage.classList.remove("anim-turn90-fast");
						}
					}
				},
				onhidden: (ev: Event) => {
					if (ev.target === this._collapse) {
						this._presenter.classList.remove("opened");
					}
				}
			} // TCollapseEventsArg			
		);

		// Имеет ли пиктограмму (тип контента)
		let hteContentKind: HTMLElement | undefined;
		if (initdata.kind) {
			let cssClass: string | undefined;
			switch (<string>initdata.kind) {
				case "link": {
					cssClass = "fsym-link";
					break;
				}
				case "text": {
					cssClass = "fsym-page-text";
					break;
				}
			}
			//
			hteContentKind = templset.elements.get("contentkind");
			if (hteContentKind) {
				this._presenter.classList.add("hascontentkind");
				if (cssClass) {
					hteContentKind.classList.add(cssClass);
				}
			}
		}

		//
		let hteCaption = hteWorkArea.querySelector("#caption");
		if (hteCaption) {
			if (initdata.caption) {
				hteCaption.innerHTML = initdata.caption;
			}
		}
		//
		this._presenter.classList.add("bk-folder");
		await this._completeBuild({ style: templset.styles, workarea: hteWorkArea, upper: (hteContentKind) ? [hteContentKind] : undefined });
	}

	private _loadContent(): void {
		this._togglePending();
	}

	protected async _onPending(params: any): Promise<void> {
		if (this._provider) {
			this._container = this._provider.getLazyContainer(this, this._token);
			this._container.presenter.classList.add("folder-content");
			//
			let hteSlot = this._presenter.querySelector("#slot") as HTMLElement;
			hteSlot.appendChild(this._container.presenter);
			//
			await this._provider.fillLazyContainer(this._container);
		}
	}

} // class LazyFolder

