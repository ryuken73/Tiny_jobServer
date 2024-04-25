const socketServer = require('./lib/socketServer');
const jobQueue = require('./lib/jobQueue');
const workerPool = require('./lib/workerPool');
const {addCmd} = require('./lib/useInlineCmd');

const debug = require('debug');
const socketLogger = debug('socket:debug');
const queueLogger = debug('queue:debug');
const workerPoolLogger = debug('workerPool:debug');

const FETCH_LAST_DONE_WORKER_AS_NEXT = true;

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

socketServer.on('size', callback => {
  socketLogger(`current jobQueue size =`, jobQueue.size());
  callback(jobQueue.size());
})

socketServer.on('job-success', id => {
  socketLogger(`[${id}]job success`);
  socketLogger(`[${id}]add idle worker`);
  workerPool.addIdle(id);
  socketServer.broadcast('success notification')
})

socketServer.on('job-failure', id => {
  socketLogger(`[${id}]job failed`);
  socketLogger(`[${id}]add idle worker`);
  workerPool.addIdle(id);
  socketServer.broadcast('failure notification')
})

socketServer.on('set-worker-idle', (id, isIdle, callback) => {
  // console.log(id, isIdle, typeof(callback))
  if(isIdle){
    workerPool.addIdle(id);
    callback(true)
  } else {
    workerPool.delIdle(id);
    callback(false)
  }
})

jobQueue.on('enqueue', data => {
  queueLogger(`new job pushed:`, data);
  const nextWorker = workerPool.getNextIdle(FETCH_LAST_DONE_WORKER_AS_NEXT);
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
    const nextWorker = workerPool.getNextIdle(FETCH_LAST_DONE_WORKER_AS_NEXT);
    socketServer.unicast('run', nextWorker, nextJob)
  } else {
    queueLogger(`no jobs to process. just wait!!....`);
  }
})

workerPool.on('del-idle', (id) => {
  workerPoolLogger(`del idle worker:`, id);
})

workerPool.on('worker-exhausted', () => {
  workerPoolLogger("worker exhausted!");
})

////
addCmd('stat', () => {
  const idleList = workerPool.getIdleList();
  const runningList = workerPool.getRunningList();
  return `Idle Workers = ${idleList.length}, Running Workers = ${runningList.length}`
})
addCmd('showrun', () => {
  const idleList = workerPool.getIdleList();
  return idleList
  console.log(idleList)
})
addCmd('st', 'stat');
addCmd('sr', 'showrun');
////