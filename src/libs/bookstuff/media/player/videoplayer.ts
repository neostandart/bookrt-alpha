import { Helper, Markup } from "../../../../engine/service/aid/aid.js";
import * as UIBase from "../../../../engine/system/common/uibase.js";
import * as Ctr from "../../../../engine/jet/control/control.js";
import { MediaPlayerStates } from "./mediabase.js";
import { App } from "../../../../engine/system/runtime/app.js";
//

export class Videoplayer extends Ctr.UIControl {
	/* Class Variables and Constants
	----------------------------------------------------------*/
	private _video: HTMLVideoElement | null = null;
	private _hteControlPanel: HTMLElement | null = null;
	private _btnStop: HTMLButtonElement | null = null;
	private _btnPlay: HTMLButtonElement | null = null;
	private _btnLoop: HTMLButtonElement | null = null;

	private _hteTimeCurrent: HTMLElement | null = null;
	private _hteTimeDuration: HTMLElement | null = null;

	private _hteLoaded: HTMLElement | null = null;
	private _htePlayed: HTMLElement | null = null;
	private _hteSensor: HTMLElement | null = null;
	private _nStartOffset: number = 0;

	private _btnFullScreen: HTMLButtonElement | null = null;

	private _hteVolumeAdjust: HTMLElement | null = null;
	private _inputVolumeValue: HTMLInputElement | null = null;
	private _btnVolume: HTMLButtonElement | null = null;
	private _btnMute: HTMLButtonElement | null = null;

	private _fOutsideClickHandler: (ev: Event) => void;
	//

	/* Construction / Initialization / Desctruction
	----------------------------------------------------------*/

	constructor(libref: UIBase.IExtLibrary, page: UIBase.IBookPage, presenter: HTMLElement, initinfo: Ctr.TControlOptions) {
		super(libref, page, presenter, initinfo);
		//
		this._fOutsideClickHandler = this._onDocumentClick.bind(this);
	}


	/* Public Members
	----------------------------------------------------------*/

	public get loop(): boolean {
		return (this._video ? this._video.loop : false);
	}

	public set loop(bLoop: boolean) {
		if (this._video) {
			this._video.loop = bLoop;
			if (bLoop) {
				this._presenter.classList.add("loop");
			} else {
				this._presenter.classList.remove("loop");
			}
		}
	}

	public get muted(): boolean {
		return (this._video ? this._video.muted : false);
	}

	public set muted(bMuted: boolean) {
		if (this._video) {
			this._video.muted = bMuted;
			if (bMuted) {
				this._presenter.classList.add("media-muted");
			} else {
				this._presenter.classList.remove("media-muted");
			}

		}
	}

	public stop(): void {
		switch (this._mediastate) {
			case MediaPlayerStates.Playing:
			case MediaPlayerStates.Paused:
				{
					this._changeMediaState(MediaPlayerStates.Stopped);
					this._video?.pause();
					(this._video as HTMLAudioElement).currentTime = 0;
					break;
				}
		}
	}

	public pause(): void {
		switch (this._mediastate) {
			case MediaPlayerStates.Playing: {
				this._video?.pause();
				break;
			}
			case MediaPlayerStates.Stopped: {
				this._changeMediaState(MediaPlayerStates.Paused);
			}
		}
	}

	public play(): void {
		switch (this._mediastate) {
			case MediaPlayerStates.Opening:
			case MediaPlayerStates.Stopped:
			case MediaPlayerStates.Paused:
				{
					this._video?.play();
					break;
				}
		}
	}


	/* Internal Members
	----------------------------------------------------------*/

