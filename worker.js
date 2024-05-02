const {
  push,
  pop,
  size,
  setIdle,
  run,
  on,
  joinPool,
  leavePool
} = require('./lib/socketClient');

const {
  addCmd
} = require('./lib/useInlineCmd');

setIdle(false);

setTimeout(() => {
  setIdle(true);
}, Math.random() * 5000)

const doubler = (number) =>  {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(number * 2);
    }, Math.random()*10000)
  })
}

run(async (jobData, done) => {
  console.log('job allocated:', jobData)
  const result = await doubler(jobData);
  // const result = jobData * 2;
  done(true, result)
})

on('jobDone', (success, result) => {
  console.log(`job done: success=${success} result=`, result);
})

// define custom push to push multiple jobs
// ex) push 1 2 3 4 calls push 1, push 2 and...push 4
const customPush = params => {
  for(const param of params){
    push(param.trim());
  }
}

addCmd('push', customPush);
addCmd('size', size);
addCmd('jp', joinPool)
addCmd('lp', leavePool)

