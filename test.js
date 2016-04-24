import Client from './src/client';
import Worker from './src/worker';

let worker = new Worker();
worker.registerTask('RoamingDevice:list', () => {
  return [{ label: 'Fooooo' }];
});

let client = new Client();

setTimeout(() => {
  client.dispatch('RoamingDevice', 'list', {}, (error, data) => {
    console.log('DATA', data);
  });
}, 2000);