
const { io } = require('socket.io-client');
const debug = require('debug');
const socketLogger = debug('socketClient:debug');
const socketUrl = process.env.SOCKET_SERVER_URL || 'http://localhost:6875';

module.exports = (function() {
  const socket = io(socketUrl);

  socket.emit('check-in', (stat) => {
    console.log('checked in complete.', stat)
  });

  const push = (params) => {
    socket.emit('enqueue', params, (size) => {
      console.log('current job size:', size)
    })
  }

  const pop = () => {
    socket.emit('dequeue', data => console.log(data));
  }

  const size = () => {
    socket.emit('size', size => console.log('current size:',size));
  }

  const setIdle = (isIdle) => {
    const trimed = Array.isArray(isIdle) ? isIdle[0].trim() : JSON.parse(isIdle);
    socket.emit('setIdle', trimed, done => {
      console.log('idleness of this worker changed to', done);
    })
  }

  const joinPool = () => {
    socket.emit('setIdle', true, done => {
      console.log('idleness of this worker changed to', done);
    })
  }

  const leavePool = () => {
    socket.emit('setIdle', false, done => {
      console.log('idleness of this worker changed to', done);
    })
  }

  socket.on('bcast', data => {
    console.log('bcast:', data)
  })

  const run = (callback) => {
    socketLogger(`[${socket.id}]wait for new Job`);
    socket.on('run', (jobData) => {
      socketLogger(`[${socket.id}]got job:`, jobData)
      const done = (success) => {
        if(success){
          socket.emit('success', jobData);
        } else {
          socket.emit('failure', jobData);
        }
      }
      socket.emit('running');
      callback(jobData, done);
    })
  }

  return {
    push,
    pop,
    size,
    setIdle,
    run,
    joinPool,
    leavePool
  }
})()