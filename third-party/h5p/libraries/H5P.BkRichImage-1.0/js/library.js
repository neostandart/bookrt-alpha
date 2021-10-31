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
var BkRichImage = /** @class */ (function (_super) {
    __extends(BkRichImage, _super);
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
    function BkRichImage(config, contentId, contentData) {
        if (contentData === void 0) { contentData = {}; }
        var _this = _super.call(this) || this;
        //
        _this._id = contentId;
        //
        _this._htePresenter = document.createElement("div");
        _this._htePresenter.id = _this._id;
        _this._htePresenter.classList.add("h5p-bkrichimage");
        //
        _this._hteImage = _this._prepareImage(config.settingsImage);
        _this._hteText = _this._prepareText(config.settingsText);
        _this._adjustStyles(config.settingsImage, config.settingsText);
        //
        _this._htePresenter.appendChild(_this._hteImage);
        if (_this._hteText) {
            _this._htePresenter.appendChild(_this._hteText);
        }
        //
        _this.on("resize", _this._onResize.bind(_this));
        //
        _this._hteImage.addEventListener("load", function (ev) {
            _this.trigger("resize");
        });
        return _this;
    }
    /* Infrastructure
    ----------------------------------------------------------*/
    /**
     * Attach library to wrapper
     *
     * @param {jQuery} $wrapper
     */
    BkRichImage.prototype.attach = function ($wrapper) {
        this._$wrapper = $wrapper;
        //
        var hteWrapper = $wrapper.get(0);
        hteWrapper.appendChild(this._htePresenter);
    };
    /* Internal Members
    ----------------------------------------------------------*/
    BkRichImage.prototype._prepareImage = function (settings) {
        var _a;
        var hteImage = document.createElement("img");
        hteImage.classList.add("part-image");
        //
        hteImage.alt = (_a = settings.alt) !== null && _a !== void 0 ? _a : "";
        hteImage.src = H5P.getPath(settings.file.path, this._id);
        //
        return hteImage;
    };
    BkRichImage.prototype._prepareText = function (settings) {
        var _a;
        var hteText = (this._hasRawText(settings)) ? document.createElement("div") : null;
        //
        if (hteText) {
            hteText.classList.add("part-text");
            hteText.innerHTML = (_a = settings.textHTML) !== null && _a !== void 0 ? _a : "";
        }
        //
        return hteText;
    };
    /*
        Stylization of the element according to its individual settings
    */
    // private _adjustStyles(settingsImage: any, settingsText: any): void {
    // 	const hteStyle = document.createElement("style") as HTMLStyleElement;
    // 	//
    // 	let aImageStyles = [];
    // 	let aTextStyles = [];
    // 	//
    // 	aImageStyles.push(".h5p-container #" + this._id + " .part-image {");
    // 	//
    // 	if (settingsImage.autoWidth) {
    // 		aImageStyles.push(`width: auto;`);
    // 	} else {
    // 		if (settingsImage.widthImage) {
    // 			aImageStyles.push(`width: ${settingsImage.widthImage};`);
    // 		}
    // 	}
    // 	//
    // 	if (settingsImage.maxWidth) {
    // 		aImageStyles.push(`max-width: ${settingsImage.maxWidth};`);
    // 	} else {
    // 		aImageStyles.push("max-width: 100%;");
    // 	}
    // 	//
    // 	if (settingsImage.maxHeight) {
    // 		aImageStyles.push(`max-height: ${settingsImage.maxHeight};`);
    // 	}
    // 	//
    // 	if (settingsImage.marginLeft) {
    // 		aImageStyles.push(`margin-left: ${settingsImage.marginLeft};`);
    // 	}
    // 	//
    // 	if (settingsImage.marginRight) {
    // 		aImageStyles.push(`margin-right: ${settingsImage.marginRight};`);
    // 	}
    // 	//
    // 	//
    // 	if (this._hasRawText(settingsText) && this._hteText) {
    // 		aTextStyles.push("#" + this._id + " .part-text {");
    // 		//
    // 		const strTextLocation = (settingsText.textLocation) ? settingsText.textLocation : "below";
    // 		switch (strTextLocation) {
    // 			case "above": {
    // 				aImageStyles.push("grid-row: 2;");
    // 				aTextStyles.push("grid-row: 1;");
    // 				break;
    // 			}
    // 			case "below": {
    // 				aImageStyles.push("grid-row: 1;");
    // 				aTextStyles.push("grid-row: 2;");
    // 				break;
    // 			}
    // 		} // switch
    // 		//
    // 		if (settingsText.textDistance) {
    // 			let strTextDistance = "0";
    // 			switch (settingsText.textDistance) {
    // 				case "1": { strTextDistance = "0.25rem"; break; }
    // 				case "2": { strTextDistance = "0.5rem"; break; }
    // 				case "3": { strTextDistance = "1rem"; break; }
    // 				case "4": { strTextDistance = "1.5rem"; break; }
    // 				case "5": { strTextDistance = "3rem"; break; }
    // 			} // switch
    // 			//
    // 			switch (strTextLocation) {
    // 				case "above": {
    // 					aTextStyles.push(`margin-bottom: ${strTextDistance};`);
    // 					break;
    // 				}
    // 				case "below": {
    // 					aTextStyles.push(`margin-top: ${strTextDistance};`);
    // 					break;
    // 				}
    // 			} // switch
    // 		} // if (settingsText.textDistance)
    // 		//
    // 		aTextStyles.push("}");
    // 	} else {
    // 		// no text
    // 		aImageStyles.push("grid-row: 1;");
    // 	}
    // 	//
    // 	aImageStyles.push("}");
    // 	//
    // 	if (aTextStyles.length > 0) {
    // 		hteStyle.innerHTML = aImageStyles.join(" ") + " " + aTextStyles.join(" ");
    // 	} else {
    // 		hteStyle.innerHTML = aImageStyles.join(" ");
    // 	}
    // 	//
    // 	// этот вариант не работает (???)
    // 	let head = document.head || document.getElementsByTagName("head")[0];
    // 	head.appendChild(hteStyle);
    // }
    /*
        Another variant of this function is with a local setting of the HTML element style
    */
    BkRichImage.prototype._adjustStyles = function (settingsImage, settingsText) {
        if (settingsImage.autoWidth) {
            this._hteImage.style.width = "auto";
        }
        else {
            if (settingsImage.widthImage) {
                this._hteImage.style.width = settingsImage.widthImage;
            }
        }
        //
        if (settingsImage.maxWidth) {
            this._hteImage.style.maxWidth = settingsImage.maxWidth;
        }
        //
        if (settingsImage.maxHeight) {
            this._hteImage.style.maxHeight = settingsImage.maxHeight;
        }
        //
        if (settingsImage.marginLeft) {
            this._hteImage.style.marginLeft = settingsImage.marginLeft;
        }
        //
        if (settingsImage.marginRight) {
            this._hteImage.style.marginRight = settingsImage.marginRight;
        }
        //
        //
        if (this._hasRawText(settingsText) && this._hteText) {
            var strTextLocation = (settingsText.textLocation) ? settingsText.textLocation : "below";
            switch (strTextLocation) {
                case "above": {
                    this._hteImage.style.gridRow = "2";
                    this._hteText.style.gridRow = "1";
                    break;
                }
                case "below": {
                    this._hteImage.style.gridRow = "1";
                    this._hteText.style.gridRow = "2";
                    break;
                }
            } // switch
            //
            if (settingsText.textDistance) {
                var strTextDistance = "0";
                switch (settingsText.textDistance) {
                    case "1": {
                        strTextDistance = "0.25rem";
                        break;
                    }
                    case "2": {
                        strTextDistance = "0.5rem";
                        break;
                    }
                    case "3": {
                        strTextDistance = "1rem";
                        break;
                    }
                    case "4": {
                        strTextDistance = "1.5rem";
                        break;
                    }
                    case "5": {
                        strTextDistance = "3rem";
                        break;
                    }
                } // switch
                //
                switch (strTextLocation) {
                    case "above": {
                        this._hteText.style.marginBottom = strTextDistance;
                        break;
                    }
                    case "below": {
                        this._hteText.style.marginTop = strTextDistance;
                        break;
                    }
                } // switch
            } // if (settingsText.textDistance)
        }
        else {
            // no text
            this._hteImage.style.gridRow = "1";
        }
    };
    /* Internal Utils
    ----------------------------------------------------------*/
    BkRichImage.prototype._hasRawText = function (settingsText) {
        return !!(settingsText.textHTML);
    };
    /* Event Handlers
    ----------------------------------------------------------*/
    BkRichImage.prototype._onResize = function () {
        //
    };
    return BkRichImage;
}(H5P.EventDispatcher)); // class BkRichImage
//
//
// Load library
H5P = window.H5P || {};
H5P.BkRichImage = BkRichImage;
