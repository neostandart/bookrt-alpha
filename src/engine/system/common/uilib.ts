import { App } from "../runtime/app.js";
//

export class Queue<T> {
    private _store: T[] = [];
    public push(val: T) {
      this._store.push(val);
    }
    public pop(): T | undefined {
      return this._store.shift();
    }

    public get length(): number {
      return this._store.length;
    }
  } // class Queue




