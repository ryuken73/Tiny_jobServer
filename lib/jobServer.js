const socketServer = require('./socketServer');
const jobQueue = require('./jobQueue');
const workerPool = require('./workerPool');
const {addCmd} = require('./useInlineCmd');

const debug = require('debug');
const socketLogger = debug('socket:debug');
const queueLogger = debug('queue:debug');
const workerPoolLogger = debug('workerPool:debug');

const init = () => {
  const logger = console;
  const parseEnvBoolean = env => {
    if(process.env[env] === undefined){
      return false;
    }
    return process.env[env] === 'true' ? true : false;
  }
  const fetchLastDone = parseEnvBoolean('FETCH_LAST_DONE_WORKER_AS_NEXT');
  const autoStatusCheck = parseEnvBoolean('AUTO_STATUS_CHECK');
  const setIdleAuto = parseEnvBoolean('SET_IDLE_AUTO');
  const parsedPort = parseInt(process.env.PORT);
  const socketPort = isNaN(parsedPort) ? 6875 : parsedPort;
  
  console.log(`[INIT]fetchLastDone [env FETCH_LAST_DONE_WORKER_AS_NEXT] = ${fetchLastDone}`)
  console.log(`[INIT]autoStatusCheck [env AUTO_STATUS_CHECK] = ${autoStatusCheck}`);
  console.log(`[INIT]setIdleAuto [env SET_IDLE_AUTO] = ${setIdleAuto}`);
  console.log(`[INIT]Sockeet Server Port [env PORT] = ${socketPort}`);

  return {logger,socketPort, fetchLastDone, setIdleAuto, autoStatusCheck};
}

module.exports = (function(){
  const {
    logger, 
    socketPort, 
    fetchLastDone, 
    setIdleAuto, 
    autoStatusCheck
  } = init();

  socketServer.listen(socketPort);
  socketServer.on('new-socket', id => {
    logger.info('new socket connected!')
    socketLogger(`[${id}]new-socket`);
    if(setIdleAuto){
      workerPool.addIdle(id);
    }
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
    const nextWorker = workerPool.getNextIdle(fetchLastDone);
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
      const nextWorker = workerPool.getNextIdle(fetchLastDone);
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

  // define default console util functions and cmd

  const printStatus = () => {
    const idleList = workerPool.getIdleList();
    const runningList = workerPool.getRunningList();
    const pendingJobs = jobQueue.size();
    return `[STAT]Idle Workers = ${idleList.length}, Running Workers = ${runningList.length}, Pending Jobs = ${pendingJobs}`
  }
  addCmd('status', printStatus);
  addCmd('st', 'status');

  addCmd('show-idle', () => {
    const idleList = workerPool.getIdleList();
    const withTcpInfo = idleList.map(idle => `${idle}, ${socketServer.getSocketInfo(idle)}`);
    return idleList.length === 0 ? [] : withTcpInfo
  })
  addCmd('si', 'show-idle');

  addCmd('show-run', () => {
    const runningList = workerPool.getRunningList();
    const withTcpInfo = runningList.map(running => `${running}, ${socketServer.getSocketInfo(running)}`);
    return runningList.length === 0 ? [] : withTcpInfo
  })
  addCmd('sr', 'show-run');
  ////

  if(autoStatusCheck === true){
    setInterval(() => {
      console.log(printStatus());
    }, 1000)
  }

  const useObj = (func) => {
    return (...args) => {
      return func({workerPool, socketServer, jobQueue}, ...args);
    }
  }

  const addCmdHoF = (key, func) => {
    const funcWithObj = useObj(func);
    addCmd(key, funcWithObj);
  }

  return {
    addCmd: addCmdHoF    
  }
})()

////