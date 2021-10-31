"use strict";
/// <reference path="h5p-global.d.ts" />
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        if (typeof b !== "function" && b !== null)
            throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
var BkSoundedBlock = /** @class */ (function (_super) {
    __extends(BkSoundedBlock, _super);
    //
    /* Construction / Initialization / Desctruction
    ----------------------------------------------------------*/
    /**
     * @constructor
     *
     * @param {object} config
     * @param {string} contentId
     * @param {object} contentData
     */
    function BkSoundedBlock(config, contentId, contentData) {
        var _a;
        if (contentData === void 0) { contentData = {}; }
        var _b, _c;
        var _this = _super.call(this) || this;
        //
        _this._hteSoundedText = null;
        _this._htePlayToggle = null;
        _this._audio = null;
        /* State Machine
        ----------------------------------------------------------*/
        _this.STATES = { Init: 0, Stopped: 1, Playing: 2, Error: 3 };
        _this._state = _this.STATES.Init;
        //
        _this._changeState(_this.STATES.Init);
        _this._id = contentId;
        //
        _this._htePresenter = document.createElement("div");
        _this._htePresenter.id = _this._id;
        _this._htePresenter.classList.add("h5p-bksoundedblock");
        //
        _this._colorPlayButton = (_b = config.colorPlayButton) !== null && _b !== void 0 ? _b : null;
        _this._colorHighlight = (_c = config.colorHighlight) !== null && _c !== void 0 ? _c : null;
        //
        try {
            //
            _a = _this._buildContent(config), _this._hteSoundedText = _a[0], _this._htePlayToggle = _a[1];
            _this._audio = _this._prepareAudio(config);
            //
            _this.on("resize", _this._onResize.bind(_this));
        }
        catch (err) {
            _this._changeState(_this.STATES.Error, err);
        }
        return _this;
    }
    /* Infrastructure
    ----------------------------------------------------------*/
    /**
     * Attach library to wrapper
     *
     * @param {jQuery} $wrapper
     */
    BkSoundedBlock.prototype.attach = function ($wrapper) {
        this._$wrapper = $wrapper;
        //
        var hteWrapper = $wrapper.get(0);
        hteWrapper.appendChild(this._htePresenter);
        //
        if (this._state === this.STATES.Init) {
            this._changeState(this.STATES.Stopped);
        }
    };
    /* Internal Members
    ----------------------------------------------------------*/
    BkSoundedBlock.prototype._buildContent = function (settings) {
        var hteTemp = document.createElement("div");
        hteTemp.innerHTML = settings.textField;
        var hteTextBlock = hteTemp.firstElementChild;
        if (hteTextBlock) {
            hteTextBlock.style.marginTop = "0";
            hteTextBlock.style.marginBottom = "0";
            hteTextBlock.style.lineHeight = "1.2";
            //
            if (settings.fontSize) {
                hteTextBlock.style.fontSize = settings.fontSize;
            }
            //
            var hteSoundedText = document.createElement("span");
            hteSoundedText.classList.add("sounded-text");
            hteSoundedText.append.apply(hteSoundedText, Array.from(hteTextBlock.childNodes));
            hteTextBlock.appendChild(hteSoundedText);
            //
            var hteSoundImage = document.createElement("span");
            hteSoundImage.classList.add("sound-image");
            hteSoundImage.innerHTML = "&NoBreak;";
            hteTextBlock.appendChild(hteSoundImage);
            //
            hteSoundedText.addEventListener("click", this._onPlayToggle.bind(this));
            hteSoundImage.addEventListener("click", this._onPlayToggle.bind(this));
            //
            this._htePresenter.appendChild(hteTextBlock);
            return [hteSoundedText, hteSoundImage];
        }
        else {
            // это какой-то глюк :-(
            this._changeState(this.STATES.Error);
            throw new Error("Source data format error.");
        }
    };
    BkSoundedBlock.prototype._prepareAudio = function (settings) {
        var audio = document.createElement("audio");
        audio.preload = "auto";
        //
        if (settings.files instanceof Array) {
            for (var i = 0; i < settings.files.length; i++) {
                var file = settings.files[i];
                if (audio.canPlayType(file.mime)) {
                    var source = document.createElement("source");
                    source.src = H5P.getPath(file.path, this._id);
                    source.type = file.mime;
                    audio.appendChild(source);
                }
            }
        }
        //
        audio.addEventListener("ended", this._onAudioEnded.bind(this));
        audio.addEventListener("pause", this._onAudioPaused.bind(this));
        audio.addEventListener("error", this._onAudioError.bind(this));
        //
        return audio;
    };
    BkSoundedBlock.prototype._highlightOn = function () {
        if (this._htePlayToggle) {
            if (this._colorPlayButton) {
                this._htePlayToggle.style.backgroundColor = this._colorPlayButton;
            }
            this._htePlayToggle.classList.add("playing");
        }
        //
        if (this._hteSoundedText) {
            if (this._colorHighlight) {
                this._hteSoundedText.style.backgroundColor = this._colorHighlight;
            }
            this._hteSoundedText.classList.add("playing");
        }
    };
    BkSoundedBlock.prototype._highlightOff = function () {
        if (this._htePlayToggle) {
            if (this._colorPlayButton) {
                this._htePlayToggle.style.backgroundColor = this._colorPlayButton;
            }
            this._htePlayToggle.classList.remove("playing");
        }
        //
        if (this._hteSoundedText) {
            if (this._colorHighlight) {
                this._hteSoundedText.style.backgroundColor = "initial";
            }
            this._hteSoundedText.classList.remove("playing");
        }
    };
    /* Internal Utils
    ----------------------------------------------------------*/
    /* Event Handlers
    ----------------------------------------------------------*/
    BkSoundedBlock.prototype._onResize = function () {
        //
    };
    BkSoundedBlock.prototype._onPlayToggle = function (ev) {
        var _a, _b;
        switch (this._state) {
            case this.STATES.Stopped: {
                (_a = this._audio) === null || _a === void 0 ? void 0 : _a.play();
                this._changeState(this.STATES.Playing);
                break;
            }
            case this.STATES.Playing: {
                (_b = this._audio) === null || _b === void 0 ? void 0 : _b.pause();
                break;
            }
        }
    };
    BkSoundedBlock.prototype._onAudioEnded = function (ev) {
        this._audio.currentTime = 0;
        this._changeState(this.STATES.Stopped);
    };
    BkSoundedBlock.prototype._onAudioPaused = function (ev) {
        this._audio.currentTime = 0;
        this._changeState(this.STATES.Stopped);
    };
    BkSoundedBlock.prototype._onAudioError = function (ev) {
        this._changeState(this.STATES.Error, ev);
    };
    BkSoundedBlock.prototype._changeState = function (stateNew, params) {
        if (this._state === stateNew) {
            return;
        }
        //
        var stateOld = this._state;
        this._state = stateNew;
        //
        switch (stateNew) {
            case this.STATES.Stopped: {
                this._highlightOff();
                //
                break;
            }
            case this.STATES.Playing: {
                this._highlightOn();
                //
                break;
            }
            case this.STATES.Error: {
                var strErrorMessage = void 0;
                if (params && params.message) {
                    strErrorMessage = params.message;
                }
                if (!strErrorMessage) {
                    strErrorMessage = "Error!";
                }
                this._htePresenter.innerHTML = strErrorMessage;
                //
                break;
            }
        }
    };
    return BkSoundedBlock;
}(H5P.EventDispatcher)); // class BkSoundedBlock
//
//
// Load library
H5P = window.H5P || {};
H5P.BkSoundedBlock = BkSoundedBlock;
