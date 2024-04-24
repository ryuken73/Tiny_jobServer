
const { io } = require('socket.io-client');

module.exports = (function() {
  const socket = io('http://localhost:6875');

  socket.emit('check-in', (stat) => {
    console.log('checked in complete.', stat)
  });


  const push = (params) => {
    socket.emit('enqueue', {data: params}, (size) => {
      console.log('current job size:', size)
    })
  }

  const pop = () => {
    socket.emit('dequeue', data => console.log(data));
  }

  const size = () => {
    socket.emit('size', size => console.log('current size:',size));
  }

  const run = (callback) => {
    socket.on('job', (jobData) => {
      const done = (success) => {
        if(success){
          socket.emit('done', jobData);
        } else {
          socket.emit('fail', jobData);
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
    run
  }
})()