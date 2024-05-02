const logUtil = (function(){
  let logEnabled = true;
  const mkLogger = (customHeader) => {
    const options = {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: 'numeric',
      hour12: false,
      minute: '2-digit',
      second: '2-digit',
      fractionalSecondDigits: 3
    }
    return (...msg) => {
      const formatedTimestamp = (new Date()).toLocaleString('en-US', options);
      const header = customHeader === undefined 
        ? `[${formatedTimestamp}]`
        :`[${formatedTimestamp}][${customHeader}]`;

      logEnabled ?
      console.log(`${header}`, ...msg) :
      null
    }
  }
  const setLogOn = (on) => {
    if(on){
      console.log('set logging on. (use "log off" to turn off logging)')
      logEnabled = true;
      return
    } 
    console.log('set logging off. (use "log on" to turn on logging)')
    logEnabled = false;
  }
  return {
    mkLogger,
    setLogOn
  }
})()

module.exports = logUtil;