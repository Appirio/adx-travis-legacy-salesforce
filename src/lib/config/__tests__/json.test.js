jest.mock('fs');
const fs = require('fs');
const json = require('../json');

let EXPECTED_OBJ;
let OBJ;
let KEY;
let VALUE;

describe('Convert object to string', () => {
  it('should check if the returned value is a string', () => {
    // given
    OBJ = {
      testKey: 'testValue',
    };

    // when
    expect(typeof json.convertObjectToString(OBJ))
      // then
      .toBe('string');
  });
});

describe('Set value for a key in an object', () => {
  beforeEach(() => {
    OBJ = {};
    KEY = 'testKey';
    VALUE = 'testValue';
    EXPECTED_OBJ = Object.create(null);
  });

  it('should write a single key with its value in an empty object', () => {
    // given
    EXPECTED_OBJ[KEY] = VALUE;

    // when
    expect(json.set(OBJ, KEY, VALUE))
      // then
      .toMatchObject(EXPECTED_OBJ);
  });

  it('should write a single key with its value in NON-empty object', () => {
    // given
    OBJ.fakeKey = 'fakeValue';
    EXPECTED_OBJ = OBJ;
    EXPECTED_OBJ[KEY] = VALUE;

    // when
    expect(json.set(OBJ, KEY, VALUE))
      // then
      .toMatchObject(EXPECTED_OBJ);
  });

  it('should write a key with a hierarchy in the object', () => {
    // given
    KEY = 'testA.testB.testC';
    EXPECTED_OBJ = {
      testA: {
        testB: {
          testC: VALUE,
        },
      },
    };

    // when
    expect(json.set(OBJ, KEY, VALUE))
      // then
      .toMatchObject(EXPECTED_OBJ);
  });

  it('should return the object as it is if the key passed is undefined', () => {
    // given
    KEY = undefined;
    EXPECTED_OBJ = {};

    // when
    expect(json.set(OBJ, KEY, VALUE))
      // then
      .toMatchObject(EXPECTED_OBJ);
  });

  it('should update the value of key if it is already present in the object', () => {
    // given
    OBJ[KEY] = VALUE;
    VALUE = 'updatedValue';
    EXPECTED_OBJ[KEY] = VALUE;

    // when
    expect(json.set(OBJ, KEY, VALUE))
      // then
      .toMatchObject(EXPECTED_OBJ);
  });

  it('should delete a key', () => {
    // given
    OBJ[KEY] = VALUE;
    EXPECTED_OBJ = {};

    // when
    expect(json.remove(OBJ, KEY))
      // then
      .toMatchObject(EXPECTED_OBJ);
  });

  it('should delete a key in a hierarchy in the object', () => {
    // given
    OBJ = {
      testA: {
        testB: {
          testC: VALUE,
        },
      },
    };
    KEY = 'testA.testB.testC';
    EXPECTED_OBJ = {
      testA: {
        testB: {

        },
      },
    };
    VALUE = null;
    // when
    expect(json.remove(OBJ, KEY))
      // then
      .toMatchObject(EXPECTED_OBJ);
  });

  it('should not delete anything if the key doesn\'t exist', () => {
    // given
    OBJ[KEY] = VALUE;
    const WRONG_KEY = `_${KEY}_`;

    // when
    expect(json.remove(OBJ, WRONG_KEY))
      // then
      .toMatchObject(OBJ);
  });

  it('should not delete anything if a middle part of key doesn\'t exist in the key hierarchy', () => {
    // given
    OBJ = {
      testA: {
        testB: {
          testC: VALUE,
        },
      },
    };
    const WRONG_KEY = 'testA.testX.testC';

    // when
    expect(json.remove(OBJ, WRONG_KEY))
      // then
      .toMatchObject(OBJ);
  });

  it('should not delete anything if the last part of the key in the key hierarchy doesn\'t exist', () => {
    // given
    OBJ = {
      testA: {
        testB: {
          testC: VALUE,
        },
      },
    };
    const WRONG_KEY = 'testA.testB.testX';

    // when
    expect(json.remove(OBJ, WRONG_KEY))
      // then
      .toMatchObject(OBJ);
  });

  it('should not delete anything if a middle part of key is not an object', () => {
    // given
    KEY = 'test.arrKey.testA';
    OBJ = {
      test: {
        arrKey: 'testA',
      },
    };

    // when
    expect(json.remove(OBJ, KEY))
      // then
      .toMatchObject(OBJ);
  });

  it('should not delete anything if no key is passed in', () => {
    // given
    OBJ[KEY] = VALUE;

    // when
    expect(json.remove(OBJ))
      // then
      .toMatchObject(OBJ);
  });

  it('should throw error if object has some key which does not contain an object as a value', () => {
    // given
    KEY = 'test.arrKey.testA';
    VALUE = 'testValue';
    OBJ = {
      test: {
        arrKey: 'testA',
      },
    };

    // when
    expect(() => {
        json.set(OBJ, KEY, VALUE);
      })
      // then
      .toThrow(/when expecting it to be of type "object"!/);
  });
});