	protected async _onStartPoint(): Promise<any> {
		let templset: UIBase.TTemplateSet = await this._fetchTemplate();
		//
		let hteWorkArea = templset.elements.get("workarea") as HTMLElement;
		this._video = hteWorkArea.querySelector("video") as HTMLVideoElement;
		if (this._presenter.dataset.preload) {
			this._video.preload = this._presenter.dataset.preload;
		} else {
			this._video.preload = "none";
		}
		//
		if (this._presenter.dataset.poster) {
			this._video.poster = this._page.processor.resolvePath(this._presenter.dataset.poster);
		}		
		//
		let sources = this._presenter.querySelectorAll("source");
		sources.forEach((src) => {
			this._video?.appendChild(src);
		});

		this._video?.addEventListener("progress", this._onAudioProgress.bind(this));
		this._video?.addEventListener("loadeddata", this._onAudioLoadeddata.bind(this));
		this._video?.addEventListener("durationchange", this._onAudioDurationchange.bind(this));
		this._video?.addEventListener("timeupdate", this._onAudioTimeupdate.bind(this));
		this._video?.addEventListener("volumechange", this._onAudioVolumechange.bind(this));
		this._video?.addEventListener("play", this._onAudioPlay.bind(this));
		this._video?.addEventListener("pause", this._onAudioPause.bind(this));
		this._video?.addEventListener("ended", this._onAudioEnded.bind(this));
		//
		this._video?.addEventListener("seeking", this._onMediaSeeking.bind(this));
		this._video?.addEventListener("seeked", this._onMediaSeeked.bind(this));
		//
		//
		this._hteControlPanel = hteWorkArea.querySelector("#controlpanel") as HTMLElement;
		//
		this._btnPlay = hteWorkArea.querySelector("#play_btn") as HTMLButtonElement;
		this._btnPlay.addEventListener("click", this._onPlayBtnClick.bind(this));

		this._btnStop = hteWorkArea.querySelector("#stop_btn") as HTMLButtonElement;
		this._btnStop.addEventListener("click", this._onStopBtnClick.bind(this));

		this._btnLoop = hteWorkArea.querySelector("#loop_btn") as HTMLButtonElement;
		this._btnLoop.addEventListener("click", this._onLoopBtnClick.bind(this));
		//
		//
		this._hteTimeCurrent = hteWorkArea.querySelector("#timecurrent") as HTMLElement;
		this._hteTimeDuration = hteWorkArea.querySelector("#timeduration") as HTMLElement;
		//
		//
		this._hteLoaded = hteWorkArea.querySelector("#barloaded") as HTMLElement;
		this._htePlayed = hteWorkArea.querySelector("#barplayed") as HTMLElement;
		this._hteSensor = hteWorkArea.querySelector("#sensor") as HTMLElement;
		if (this._hteSensor) {
			this._hteSensor.addEventListener("click", this._onSensorClick.bind(this));
		}
		//
		this._btnFullScreen = hteWorkArea.querySelector("#fullscreen_btn") as HTMLButtonElement;
		if (this._btnFullScreen) {
			this._btnFullScreen.addEventListener("click", this._onFullScreenClick.bind(this));
		}
		//
		this._btnVolume = hteWorkArea.querySelector("#volume_btn") as HTMLButtonElement;
		this._btnVolume.addEventListener("click", this._onVolumeBtnClick.bind(this));

		this._btnMute = hteWorkArea.querySelector("#mute_btn") as HTMLButtonElement;
		this._btnMute.addEventListener("click", this._onMuteBtnClick.bind(this));
		//
		this._hteVolumeAdjust = hteWorkArea.querySelector("#volumeadjust") as HTMLElement;
		this._inputVolumeValue = this._hteVolumeAdjust.querySelector("#volumevalue");
		if (this._inputVolumeValue) {
			this._inputVolumeValue.addEventListener("change", this._onVolumeValueChange.bind(this));
		}
		//
		await this._completeBuild({ style: templset.styles, workarea: hteWorkArea });
	}

	//
	// Volume Adjust
	//

	private _positionVolumeAdjust(): void {
		if (this._btnVolume && this._hteVolumeAdjust && this._btnVolume) {
			let rcBtn = Markup.getBoundsWithin(this._workarea, this._btnVolume);
			//
			let nLeft = rcBtn.left - this._hteVolumeAdjust.offsetWidth;
			let nTop = rcBtn.top - ((this._hteVolumeAdjust.offsetHeight - rcBtn.height) / 2);
			//
			this._hteVolumeAdjust.style.left = nLeft + "px";
			this._hteVolumeAdjust.style.top = nTop + "px";
			this._hteVolumeAdjust.classList.add("visible");
		}
	}

