const { Server } = require('socket.io');
const { createServer } = require('http');
const { EventEmitter } = require('events');

const emitEvent = (emitter, eventName, value, socket=null) => {
  const emitData = {eventName, data: value};
  emitter.emit(eventName, emitData);
  socket !== null && socket.emit(eventName, emitData);
}

const socketServer = (function(){
  const server = new Server();
  const sockets = new Set();
  const emitter = new EventEmitter();

  const addToSockets = socket => {
    sockets.add(socket);
    const eventName = 'new-socket';
    const entry = socket.id;
    emitEvent(emitter, eventName, entry);
  }
  const removeFromSockets = socket => {
    sockets.delete(socket);
    const eventName = 'del-socket';
    const entry = socket.id;
    emitEvent(emitter, eventName, entry);
  }

  server.on('connect', (socket) => {
    addToSockets(socket);
    socket.on('disconnect', () => {
      removeFromSockets(socket);
    })
    socket.on('enqueue', (data, callback) => {
      jobQueue.enqueue(data);
      callback(jobQueue.size())
    })
    socket.on('dequeue', (callback) => {
      const next = jobQueue.dequeue();
      callback(next);
    })
    socket.on('size', (callback) => {
      callback(jobQueue.size())
    })
  })

  const on = (eventName, callback) => {
    emitter.on(eventName, data => callback(data));
  }

  server.listen(6875);
  return {
    on
  }
})()


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

// socketServer.on('new-socket', id => console.log('connected:',id))
// socketServer.on('del-socket', id => console.log('disconnected:',id))
// socketServer.on('enqueue', data => queue.enqueue(data));

