
const { EventEmitter } = require('events');

const workerPool = (function(){
  const emitter = new EventEmitter();
  const idleList = new Set();
  const addIdle = id => {
    idleList.add(id)
    emitter.emit('add-idle', id);
  }
  const delIdle = id => {
    idleList.delete(id);
    emitter.emit('del-idle', id);
    if(idleList.size === 0){
      emitter.emit('worker-exhausted')
    }
  }
  const getNextIdle = (lastDoneAsNext) => {
    if(idleList.size === 0){
      return null;
    }
    const next = lastDoneAsNext ? Array.from(idleList)[idleList.size - 1]:Array.from(idleList)[0];
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


module.exports = workerPool;