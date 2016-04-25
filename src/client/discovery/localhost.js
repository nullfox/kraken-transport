import Base from './base';

export default class Localhost extends Base {
  run() {
    return ['tcp://localhost:5671'];
  }
};