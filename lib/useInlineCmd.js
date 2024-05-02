module.exports = (function(){
  const printHelp = (cmdMap) => {
    console.log(`Valid cmd: ${Object.keys(cmdMap).join(' ')}`);
  }
  const cmdMap = {
    help: printHelp
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
      if(result !== undefined){
        console.log(result)
      }
    } catch(ex) { 
      if(ex.name === 'TypeError'){
        cmdMap.help(cmdMap);		
      } else {
        console.error(ex.message);
      }
    }
  })
  const addCmd = (cmd, func) => {
    cmdMap[cmd] = func;
  }
  return {
    addCmd
  }
})()