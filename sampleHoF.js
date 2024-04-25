
const state = 'myState'

const useState = (func) => {
  return (...args)  => {
    return func(state, ...args)
  }
}

const hellow = (state, key) => {
  console.log(`state:${state}, key:${key}`)
}

const withState = useState(hellow)
withState('ryuken');

////////////////////////////////////////////
cmdMap = {};
serverObj = 'myObj';

const addCmd = (cmd, func) => {
  cmdMap[cmd] = func;
}

const useObj = (func) => {
  return (...args) => {
    return func(serverObj, ...args)
  }
}

const addCmdWithServerObj = (cmd, func) => {
  const funcWithObj = useObj(func)
  addCmd(cmd, funcWithObj);
}

addCmd('hellow', () => { console.log('hellow')})
addCmdWithServerObj('hellowWithObj', (obj) => {
  console.log('with objs:', obj);
})

cmdMap['hellow']()
cmdMap['hellowWithObj']()


