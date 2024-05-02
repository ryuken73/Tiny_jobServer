const {
  push,
  pop,
  size,
  setIdle,
  run,
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
  const result = await doubler(jobData);
  // const result = jobData * 2;
  console.log('job done:', result)
  done(true)
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

