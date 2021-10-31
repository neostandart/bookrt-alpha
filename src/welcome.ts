
class AppSplash {
	// Class Variables and Constants
	// -------------------------------------------------------------------
	private _hteSpinner: HTMLElement | null = null;
	private _bStarted: boolean = false;
	//

	// Public Members
	// -------------------------------------------------------------------

	public async start(timeout: number = -1): Promise<void> {
		if (!this._bStarted) {
			this._bStarted = true;
			//
			try {
				if (!this._hteSpinner) {
					this._hteSpinner = await this._loadSpinnerImpl("./app/appsplash/screen.html");
				}
				//
				if (this._hteSpinner) {
					if (!this._hteSpinner.parentElement) {
						document.body.prepend(this._hteSpinner);
					}
					setTimeout(() => {
						(this._hteSpinner as HTMLElement).classList.add("fadein");
					}, 10);
				} else {
					throw new Error("Failed to load the spinner implementation");
				}
			} catch (err) {
				// this._bExpired = true;
				console.error(err);
			}
		}
	}

	public stop(): void {
		if (this._bStarted) {
			if (this._hteSpinner) {
				this._hteSpinner.classList.add("fadeout");
				this._hteSpinner.classList.remove("fadein");
				setTimeout(() => {
					if (this._hteSpinner) {
						if (this._hteSpinner.parentElement) {
							this._hteSpinner.parentElement.removeChild(this._hteSpinner);
						}
						this._hteSpinner.classList.remove("fadeout");
					}
					//
					this._bStarted = false;
				}, 2000);
			}
		}
	}


	// Internal Members
	// -------------------------------------------------------------------

	private async _loadSpinnerImpl(path: string): Promise<HTMLElement | null> {
		let hteResult: HTMLElement | null = null;
		try {
			let response = await fetch(path);
			if (response.status === 200) {
				let html = await response.text();
				let parser = new DOMParser();
				let doc = parser.parseFromString(html, "text/html");
				if (doc.body.firstElementChild instanceof HTMLElement) {
					hteResult = doc.body.firstElementChild as HTMLElement;
					hteResult.parentElement?.removeChild(hteResult);
				} else {
					throw new Error("Spinner HTMLElement not found!");
				}
			} else {
				throw new Error(response.statusText);
			}
		} catch (err: any) {
			throw new Error(err.message);
		}
		//
		return hteResult;
	}
} // class AppSplash

// =====================================================================

/*
	Application Splash Screen start
*/

if (document.readyState !== "loading") {
	startWelcome();
} else {
	document.addEventListener("DOMContentLoaded", startWelcome);
}

//

function startWelcome(): void {
	let appsplash = new AppSplash();
	(window as any).AppSplash = appsplash;
	//
	appsplash.start();
}

