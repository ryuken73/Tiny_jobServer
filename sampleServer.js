const {addCmd} = require('./lib/jobServer')

addCmd('showIdle', (serverObj) => {
  const {workerPool, socketServer, jobQueue} = serverObj;
  const idleList = workerPool.getIdleList();
  const runningList = workerPool.getRunningList();
  const pendingJobs = jobQueue.size();
  return `Idle Workers = ${idleList.length}, Running Workers = ${runningList.length}, Pendings = ${pendingJobs}`
})

