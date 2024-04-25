const { EventEmitter } = require('events');

const jobQueue = (function(){
  let list = [];
  const emitter = new EventEmitter();

  const enqueue = (entry) => {
    list.push(entry);
    emitter.emit('enqueue', entry);
  }

  const dequeue = () => {
    const [next, ...rest] = list;
    list = rest;
    emitter.emit('dequeue', next);
    return next;
  }

  const size = () => list.length;

  const on = (eventName, callback) => {
    emitter.on(eventName, data => callback(data));
  }

  return {
    enqueue,
    dequeue,
    size,
    on
  }
})()

module.exports = jobQueue;