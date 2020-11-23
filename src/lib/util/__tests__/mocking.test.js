const { Readable, Transform, Writable } = require('stream');
const mockUtils = require('../mocking');

const { MOCK_FILE_LIST } = mockUtils;

describe('genMockFromObject', () => {
  const someObject = {
    someProperty: true,
    someFunction: input => input * 2,
    someOtherFunction: input => input * 3,
    someAlreadyMockedFunction: jest.fn(input => input * 4),
  };

  it('should mock all of the functions in an object', () => {
    // given

    // when
    const mockedObject = mockUtils.genMockFromObject(someObject);

    // then
    expect(mockedObject.someFunction._isMockFunction).toBe(true);
    expect(mockedObject.someOtherFunction._isMockFunction).toBe(true);
  });
});

describe('Mock streaming', () => {
  it('Readable buffer stream - default string', () => {
    // given
    const dataHandler = (chunk) => {
      expect(chunk.toString('utf8')).toBe(MOCK_FILE_LIST);
    };

    // when
    const reader = mockUtils.getMockStreamReadableStr();
    reader.on('data', dataHandler);
    reader.read();

    // then
    expect(reader).toBeInstanceOf(Readable);
  });

  it('Readable buffer stream - custom input string', () => {
    // given
    const inputString = 'test string';
    const dataHandler = (chunk) => {
      expect(chunk.toString('utf8')).toBe(inputString);
    };

    // when
    const reader = mockUtils.getMockStreamReadableStr(inputString);
    reader.on('data', dataHandler);
    reader.read();

    // then
    expect(reader).toBeInstanceOf(Readable);
  });

  it('Readable object stream - default object', () => {
    // given
    let i = 0;
    const obj = [];
    const dataHandler = (chunk) => {
      expect(chunk).toEqual(obj[i]);
      i += 1;
    };
    MOCK_FILE_LIST.split(',').map(val => obj.push({ path: val }));

    // when
    const reader = mockUtils.getMockStreamReadableObj();
    reader.on('data', dataHandler);
    reader.read();

    // then
    expect(reader).toBeInstanceOf(Readable);
  });

  it('Readable object stream - custom input object', () => {
    // given
    const inputObj = {
      path: 'src/abc.cls',
      content: 'test content',
    };
    const dataHandler = (chunk) => {
      expect(chunk).toEqual(inputObj);
    };

    // when
    const reader = mockUtils.getMockStreamReadableObj(inputObj);
    reader.on('data', dataHandler);
    reader.read();

    // then
    expect(reader).toBeInstanceOf(Readable);
  });

  it('Writable buffer stream', () => {
    // given
    const cb = jest.fn();
    const data = 'test data';
    const finishHandler = () => {
      expect(cb).toHaveBeenCalled();
    };

    // when
    const writer = mockUtils.getMockStreamWritableStr();
    writer.write(Buffer.from(data), cb);
    writer.on('finish', finishHandler);
    writer.end();

    // then
    expect(writer).toBeInstanceOf(Writable);
  });

  it('Writable object stream', () => {
    // given
    const cb = jest.fn();
    const data = ['test', 'data'];
    const finishHandler = () => {
      expect(cb).toHaveBeenCalled();
    };

    // when
    const writer = mockUtils.getMockStreamWritableObj();
    writer.write(data, cb);
    writer.on('finish', finishHandler);
    writer.end();

    // then
    expect(writer).toBeInstanceOf(Writable);
  });

  it('Read stream error', () => {
    // given
    const errHandler = (err) => {
      expect(err).toBe('test error');
    };

    // when
    const reader = mockUtils.getMockStreamReadError('test error');
    reader.on('error', errHandler);
    reader.read();

    // then
    expect(reader).toBeInstanceOf(Readable);
  });

  it('Write stream error', () => {
    // given
    const cb = jest.fn();
    const data = 'test data';
    const errHandler = (err) => {
      expect(err).toBe('test error');
    };

    // when
    const writer = mockUtils.getMockStreamWriteError('test error');
    writer.on('error', errHandler);
    writer.write(Buffer.from(data), cb);
    writer.end();

    // then
    expect(writer).toBeInstanceOf(Writable);
  });

  it('String to Object Transform stream', () => {
    // given
    let i = 0;
    const cb = jest.fn();
    const data = 'test,data';
    const obj = [];
    const dataHandler = (chunk) => {
      expect(chunk).toEqual(obj[i]);
      i += 1;
    };
    data.split(',').map(val => obj.push({ path: val }));

    // when
    const trans = mockUtils.getMockStreamTransformStrToObj();
    trans.on('data', dataHandler);
    trans._transform(Buffer.from(data), 'utf8', cb);

    // then
    expect(trans).toBeInstanceOf(Transform);
    expect(cb).toHaveBeenCalled();
  });

  it('Object to String Transform stream', () => {
    // given
    const cb = jest.fn();
    const data = ['test'];
    const flattenedData = `${JSON.stringify(data)}\n`;
    const dataHandler = (chunk) => {
      expect(chunk.toString('utf8')).toBe(flattenedData);
    };

    // when
    const trans = mockUtils.getMockStreamTransformObjTOStr();
    trans.on('data', dataHandler);
    trans._transform(data, 'utf8', cb);

    // then
    expect(trans).toBeInstanceOf(Transform);
    expect(cb).toHaveBeenCalled();
  });

  it('Object to Object Passthrough (Transform) stream', () => {
    // given
    const cb = jest.fn();
    const data = { x: 'something' };
    const dataHandler = (chunk) => {
      expect(chunk).toEqual(data);
    };

    // when
    const trans = mockUtils.getMockStreamTransformObjToObj();
    trans.on('data', dataHandler);
    trans._transform(data, 'utf8', cb);

    // then
    expect(trans).toBeInstanceOf(Transform);
    expect(cb).toHaveBeenCalled();
  });
});
