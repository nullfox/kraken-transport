import Util from 'util';
import _ from 'lodash';
import Bluebird from 'bluebird';
import Msgpack from 'msgpack';
import ZMQ from 'zmq';
import Validator from './validator';

export default class Worker {
  constructor() {
    this._tasks = new Map();
    this._socket = this._createSocket();
  }

  get tasks() {
    return this._tasks;
  }

  get socket() {
    return this._socket;
  }

  receive(rawIdentity, packedPayload) {
    const identity = rawIdentity.toString();
    const payload = Msgpack.unpack(packedPayload);

    // Validate the payload before moving on
    const result = Validator.request(payload);

    // If we can't validate the payload, return a failing Promise
    if (result.error) {
      const validationError = new RangeError(Util.format(
        'The request payload was invalid: (%s)',
        _.map(result.error.details, 'message').join(', ')
      ));

      return Bluebird.reject(validationError);
    }

    console.log('Received request', identity, payload);

    return Bluebird.resolve()
    .then(() => this.process(identity, payload));
  }

  dispatch(socketIdentity, requestId, error, data) {
    const payload = { data };

    payload.id = requestId;
    payload.error = null;

    // Validate the payload before moving on
    const result = Validator.response(payload);

    // If we can't validate the payload, return a failing Promise
    if (result.error) {
      const validationError = new RangeError(Util.format(
        'The response payload was invalid: (%s)',
        _.map(result.error.details, 'message').join(', ')
      ));

      return Bluebird.reject(validationError);
    }

    console.log('Dispatching response', socketIdentity, payload);

    return this.socket.sendAsync([socketIdentity, Msgpack.pack(payload)]);
  }

  process(identity, payload) {
    const taskKey = Util.format('%s:%s', payload.model, payload.task);

    return Bluebird.resolve()
    .bind(this)
    .then(() => this.tasks.get(taskKey)(payload.params))
    .then((response) => this.dispatch(identity, payload.id, null, response));
  }

  registerTask(task, fn) {
    this.tasks.set(task, fn);
  }

  _createSocket() {
    const socket = ZMQ.socket('router');
    Bluebird.promisifyAll(socket);

    socket.bindSync('tcp://*:5671');
    socket.on('message', this.receive.bind(this));

    return socket;
  }
}
