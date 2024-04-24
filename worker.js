const {
  push,
  pop,
  size,
  run
} = require('./socketClient');

const doubler = (number) =>  {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(number * 2);
    }, Math.random()*10000)
  })
}

run( async (jobData, done) => {
  await doubler(jobData);
  done(success)
})

const printHelp = (cmdMap) => {
  console.log("Valid cmd: %s", Object.keys(cmdMap).join(' '));
}

const cmdMap = {
  push,
  pop,
  help: printHelp,
  size
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