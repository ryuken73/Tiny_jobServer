const { Server } = require('socket.io');
const { createServer } = require('http');
const { EventEmitter } = require('events');
const debug = require('debug');
const socketLogger = debug('socket:debug');
const queueLogger = debug('queue:debug');
const workerPoolLogger = debug('workerPool:debug');

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
    socket.on('success', () => {
      emitter.emit('job-success', socket.id)
    })
  })

  const on = (eventName, callback) => {
    emitter.on(eventName, data => callback(data));
  }
  const unicast = (eventName, socketId, data) => {
    const targetSocket = Array.from(sockets).find(socket => socket.id === socketId);
    targetSocket.emit(eventName, data);
  }
  const broadcast = (eventName, data) => {

  }

  server.listen(6875);
  return {
    on,
    unicast,
    broadcast
  }
})()

const workerPool = (function(){
  const emitter = new EventEmitter();
  const idleList = new Set();
  const addIdle = id => {
    idleList.add(id)
    emitter.emit('add-idle', id);
  }
  const delIdle = id => {
    idleList.delete(id);
    if(idleList.size === 0){
      emitter.emit('worker-exhausted')
    }
  }
  const getNextIdle = () => {
    if(idleList.size === 0){
      return null;
    }
    const next = Array.from(idleList)[0];
    if(idleList.has(next)){
      idleList.delete(next);
    }
    return next;
  }
  const getIdleList = () => {
    return Array.from(idleList);
  }
  const on = (eventName, callback) => {
    emitter.on(eventName, data => callback(data));
  }
  return {
    getIdleList,
    addIdle,
    delIdle,
    getNextIdle,
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

socketServer.on('new-socket', id => {
  socketLogger(`[${id}]new-socket`);
  workerPool.addIdle(id);
})

socketServer.on('del-socket', id => {
  socketLogger(`[${id}]del-sockek`);
  workerPool.delIdle(id);
})

socketServer.on('job-success', id => {
  socketLogger(`[${id}]job success`);
  socketLogger(`[${id}]add idle worker`);
  workerPool.addIdle(id);
})

jobQueue.on('enqueue', data => {
  queueLogger(`new job pushed:`, data);
  const nextWorker = workerPool.getNextIdle();
  if(nextWorker !== null){
    queueLogger(`new job allocated to`, nextWorker);
    const nextJob = jobQueue.dequeue();
    socketServer.unicast('run', nextWorker, nextJob)
  } else {
    queueLogger(`no idle worker!. hold....`);
  }
})

workerPool.on('add-idle', (id) => {
  workerPoolLogger(`new idle worker:`, id);
  const nextJob = jobQueue.dequeue();
  if(nextJob !== undefined){
    workerPoolLogger(`process next job`, nextJob);
    const nextWorker = workerPool.getNextIdle();
    socketServer.unicast('run', nextWorker, nextJob)
  } else {
    queueLogger(`no jobs to process. just wait!!....`);
  }
})