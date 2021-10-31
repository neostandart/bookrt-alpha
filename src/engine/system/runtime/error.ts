

export class ErrorCase {
	// Class Variables and Constants
	// -------------------------------------------------------------------
	private _strInitiator?: string;
	private _strCaption?: string;
	private _strStack?: string;
	private _bFatal: boolean;
	//
	private _strMessage?: string;

	// Construction / Initialization / Destruction
	// -------------------------------------------------------------------

	constructor(error: any, strCaption?: string | null, strInitiator?: string, bFatal: boolean = false) {
		this._strCaption = (strCaption) ? strCaption : "Error";
		this._strInitiator = strInitiator;
		this._strStack = (error.stack) ? error.stack : "";
		this._bFatal = bFatal;
		//
		this._processError(error);
	}

	public static createFrom(error: any): ErrorCase {
		return (error instanceof ErrorCase) ? error : new ErrorCase(error);
	}

	// Public Members
	// -------------------------------------------------------------------

	public toString(): string {
		return this.message;
	}

	public get message(): string {
		return (this._strMessage) ? this._strMessage : "no message";
	}

	public get caption(): string {
		return (this._strCaption) ? this._strCaption : "";
	}

	public set caption(strCaption: string) {
		this._strCaption = strCaption;
	}

	public setFatal(bFatal: boolean = true): void {
		this._bFatal = bFatal;
	}

	public addMessage(strMessage: string): void {
		if (this._strMessage) {
			this._strMessage = strMessage + "<br/>" + this._strMessage;
		} else {
			this._strMessage = strMessage;
		}
	}

	public addToStart(err: any): void {
		if (!(err instanceof ErrorCase)) {
			err = new ErrorCase(err);
		}
		//
		this._addToStart((err as ErrorCase).message);
	}

	public addToEnd(err: any): void {
		if (!(err instanceof ErrorCase)) {
			err = new ErrorCase(err);
		}
		//
		this._addToEnd((err as ErrorCase).message);
	}

	public getView(): HTMLElement {
		const hteErrorInfo: HTMLElement = document.createElement("div");
		hteErrorInfo.classList.add("errorinfo");
		//
		const hteCaption: HTMLElement = document.createElement("div");
		hteCaption.classList.add("infoitem");
		if (this._strCaption) {
			hteCaption.innerHTML = this._strCaption;
		}
		hteErrorInfo.appendChild(hteCaption);
		//
		const hteMessageCaption: HTMLElement = document.createElement("div");
		hteMessageCaption.classList.add("itemcaption");
		hteMessageCaption.innerHTML = "Message:";
		hteErrorInfo.appendChild(hteMessageCaption);
		//
		const hteMessage: HTMLElement = document.createElement("div");
		hteMessage.classList.add("infoitem");
		if (this._strMessage) {
			hteMessage.innerHTML = this._strMessage;
		}
		hteErrorInfo.appendChild(hteMessage);
		//
		const hteStackCaption: HTMLElement = document.createElement("div");
		hteStackCaption.classList.add("itemcaption");
		hteStackCaption.innerHTML = "Stack:";
		hteErrorInfo.appendChild(hteStackCaption);
		//
		const hteStack: HTMLElement = document.createElement("div");
		hteStack.classList.add("infoitem");
		if (this._strStack) {
			hteStack.innerHTML = this._strStack;
		}
		hteErrorInfo.appendChild(hteStack);
		//
		return hteErrorInfo;
	}

	public display(parent: Document | HTMLElement | null = null): void {
		if (parent instanceof Document) {
			parent = parent.querySelector("body");
		}
		//
		if (parent) {
			parent.classList.add("errorbanner");
			parent.innerHTML = "";
			parent.appendChild(this.getView());
		} else {
			let strFullText: string | undefined;
			if (this._strCaption) {
				strFullText = this._strCaption;
				strFullText += "\n";
				if (this._strMessage) {
					strFullText += this._strMessage;
				}
			} else {
				strFullText = this._strMessage;
			}
			//
			alert(strFullText);
		}
	}

	public static ensure(error: any, bFatal?: boolean, strMessage?: string): ErrorCase {
		let errorCaseSure: ErrorCase = (error instanceof ErrorCase) ?
			(error as ErrorCase) : new ErrorCase(error);
		//
		if (strMessage) {
			errorCaseSure.addMessage(strMessage);
		}
		//
		if (bFatal) { errorCaseSure.setFatal(bFatal); }
		return errorCaseSure;
	}

	public static extractMessage(err: any): string {
		let message: string | undefined;
		//
		if (err) {
			if (err instanceof XMLHttpRequest) {
				let request = <XMLHttpRequest>err;
				message = `XMLHttpRequest: statusText=${request.statusText}; responseURL=${request.responseURL}`;
			} else if (err.message) {
				message = err.message;
			} else if (err.toString) {
				message = err.toString();
			}
		}
		//
		if (!message) {
			message = "no message";
		}
		//
		return message;
	}

	// Internal Members
	// -------------------------------------------------------------------
	
	private _processError(source: any) {
		try {
			if (source) {
				this._strMessage = undefined;

				if (source.name) {
					this._addMessageSection("name: " + source.name);
				}

				if (source.message) {
					this._addMessageSection("message: " + source.message);
				}

				if (source instanceof XMLHttpRequest) {
					const errInfo: XMLHttpRequest = source as XMLHttpRequest;
					this._addMessageSection("XMLHttpRequest.Error: " + errInfo.statusText);
				}

				if (!this._strMessage && source) {
					this._strMessage = source as string;
				}

				if (!this._strMessage) {
					this._strMessage = "???";
				}
			} else {
				this._strMessage = "???";
			}
		} catch (error) {
			this._strMessage = "[Failed to process error]";
		}
		//
		if (this._strInitiator) {
			this._strMessage = "(Initiator: " + this._strInitiator + ") " + this._strMessage;
		}
	}

	private _addMessageSection(strSection: string): void {
		if (this._strMessage) {
			this._strMessage = this._strMessage + " | ";
		} else {
			this._strMessage = "";
		}
		//
		this._strMessage += strSection;
	}

	private _addToStart(strMessage: string): void {
		if (!this._strMessage) {
			this._strMessage = "";
		}
		//
		this._strMessage = strMessage + " | " + this._strMessage;
	}

	private _addToEnd(strMessage: string): void {
		if (this._strMessage) {
			this._strMessage = this._strMessage + " | ";
		} else {
			this._strMessage = "";
		}
		//
		this._strMessage += strMessage;
	}

} // END class ErrorCase
