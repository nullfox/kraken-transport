import { EventEmitter } from 'events';
import Util from 'util';
import _ from 'lodash';
import Bluebird from 'bluebird';

export default class Base extends EventEmitter {
  static isAvailable() {
    return true;
  }

  constructor() {
    super();

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
    .then((newHosts) => {
      const removedHosts = [];

      _.difference(this.hosts, newHosts).forEach((host) => {
        removedHosts.push(host);
      });

      this._hosts = _.without(this.hosts.concat(newHosts), removedHosts);

      return {
        found: newHosts,
        gone: removedHosts,
        current: this.hosts
      };
    })
    .tap((hosts) => {
      this.emit('update', hosts);
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
