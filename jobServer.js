const socketServer = require('./lib/socketServer');
const jobQueue = require('./lib/jobQueue');
const workerPool = require('./lib/workerPool');
const {addCmd} = require('./lib/useInlineCmd');

const debug = require('debug');
const socketLogger = debug('socket:debug');
const queueLogger = debug('queue:debug');
const workerPoolLogger = debug('workerPool:debug');

const FETCH_LAST_DONE_WORKER_AS_NEXT = true;
const AUTO_STATUS_CHECK = true;
const logger = console;

socketServer.on('new-socket', id => {
  logger.info('new socket connected!')
  socketLogger(`[${id}]new-socket`);
  workerPool.addIdle(id);
})

socketServer.on('del-socket', id => {
  logger.info('socket disconnected!')
  socketLogger(`[${id}]del-sockek`);
  workerPool.delAll(id);
})

socketServer.on('enqueue', data => {
  logger.info(`job pushed: ${data}`)
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

socketServer.on('job-success', (id, jobData) => {
  logger.info(`job success: ${jobData}`)
  socketLogger(`[${id}]job success`);
  socketLogger(`[${id}]add idle worker`);
  workerPool.addIdle(id);
  socketServer.broadcast('success notification')
})

socketServer.on('job-failure', (id, jobData) => {
  logger.info(`job failed: ${jobData}`)
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
    workerPool.delAll(id);
    callback(false)
  }
})

jobQueue.on('enqueue', data => {
  queueLogger(`new job pushed:`, data);
  const nextWorker = workerPool.getNextIdle(FETCH_LAST_DONE_WORKER_AS_NEXT);
  if(nextWorker !== null){
    logger.info(`job allocated: ${data}`)
    queueLogger(`new job allocated to`, nextWorker);
    const nextJob = jobQueue.dequeue();
    socketServer.unicast('run', nextWorker, nextJob)
  } else {
    logger.info('job pending(no idle worker)')
    queueLogger(`no idle worker!. hold....`);
  }
})

workerPool.on('add-idle', (id) => {
  workerPoolLogger(`new idle worker:`, id);
  const nextJob = jobQueue.dequeue();
  if(nextJob !== undefined){
    logger.info(`job allocated: ${nextJob}`)
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

const printStatus = () => {
  const idleList = workerPool.getIdleList();
  const runningList = workerPool.getRunningList();
  const pendingJobs = jobQueue.size();
  return `Idle Workers = ${idleList.length}, Running Workers = ${runningList.length}, Pendings = ${pendingJobs}`
}

////
addCmd('status', printStatus);
addCmd('st', 'status');
addCmd('show-idle', () => {
  const idleList = workerPool.getIdleList();
  return idleList.length === 0 ? 'none' : idleList
})
addCmd('si', 'show-idle');
addCmd('show-run', () => {
  const runningList = workerPool.getRunningList();
  return runningList.length === 0 ? 'none' : runningList
})
addCmd('sr', 'show-run');
////

if(AUTO_STATUS_CHECK){
  setInterval(() => {
    console.log(printStatus());
  }, 1000)
}