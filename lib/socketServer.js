const { Server } = require('socket.io');
const { EventEmitter } = require('events');

const SOCKET_SERVER_PORT = process.env.SOCKET_SERVER_PORT || 6875;

const socketServer = (function(){
  const server = new Server();
  const sockets = new Set();
  const emitter = new EventEmitter();

  const _addToSockets = socket => {
    sockets.add(socket);
    emitter.emit('new-socket', socket.id);
  }

  const _removeFromSockets = socket => {
    sockets.delete(socket);
    emitter.emit('del-socket', socket.id);
  }

  server.on('connect', (socket) => {
    _addToSockets(socket);
    socket.on('disconnect', () => {
      _removeFromSockets(socket);
    })
    socket.on('enqueue', (data, callback) => {
      emitter.emit('enqueue', data)
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
    socket.on('success', (data) => {
      emitter.emit('job-success', socket.id, data)
    })
    socket.on('failure', (data) => {
      emitter.emit('job-failure', socket.id, data)
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

  server.listen(SOCKET_SERVER_PORT);
  return {
    on,
    unicast,
    broadcast
  }
})()

module.exports = socketServer;