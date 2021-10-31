import * as UIBase from "../common/uibase.js";
//

export class EventNest<TArgs> implements UIBase.IEventNest<TArgs> {
	// Заглушка для ситуац. когда ожидаемый объект источник события - отсутствует
	public static getStub(): EventNest<any> {
		return new EventNest(null);
	}

	private _sender: any;
	private _handlers: UIBase.EventHandler<TArgs>[] = [];

	constructor(sender: any) {
		this._sender = sender;
	}

	public subscribe(handler: UIBase.EventHandler<TArgs>): void {
		// Один и тотже обраб. дважды и т.д. не подпишется.
		if (this._handlers.indexOf(handler) < 0) {
			this._handlers.push(handler);
		}
	}

	public unsubscribe(handler: UIBase.EventHandler<TArgs>): void {
		let index: number = this._handlers.indexOf(handler);
		if (index >= 0) {
			this._handlers.splice(index, 1);
		}
	}

	public raise(args: TArgs): void {
		this._handlers.forEach((handler: UIBase.EventHandler<TArgs>) => {
			handler(this._sender, args);
		});
	}

	// Public Members
	// -------------------------------------------------------------------

	public resetHandlers(): void {
		this._handlers.length = 0;
	}

} // END class EventNest


export class EventPool {
	private _pointers: any[] = [];

	public attacheListener(sender: any, strEventName: string, handler: any, bCapture: boolean): void {
		sender.addEventListener(strEventName, handler, bCapture);
		//
		this._pointers.push(() => {
			sender.removeEventListener(strEventName, handler);
		});
	}

	public attacheHandler(sender: EventNest<any>, handler: UIBase.EventHandler<any>): void {
		sender.subscribe(handler);
		//
		this._pointers.push(() => {
			sender.unsubscribe(handler);
		});
	}

	public disposeAll(): void {
		for (let f of this._pointers) {
			f();
		}
		//
		this._pointers.length = 0;
	}
} // END class EventPool
