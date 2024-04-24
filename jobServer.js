const socketServer = require('./socketServer');
const jobQueue = require('./jobQueue');
const workerPool = require('./workerPool');

const debug = require('debug');
const socketLogger = debug('socket:debug');
const queueLogger = debug('queue:debug');
const workerPoolLogger = debug('workerPool:debug');

socketServer.on('new-socket', id => {
  socketLogger(`[${id}]new-socket`);
  workerPool.addIdle(id);
})

socketServer.on('del-socket', id => {
  socketLogger(`[${id}]del-sockek`);
  workerPool.delIdle(id);
})

socketServer.on('enqueue', data => {
  socketLogger(`data enqueue:`, data);
  jobQueue.enqueue(data);
})

socketServer.on('dequeue', callback => {
  socketLogger(`data dequeue:`);
  const next = jobQueue.dequeue();
  callback(next);
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