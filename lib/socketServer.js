const { Server } = require('socket.io');
const { EventEmitter } = require('events');

const emitEvent = (emitter, eventName, value, socket=null) => {
  // const emitData = {eventName, data: value};
  const emitData = value;
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
      emitEvent(emitter, 'enqueue', data)
    })
    socket.on('dequeue', (callback) => {
      emitter.emit('dequeue', (next) => {
        callback(next);
      })
    })
    socket.on('size', (callback) => {
      emitter.emit('size', (queueSize) => {
        callback(queueSize)
      })
    })
    socket.on('success', () => {
      emitter.emit('job-success', socket.id)
    })
    socket.on('failure', () => {
      emitter.emit('job-failure', socket.id)
    })
    socket.on('setIdle', (isIdle, callback) => {
      emitter.emit('set-worker-idle', socket.id, JSON.parse(isIdle), callback);
    })
  })

  const on = (eventName, callback) => {
    emitter.on(eventName, (...data) => callback(...data));
  }
  const unicast = (eventName, socketId, data) => {
    const targetSocket = Array.from(sockets).find(socket => socket.id === socketId);
    targetSocket.emit(eventName, data);
  }
  const broadcast = (data) => {
    server.emit('bcast', data);
  }

  server.listen(6875);
  return {
    on,
    unicast,
    broadcast
  }
})()

module.exports = socketServer;