
const { io } = require('socket.io-client');
const debug = require('debug');
const { EventEmitter } = require('events');
const socketLogger = debug('socketClient:debug');
const socketUrl = process.env.SOCKET_SERVER_URL || 'http://localhost:6875';
const restoreIdleness = process.env.RESTORE_IDLENESS || true;

module.exports = (function() {
  const socket = io(socketUrl);
  let lastIdleness = null;
  let pushedJobIds = new Set();
  const emitter = new EventEmitter();

  socket.emit('check-in', (stat) => {
    console.log('checked in complete.', stat)
  });

  const push = (params) => {
    socket.emit('enqueue', params, (size, jobId) => {
      console.log('current jobQueue size:', size);
      pushedJobIds.add(jobId);
    })
  }

  const pop = () => {
    socket.emit('dequeue', data => console.log(data));
  } 

  const size = () => {
    socket.emit('size', size => console.log('current size:',size));
  }

  const _setIdle = (idle) => {
    socket.emit('setIdle', idle, done => {
      lastIdleness = done;
      console.log('idleness of this worker changed to', lastIdleness);
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

  socket.io.on('reconnect', () => {
    console.log('reconnected! restore idleness =',restoreIdleness)
    if(restoreIdleness){ 
      _setIdle(lastIdleness);
    }
  }) 

  socket.on('bcast', (event, jobData, result) => {
    console.log('bcast:', event, jobData, result);
    const {jobId, reqData} = jobData;
    if(pushedJobIds.has(jobId)){
      pushedJobIds.delete(jobId);
      emitter.emit('jobDone', event, result)
      // this is my job
    }
  })

  const run = (callback) => {
    socketLogger(`[${socket.id}]wait for new Job`);
    socket.on('run', (jobData) => {
      const {reqData} = jobData;
      socketLogger(`[${socket.id}]got job:`, jobData)
      const done = (success, result) => {
        if(success){
          socket.emit('success', {jobData, result});
        } else {
          socket.emit('failure', {jobData});
        }
      }
      socket.emit('running');
      callback(reqData, done);
    })
  }

  const on = (eventName, callback) => {
    emitter.on(eventName, (...data) => callback(...data));
  }

  return {
    push,
    pop,
    size,
    setIdle,
    run,
    on,
    joinPool,
    leavePool
  }
})()