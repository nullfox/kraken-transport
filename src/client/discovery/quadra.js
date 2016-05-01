import Util from 'util';
import _ from 'lodash';
import Bluebird from 'bluebird';
import request from 'request';
import Base from './base';

export default class Quadra extends Base {
  static isAvailable() {
    return process.env.QUADRA_CONSUL_HOST && process.env.BACKEND_POOL;
  }

  constructor() {
    super();

    if (!process.env.QUADRA_CONSUL_HOST || !process.env.BACKEND_POOL) {
      throw new Error(
        'Required QUADRA_CONSUL_HOST and/or BACKEND_POOL env variables were not available'
      );
    }
  }

  run() {
    return this.getInstanceIps();
  }

  getInstanceIps() {
    return this.fetchQuadraInstances()
    .then(this.formatQuadraIps.bind(this));
  }

  fetchQuadraInstances() {
    const path = Util.format(
      '/v1/kv/quadra/pools/%s/instances?recurse',
      process.env.BACKEND_POOL
    );

    return new Bluebird((resolve, reject) => {
      request.get({
        url: Util.format(
          'https://%s:%s%s',
          process.env.QUADRA_CONSUL_HOST,
          process.env.QUADRA_CONSUL_PORT,
          path
        ),
        rejectUnauthorized: false,
        method: 'GET'
      }, (err, resp, body) => {
        if (err || !body) {
          if (!err) {
            err = new Error('No or invalid response from Consul');
          }

          reject(err);
        } else {
          resolve(_.isString(body) ? JSON.parse(body) : body);
        }
      });
    });
  }

  formatQuadraIps(ips) {
    return ips.filter((kv) => kv.Value)
    .map((kv) => {
      const host = Util.format(
        'tcp://%s:5671',
        JSON.parse(new Buffer(kv.Value, 'base64').toString()).nat_ip
      );

      return host;
    });
  }
}
