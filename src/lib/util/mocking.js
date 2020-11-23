const { Readable, Transform, Writable } = require('stream');

const MOCK_FILE_LIST = 'abc.cls,xyz.page,destructiveChanges.xml';

// This generic function can be reused to generate other mocks, it's comparable
// to genMockFromModule
const genMockFromObject = originalObject => Object.keys(originalObject)
  .reduce((inputMockedObject, key) => {
    const mockedObject = inputMockedObject;
    if ((typeof originalObject[key] === 'function')
      && (originalObject[key]._isMockFunction !== true)) {
      mockedObject[key] = jest.fn();
    } else {
      mockedObject[key] = originalObject[key];
    }
    return mockedObject;
  }, {});

const getMockStreamReadableStr = (inputString) => {
  const inputStream = new Readable({
    read() {
      // console.log('>>>>>> Inside mocked stream read str method <<<<<<<');
      if (inputString) {
        this.push(inputString);
      } else {
        this.push(MOCK_FILE_LIST);
      }
      this.push(null);
    },
  });
  return inputStream;
};

const getMockStreamReadableObj = (inputObj) => {
  const inputStream = new Readable({
    objectMode: true,
    read() {
      // console.log('>>>>>> Inside mocked stream read obj method <<<<<<<');
      if (inputObj) {
        this.push(inputObj);
      } else {
        const arr = MOCK_FILE_LIST.split(',');
        for (let i = 0; i < arr.length; i += 1) {
          const obj = {
            path: arr[i],
          };
          this.push(obj);
        }
      }
      this.push(null);
    },
  });
  return inputStream;
};

const getMockStreamTransformStrToObj = () => {
  const outputStream = new Transform({
    readableObjectMode: true,
    transform(chunk, encoding, callback) {
      // console.log('>>>>>> Inside mocked stream transform string to obj method <<<<<<<');
      const arr = chunk.toString().trim().split(',');
      for (let i = 0; i < arr.length; i += 1) {
        const obj = {
          path: arr[i],
        };
        this.push(obj);
      }
      callback();
    },
  });
  return outputStream;
};

const getMockStreamTransformObjTOStr = () => {
  const outputStream = new Transform({
    writableObjectMode: true,
    transform(chunk, encoding, callback) {
      // console.log('>>>>>> Inside mocked stream transform obj to string method <<<<<<<');
      this.push(`${JSON.stringify(chunk)}\n`);
      callback();
    },
  });
  return outputStream;
};

const getMockStreamTransformObjToObj = () => {
  const outputStream = new Transform({
    readableObjectMode: true,
    writableObjectMode: true,
    transform(chunk, encoding, callback) {
      // console.log('>>>>>> Inside mocked stream transform obj to obj method <<<<<<<');
      this.push(chunk);
      callback();
    },
  });
  return outputStream;
};

const getMockStreamWritableStr = () => {
  const writableStream = new Writable({
    write(chunk, encoding, callback) {
      // console.log('>>>>>> Inside mocked stream write str method <<<<<<<');
      callback();
    },
  });
  return writableStream;
};

const getMockStreamWritableObj = () => {
  const writableStream = new Writable({
    objectMode: true,
    write(chunk, encoding, callback) {
      // console.log('>>>>>> Inside mocked stream write str method <<<<<<<');
      callback();
    },
  });
  return writableStream;
};

const getMockStreamReadError = (err) => {
  const writableStream = new Readable({
    read() {
      // console.log('>>>>>> Inside mocked stream read error method <<<<<<<');
      // Generate error
      this.emit('error', err);
    },
  });
  return writableStream;
};

const getMockStreamWriteError = (err) => {
  const writableStream = new Writable({
    objectMode: true,
    write(chunk, encoding, callback) {
      // console.log('>>>>>> Inside mocked stream write error method <<<<<<<');
      // Generate error
      this.emit('error', err);
      callback(err);
    },
  });
  return writableStream;
};

module.exports = {
  genMockFromObject,
  getMockStreamReadError,
  getMockStreamReadableStr,
  getMockStreamReadableObj,
  getMockStreamTransformStrToObj,
  getMockStreamTransformObjToObj,
  getMockStreamTransformObjTOStr,
  getMockStreamWritableStr,
  getMockStreamWritableObj,
  getMockStreamWriteError,
  MOCK_FILE_LIST,
};