	private _toggleVolumeAdjust(): void {
		if (this._hteVolumeAdjust) {
			if (this._hteVolumeAdjust.classList.contains("visible")) {
				this._hteVolumeAdjust.classList.remove("visible");
				//
				App.doc.removeEventListener("click", this._fOutsideClickHandler);
			} else {
				this._positionVolumeAdjust();
				this._hteVolumeAdjust.classList.add("visible");
				//
				App.doc.addEventListener("click", this._fOutsideClickHandler);
			}
		}
	}

	//
	// Update States
	//

	private _updateAudioLoaded(percent: number): void {
		if (this._hteLoaded) {
			this._hteLoaded.style.width = (percent + "%");
		}
	}

	private _updateCurrentTime(seconds: number): void {
		if (this._hteTimeCurrent) {
			this._hteTimeCurrent.innerHTML = Helper.convertSecondsToTime(seconds);
		}
		//
		if (this._video && this._htePlayed) {
			this._htePlayed.style.width = (((seconds / this._video.duration) * 100) + "%");
		}
	}

	private _adjustCurrentTime(perc: number): void {
		if (this._video) {
			let nCurrentTime = (this._video.duration / 100) * perc;
			this._video.currentTime = Number.isNaN(nCurrentTime) ? 0 : nCurrentTime;
			if (this._mediastate === MediaPlayerStates.Stopped) {
				this.pause();
			}
		}
	}

	private _adjustAudioVolumeInput(): void {
		if (this._video && this._inputVolumeValue) {
			let nValuePlayer: number = this._video.volume * 100;
			let nValueInput: number = parseInt(this._inputVolumeValue.value, 10);
			if (nValuePlayer !== nValueInput) {
				this._inputVolumeValue.setAttribute("value", nValuePlayer.toString());
			}
		}
	}

	//
	// Overridden
	//

	/** @override */
	protected _onStateChanged(stateNew: UIBase.ControlStates, stateOld: UIBase.ControlStates): void {
		if (stateNew === UIBase.ControlStates.Pending) {
			this._presenter.classList.add("mediapending");
		} else {
			if (stateOld === UIBase.ControlStates.Pending) {
			this._presenter.classList.remove("mediapending");
			}
		}
	}

	/** @override */
	protected _onPageStateChanged(page: UIBase.IBookPage, args: UIBase.TNavableStateChangedArgs): void {
		switch (args.stateNew) {
			case UIBase.NavableStates.Outgoing: {
				if (this._mediastate === MediaPlayerStates.Playing) {
					this.pause();
				}
				break;
			}
		} // switch
	}


	/* Event Handlers
	----------------------------------------------------------*/

	private _onPlayBtnClick(ev: Event): void {
		switch (this._mediastate) {
			case MediaPlayerStates.Closed: {
				this._changeMediaState(MediaPlayerStates.Opening);
				this.play();
				break;
			}
			case MediaPlayerStates.Stopped: {
				this.play();
				break;
			}
			case MediaPlayerStates.Paused: {
				this.play();
				break;
			}
			case MediaPlayerStates.Playing: {
				this.pause();
				break;
			}
		}
	}

	private _onStopBtnClick(ev: Event): void {
		this.stop();
	}

	private _onSensorClick(ev: MouseEvent): void {
		switch (this._mediastate) {
			case MediaPlayerStates.Closed:
			case MediaPlayerStates.Opening: {
				this._nStartOffset = Math.round((100 / (<HTMLElement>this._hteSensor).clientWidth) * ev.offsetX);
				break;
			}
			case MediaPlayerStates.Stopped:
			case MediaPlayerStates.Paused:
			case MediaPlayerStates.Playing: {
				let nOffsetPerc: number = Math.ceil((100 / (<HTMLElement>this._hteSensor).clientWidth) * ev.offsetX);
				this._adjustCurrentTime(nOffsetPerc);
				break;
			}
		}
	}

