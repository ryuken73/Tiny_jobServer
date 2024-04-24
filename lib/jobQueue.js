const { EventEmitter } = require('events');
const debug = require('debug');
const queueLogger = debug('queue:debug');

const emitEvent = (emitter, eventName, value, socket=null) => {
  // const emitData = {eventName, data: value};
  const emitData = value;
  emitter.emit(eventName, emitData);
  socket !== null && socket.emit(eventName, emitData);
}

const jobQueue = (function(){
  let list = [];
  const emitter = new EventEmitter();

  const enqueue = (entry) => {
    list.push(entry);
    const eventName = 'enqueue'
    emitEvent(emitter, eventName, entry);
  }

  const dequeue = () => {
    const [next, ...rest] = list;
    list = rest;
    const eventName = 'dequeue'
    emitEvent(emitter, eventName, next);
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

// queue.on('enqueue', (data) => console.log('event enqueue:', data));
// queue.on('dequeue', (data) => console.log('event dequeue:', data));

// queue.enqueue(1)
// queue.enqueue(2)
// queue.enqueue(3)

// console.log(queue.dequeue())
// queue.enqueue(4)
// console.log(queue.dequeue())
// console.log(queue.dequeue())
// console.log(queue.size())
