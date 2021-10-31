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
var BkSeparator = /** @class */ (function (_super) {
    __extends(BkSeparator, _super);
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
    function BkSeparator(config, contentId, contentData) {
        if (contentData === void 0) { contentData = {}; }
        var _this = _super.call(this) || this;
        //
        _this._id = contentId;
        //
        _this._htePresenter = document.createElement("div");
        _this._htePresenter.id = _this._id;
        _this._htePresenter.classList.add("h5p-bkseparator");
        //
        // Height
        if (config.height) {
            _this._htePresenter.style.height = config.height;
            //
            if (_this._htePresenter.style.height !== "auto") {
                _this._htePresenter.style.display = "flex";
                _this._htePresenter.style.alignItems = "center";
                _this._htePresenter.style.justifyContent = "stretch";
            }
        }
        // Fill
        if (config.useFill && config.colorFill) {
            _this._htePresenter.style.backgroundColor = config.colorFill;
        }
        // Margin
        if (config.margin) {
            _this._htePresenter.style.margin = config.margin;
        }
        // Padding
        if (config.padding) {
            _this._htePresenter.style.padding = config.padding;
        }
        // Text
        if (config.textField) {
            _this._htePresenter.innerHTML = config.textField;
            var hteTextBlock = _this._htePresenter.firstElementChild;
            if (hteTextBlock) {
                hteTextBlock.style.lineHeight = "1.2";
                hteTextBlock.style.flex = "1"; // for (this._htePresenter.style.display = "flex")
            }
        }
        //
        _this.on("resize", _this._onResize.bind(_this));
        return _this;
    }
    /* Infrastructure
    ----------------------------------------------------------*/
    /**
     * Attach library to wrapper
     *
     * @param {jQuery} $wrapper
     */
    BkSeparator.prototype.attach = function ($wrapper) {
        this._$wrapper = $wrapper;
        //
        var hteWrapper = $wrapper.get(0);
        hteWrapper.appendChild(this._htePresenter);
    };
    /* Internal Members
    ----------------------------------------------------------*/
    /* Internal Utils
    ----------------------------------------------------------*/
    /* Event Handlers
    ----------------------------------------------------------*/
    BkSeparator.prototype._onResize = function () {
        //
    };
    return BkSeparator;
}(H5P.EventDispatcher)); // class BkSeparator
//
//
// Library registration
H5P = window.H5P || {};
H5P.BkSeparator = BkSeparator;
