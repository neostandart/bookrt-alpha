import { Markup } from "../../../../engine/service/aid/aid.js";
import * as UIBase from "../../../../engine/system/common/uibase.js";
import * as Ctr from "../../../../engine/jet/control/control.js";
import { App } from "../../../../engine/system/runtime/app.js";
//
import { H5PController } from "./h5pcontroller.js";
import { ErrorCase } from "../../../../engine/system/runtime/error.js";
//

export class H5PPlayer extends Ctr.UIControl {
	/* Class Variables and Constants
	----------------------------------------------------------*/
	private _built: boolean;
	private _cid: string | null;
	private _optionsH5P: any;
	private _objStandalonePlayer: any;
	//

	/* Construction / Initialization / Desctruction
	----------------------------------------------------------*/

	constructor(libref: UIBase.IExtLibrary, page: UIBase.IBookPage, presenter: HTMLElement, options: Ctr.TControlOptions, startpoint?: UIBase.ControlStartPoints) {
		super(libref, page, presenter, options, startpoint);
		//
		this._built = false;
		this._cid = null;
		this._objStandalonePlayer = null;
		//
		// page.eventStateChanged.subscribe(this._onPageStateChanged.bind(this));
		//
		H5PController.regInstance(this);
	}


	/* Public Members
	----------------------------------------------------------*/

	public get idContent(): string | null {
		return this._cid;
	}

	public get containerH5P(): HTMLElement {
		return this._workarea;
	}

	public get optionsH5P(): any {
		return this._optionsH5P;
	}

	public notifyH5PEvent(statement: any): void {
		console.log(statement);

		/*
			statement — блок данных передаваемый через xAPI от объекта H5P, 
			в качестве реакции на различные внутренние события.
			В дальнейшем содержимое "statement" необходимо анализировать.
			К примеру, при инициализации объекта H5P, statement содержит следующее:
			{
				actor: {account: {…}, objectType: 'Agent'}
				context: {contextActivities: {…}}
				object: {id: 'H5PPlayer_102', objectType: 'Activity', definition: {…}}
				verb: {id: 'http://adlnet.gov/expapi/verbs/attempted', display: {…}}
			}
			а при получении результата к этому добавляется поле result содержащее к примеру:
			{
				completion:true
				duration:'PT504.59S'
				response:'рисует'
				score:{min: 0, max: 1, raw: 0, scaled: 0}
				max:1
				min:0
				raw:0
				scaled:0
			}
		*/
	}

	/** @override */
	public dispose(): void {
		super.dispose();
		//
		H5PController.unregInstance(this);
	}


	/* Internal Members
	----------------------------------------------------------*/

	protected async _onStartPoint(): Promise<any> {
		let bH5PReady: boolean = await H5PController.waitReady();
		if (!bH5PReady) {
			return; // это ошибка инициализации H5P (возм. надо выводить информацию)
		}
		//
		let initdata = await this._fetchInitData();
		let templset: UIBase.TTemplateSet = await this._fetchTemplate();
		//
		let hteWorkArea = templset.elements.get("workarea") as HTMLElement;
		hteWorkArea.id = `h5p-container-${App.getNextId()}`;
		//
		await this._completeBuild({ style: templset.styles, workarea: hteWorkArea });
		//
		if (Markup.isVisible(hteWorkArea)) {
			this._buildContent(initdata.src);
		} else {
			this._presenter.addEventListener("resize", (ev: Event) => {
				if (!this._built && Markup.isVisible(hteWorkArea)) {
					this._buildContent(initdata.src);
				}
			});

			this._page.eventStateChanged.subscribe((sender: any, args: UIBase.TNavableStateChangedArgs) => {
				if (!this._built && args.stateNew === UIBase.NavableStates.Displaying && Markup.isVisible(hteWorkArea)) {
					this._buildContent(initdata.src);
				}
			});
		}
	} // END _onStartPoint

	protected async _buildContent(pathTask: string): Promise<void> {
		this._built = true;
		//
		try {
			const options = {
				h5pJsonPath: this.page.book.resolveBookPath(pathTask, this.page),
				frameJs: App.makeThirdPartyPath("h5p/standalone/frame.bundle.js"),
				frameCss: App.makeThirdPartyPath("h5p/standalone/styles/h5p.css"),
				librariesPath: App.makeThirdPartyPath("h5p/libraries"),
				fullScreen: false,
				id: Date.now(),
				xAPIObjectIRI: this.id,
				metadata: {}
			};
			this._optionsH5P = options;
			//

			/**
			 * В действительности переменной "this._objStandalonePlayer" будет присвоено
			 * значение "undefined". Это связано с реализацией класса H5PStandalone
			 * (в оригинальном коде: https://github.com/tunapanda/h5p-standalone/blob/master/src/js/h5p-standalone.class.js)
			 */
			this._objStandalonePlayer = await H5PController.buildH5PContent(this);
			//
			let hteH5PElem = this.containerH5P.querySelector("*[data-content-id]") as HTMLElement;
			this._cid = (hteH5PElem) ? hteH5PElem.getAttribute("data-content-id") : null;
			if (!this._cid) {
				throw new Error("Failed to get the \"data-content-id\" attribute after creating an instance of H5PStandalone");
			}
		} catch (err) {
			this._cid = null;
			this._error = new ErrorCase(err);
			this._changeState(UIBase.ControlStates.Error);
		}
	} // END _buildContent


	/** @override */
	protected _onPageStateChanged(sender: any, args: UIBase.TNavableStateChangedArgs) {
		switch (args.stateNew) {
			case UIBase.NavableStates.Displaying: {
				if (this._page.life === UIBase.PageLifeKinds.Persistent && this._built) {
					H5PController.resetH5PContent(this);
				}
			}
		}
	}

} // H5PPlayer
