import Util from 'util';
import _ from 'lodash';
import Bluebird from 'bluebird';
import Msgpack from 'msgpack';
import ZMQ from 'zmq';
import UUID from 'uuid';
import Validator from './validator';

import Base from './client/discovery/base';
import Localhost from './client/discovery/localhost';
import Quadra from './client/discovery/quadra';

export Base;
export Localhost;
export Quadra;

export default class Client {
  constructor(discoverer) {
    discoverer.watch();
    this._discoverer = discoverer;

    this._requests = new Map();
    this._socket = this._createSocket();
  }

  get requests() {
    return this._requests;
  }

  get socket() {
    return this._socket;
  }

  get discoverer() {
    return this._discoverer;
  }

  receive(packedPayload) {
    const payload = Msgpack.unpack(packedPayload);

    // Validate the payload before sending
    const result = Validator.response(payload);

    // If we can't validate the payload, return a failing Promise
    if (result.error) {
      const validationError = new RangeError(Util.format(
        'The request payload was invalid: (%s)',
        _.map(result.error.details, 'message').join(', ')
      ));

      return Bluebird.reject(validationError);
    }

    // Assign the request & delete it from the hash
    const request = this.requests.get(payload.id);

    delete this.requests.delete(payload.id);

    // Execute it inside of a Promise to get error catching and waiting
    return Bluebird.resolve()
    .then(() => request.callback(payload.error, payload.data));
  }

  dispatch(model, task, params, callback) {
    // Setup the request we store
    const request = { model, task, params, callback };

    request.id = UUID.v4();
    request.timestamp = (new Date().getTime());

    // The payload consists of the entire request, sans callback
    const payload = _.omit(request, 'callback');

    // Validate the payload before sending
    const result = Validator.request(payload);

    // If we can't validate the payload, return a failing Promise
    if (result.error) {
      const validationError = new RangeError(Util.format(
        'The request payload was invalid: (%s)',
        _.map(result.error.details, 'message').join(', ')
      ));

      return Bluebird.reject(validationError);
    }

    // Push the request into our map
    this.requests.set(request.id, request);

    // Pack the payload and send it over the socket
    return this.socket.sendAsync(Msgpack.pack(payload));
  }

  _createSocket() {
    const socket = ZMQ.socket('dealer');
    Bluebird.promisifyAll(socket);

    socket.identity = UUID.v4();
    socket.connect('tcp://localhost:5671');
    socket.on('message', this.receive.bind(this));

    return socket;
  }
}
