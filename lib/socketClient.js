
const { io } = require('socket.io-client');
const debug = require('debug');
const { EventEmitter } = require('events');
const socketLogger = debug('socketClient:debug');
const { mkLogger, setLogOn } = require('./logUtil');

const init = () => {
  const parseEnvBoolean = env => {
    if(process.env[env] === undefined){
      return false;
    }
    return process.env[env] === 'true' ? true : false;
  }
  const socketUrl = process.env.SOCKET_SERVER_URL || 'http://localhost:6875';
  const restoreIdleness = parseEnvBoolean(process.env.RESTORE_IDLENESS);
  console.log(`[INIT]socketUrl [env SOCKET_SERVER_URL] = ${socketUrl}`);
  console.log(`[INIT]restoreIdleness [env RESTORE_IDLENESS] = ${restoreIdleness}`);
  return {
    socketUrl,
    restoreIdleness
  }
}

module.exports = (function() {
  const {
    socketUrl,
    restoreIdleness
  } = init();

  const socket = io(socketUrl);
  let lastIdleness = null;
  let pushedJobIds = new Set();
  let logger = console.log;
  const emitter = new EventEmitter();

  socket.emit('check-in', (stat) => {
    logger('checked in complete.', stat)
  });

  const push = (params) => {
    socket.emit('enqueue', params, (size, jobId) => {
      logger('current pending jobs:', size);
      pushedJobIds.add(jobId);
    })
  }

  const pop = () => {
    socket.emit('dequeue', data => logger(data));
  } 

  const size = () => {
    socket.emit('size', size => logger('current jobQueue size:',size));
  }

  const _setIdle = (idle) => {
    socket.emit('setIdle', idle, done => {
      lastIdleness = done;
      logger('idleness of this worker changed to', lastIdleness);
    }) 
  }

  const setIdle = (isIdle) => {
    const trimed = Array.isArray(isIdle) ? isIdle[0].trim() : JSON.parse(isIdle);
    _setIdle(trimed);
  }

  const joinPool = () => {
    _setIdle(true);
  }

  const leavePool = () => {
    _setIdle(false)
  }

  const log = (status) => {
    const enabled = status.shift().trim() === 'on';
    setLogOn(enabled);
  }

  socket.on('connect', () => {
    logger = mkLogger(socket.id)
  })

  socket.io.on('reconnect', () => {
    logger = mkLogger(socket.id)
    logger('reconnected! restore idleness =',restoreIdleness)
    if(restoreIdleness){ 
      _setIdle(lastIdleness);
    }
  }) 

  const jobDoneEvents = ['success-notice', 'failure-notice'];
  const isEventType = (events, event) => events.some(ele => ele === event);

  socket.on('bcast', (event, jobData, result) => {
    logger('event:', event, jobData, result);
    if(isEventType(jobDoneEvents, event)){
      const {jobId, reqData, doneBy} = jobData;
      const success = event === 'success-notice';
      if(pushedJobIds.has(jobId)){
        pushedJobIds.delete(jobId);
        emitter.emit('jobDone', success, reqData, doneBy, result)
      }
    }
  })

  const run = (callback) => {
    logger(`wait for new Job`);
    socket.on('run', (jobData) => {
      const {reqData} = jobData;
      logger(`got job:`, jobData)
      const done = (success, result) => {
        const jobDataWithDoneBy = {
          ...jobData,
          doneBy: socket.id
        }
        if(success){
          socket.emit('success', {jobData: jobDataWithDoneBy, result});
        } else {
          socket.emit('failure', {jobData: jobDataWithDoneBy});
        }
      }
      socket.emit('running');
      callback(reqData, done);
    })
  }

  const on = (eventName, callback) => {
    emitter.on(eventName, (...data) => {callback(...data)});
  }

  return {
    push,
    pop,
    size,
    setIdle,
    run,
    on,
    joinPool,
    leavePool,
    log
  }
})()