	private _onLoopBtnClick(ev: Event): void {
		this.loop = !this.loop;
	}

	private _onVolumeBtnClick(ev: Event): void {
		this._toggleVolumeAdjust();
	}

	private _onMuteBtnClick(ev: Event): void {
		this.muted = !this.muted;
	}

	private _onVolumeValueChange(ev: Event): void {
		if (this._video && this._inputVolumeValue) {
			let nValue: number = parseInt(this._inputVolumeValue.value, 10);
			nValue = nValue / 100;
			this._video.volume = nValue;
		}
	}

	private _onDocumentClick(ev: Event): void {
		if (this._hteVolumeAdjust && this._hteVolumeAdjust.classList.contains("visible")) {
			if (!(ev.target as HTMLElement).closest(`#${this.id}`)) {
				this._toggleVolumeAdjust();
			}
		}
	}

	private _onFullScreenClick(ev: Event): void {
		this._video?.requestFullscreen();
	}

	//

	private _onAudioDurationchange(ev: Event): void {
		if (this._hteTimeDuration && this._video) {
			this._hteTimeDuration.innerHTML = Helper.convertSecondsToTime(this._video.duration);
			//
			if (this._nStartOffset > 0) {
				this._adjustCurrentTime(this._nStartOffset);
				this._nStartOffset = 0;
			}
		}
		//
		this._adjustAudioVolumeInput();
	}

	private _onAudioLoadeddata(ev: Event): void {
		this._changeMediaState(MediaPlayerStates.Stopped);
	}

	private _onAudioTimeupdate(ev: Event): void {
		this._updateCurrentTime((<HTMLAudioElement>this._video).currentTime);
	}

	private _onAudioVolumechange(ev: Event): void {
		this._adjustAudioVolumeInput();
	}

	private _onAudioPlay(ev: Event): void {
		this._changeMediaState(MediaPlayerStates.Playing);
	}

	private _onAudioPause(ev: Event): void {
		switch (this._mediastate) {
			case MediaPlayerStates.Playing: {
				if (this._video?.currentTime === this._video?.duration) {
					this.stop();
				} else {
					this._changeMediaState(MediaPlayerStates.Paused);
				}
				//
				break;
			}
		}
	}

	private _onAudioEnded(ev: Event): void {
		this.stop();
	}

	private _onAudioProgress(ev: Event): void {
		if (this._video) {
			if (this._video.buffered.length > 0) {
				this._updateAudioLoaded((this._video.buffered.end(0) / this._video.duration) * 100);
			} else {
				this._updateAudioLoaded(0);
			}
		}
	}

	private _onMediaSeeking(ev: Event): void {
		if (this._video) {
			this._changeState(UIBase.ControlStates.Pending);
		}
	}

	private _onMediaSeeked(ev: Event): void {
		if (this._video) {
			this._changeState(UIBase.ControlStates.Work);
		}
	}

	
	/* State Machine
	----------------------------------------------------------*/

	private _mediastate: MediaPlayerStates = MediaPlayerStates.Closed;

	public get mediastate(): MediaPlayerStates {
		return this._mediastate;
	}

	private _changeMediaState(stateNew: MediaPlayerStates): void {
		if (this._mediastate === stateNew) { return; }
		//
		const stateOld: MediaPlayerStates = this._mediastate;
		this._mediastate = stateNew;
		//
		const stateNow = this._mediastate;
		switch (stateNow) {
			case MediaPlayerStates.Closed: {

				break;
			}
			case MediaPlayerStates.Opening: {


				break;
			}
			case MediaPlayerStates.Stopped: {
				this._presenter.classList.add("media-stop");
				this._presenter.classList.remove(...["media-pause", "media-play"]);
				break;
			}
			case MediaPlayerStates.Playing: {
				this._presenter.classList.add("media-play");
				this._presenter.classList.remove(...["media-pause", "media-stop"]);
				break;
			}
			case MediaPlayerStates.Paused: {
				this._presenter.classList.add("media-pause");
				this._presenter.classList.remove(...["media-play", "media-stop"]);
				break;
			}
		}
	}

} // class Videoplayer