describe('Get value of key from the object', () => {
  let EXPECTED_VALUE;

  beforeAll(() => {
    OBJ = {
      testKey1: 'testValue1',
      testKey2: {
        testKey3: {
          testKey4: 'testValue4',
        },
      },
    };
  });

  it('should get the value of one-level key', () => {
    // given
    KEY = 'testKey1';
    EXPECTED_VALUE = 'testValue1';

    // when
    expect(json.get(OBJ, KEY))
      // then
      .toEqual(EXPECTED_VALUE);
  });

  it('should get the value of last key from muli-level key hierarchy', () => {
    // given
    KEY = 'testKey2.testKey3.testKey4';
    EXPECTED_VALUE = 'testValue4';

    // when
    expect(json.get(OBJ, KEY))
      // then
      .toEqual(EXPECTED_VALUE);
  });

  it('should get the value of middle key from multi-level key hierarchy', () => {
    // given
    KEY = 'testKey2.testKey3';
    EXPECTED_VALUE = {
      testKey4: 'testValue4',
    };

    // when
    expect(json.get(OBJ, KEY))
      // then
      .toEqual(EXPECTED_VALUE);
  });

  it('should error out if the key does not exist', () => {
    // given
    KEY = 'fakeKey';

    // when
    expect(() => {
        json.get(OBJ, KEY);
      })
      // then
      .toThrow(/not found!/);
  });
});

describe('Check if the key is present in the object', () => {
  let EXPECTED_VALUE;

  beforeAll(() => {
    OBJ = {
      testKey1: 'testValue1',
      testKey2: {
        testKey3: {
          testKey4: 'testValue4',
        },
      },
    };
  });

  it('should check if one-level key is present in the object', () => {
    // given
    KEY = 'testKey1';
    EXPECTED_VALUE = true;

    // when
    expect(json.has(OBJ, KEY))
      // then
      .toEqual(EXPECTED_VALUE);
  });

  it('should check if the last key from muli-level key hierarchy is present in the object', () => {
    // given
    KEY = 'testKey2.testKey3.testKey4';
    EXPECTED_VALUE = true;

    // when
    expect(json.has(OBJ, KEY))
      // then
      .toEqual(EXPECTED_VALUE);
  });

  it('should check if the middle key from multi-level key hierarchy is present in the object', () => {
    // given
    KEY = 'testKey2.testKey3';
    EXPECTED_VALUE = true;

    // when
    expect(json.has(OBJ, KEY))
      // then
      .toEqual(EXPECTED_VALUE);
  });

  it('should return false if key does not exist in the project', () => {
    // given
    KEY = 'fakeKey';
    EXPECTED_VALUE = false;

    // when
    expect(json.has(OBJ, KEY))
      // then
      .toEqual(EXPECTED_VALUE);
  });
});

describe('Load object from the specified file', () => {
  const FILE_PATH = 'demoPath';
  const JSON_OBJ_TO_WRITE = {
    testKey1: 'testValue1',
    testKey2: {
      testKey3: 'testValue2',
    },
  };

  beforeEach(() => {
    fs.__resetMockFiles();
  });

  it('should load and return object from the file', () => {
    // given
    fs.writeFileSync(FILE_PATH, JSON.stringify(JSON_OBJ_TO_WRITE));

    // when
    expect(json.load(FILE_PATH))
      // then
      .toMatchObject(JSON_OBJ_TO_WRITE);
  });

  it('should return empty object if some exception occurs while loading', () => {
    // when
    expect(json.load(FILE_PATH))
      // then
      .toMatchObject({});
  });
});
