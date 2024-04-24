const {
  push,
  pop,
  size,
  setIdle,
  run
} = require('./lib/socketClient');

setIdle(['false']);

setTimeout(() => {
  setIdle(['true']);
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

const printHelp = (cmdMap) => {
  console.log("Valid cmd: %s", Object.keys(cmdMap).join(' '));
}

const customPush = params => {
  for(const param of params){
    push(param.trim());
  }
}

const cmdMap = {
  push: customPush,
  pop,
  help: printHelp,
  size,
  setIdle
}

process.stdin.resume();
process.stdin.setEncoding('utf-8');
process.stdin.on('data',function(data){ 
  const paramsArray = data.split(' ')
  const [cmd, ...params] = paramsArray;
  try {
    // const result = cmdMap[cmd.trim()](params);
    value = cmdMap[cmd.trim()];
    const key = typeof(value) === 'string' ? value : cmd.trim();
    const result = cmdMap[key](params);
  } catch(ex) { 
    // console.log(ex);
    cmdMap.help(cmdMap);		
  }
})