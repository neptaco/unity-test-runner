import * as Index from '.';

describe('Index', () => {
  test.each(['Action', 'Docker', 'ImageTag', 'Input', 'Output', 'ResultsCheck'])(
    'exports %s',
    exportedModule => {
      expect(typeof Index[exportedModule]).toStrictEqual('function');
    },
  );
});
