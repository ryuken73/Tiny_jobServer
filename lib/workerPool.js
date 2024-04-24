
const { EventEmitter } = require('events');

const emitEvent = (emitter, eventName, value, socket=null) => {
  // const emitData = {eventName, data: value};
  const emitData = value;
  emitter.emit(eventName, emitData);
  socket !== null && socket.emit(eventName, emitData);
}

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


module.exports = workerPool;