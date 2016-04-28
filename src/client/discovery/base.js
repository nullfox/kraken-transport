import Bluebird from 'bluebird';

export default class Base {
  constructor() {
    this._hosts = [];
    this._interval = false;
  }

  get hosts() {
    return this._hosts;
  }

  run() {
    throw new Error('Run must be implemented in your subclass');
  }

  discover() {
    return Bluebird.resolve()
    .then(() => this.run())
    .then((hosts) => {
      this._hosts = hosts;
    });
  }

  watch() {
    if (this._interval) {
      clearInterval(this._interval);
    }

    this.discover();

    this._interval = setInterval(this.discover.bind(this), 2500);
  }
}
