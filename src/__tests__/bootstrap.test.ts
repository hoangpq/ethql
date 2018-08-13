import { bootstrap } from '../bootstrap';
import core from '../core';
import erc20 from '../erc20';
import { EthqlPlugin, EthqlPluginFactory } from '../plugin';
import { EthqlServiceDefinition } from '../services';

declare module '../services' {
  interface EthqlServiceDefinitions {
    testService: EthqlServiceDefinition<string[], {}>;
  }
}
test.skip('bootstrap: error when core plugin not loaded', () => {
  const plugin1: EthqlPluginFactory = () => ({
    name: 'plugin1',
    priority: 0,
  });

  expect(() =>
    bootstrap({
      config: {},
      plugins: [plugin1],
    }),
  ).toThrow("'core' plugin is required");
});

test.skip('bootstrap: error when required service not present', () => {
  const plugin1: EthqlPluginFactory = () => ({
    name: 'plugin1',
    priority: 10,
  });

  const plugin2: EthqlPluginFactory = () => ({
    name: 'core',
    priority: 10,
    dependsOn: {
      services: ['decoder'],
    },
  });

  expect(() =>
    bootstrap({
      config: {},
      plugins: [plugin1, plugin2],
    }),
  ).toThrow('Missing services: decoder');
});

test.skip('bootstrap: services reorganised and init in right order (after)', () => {
  const order = [];

  const core: EthqlPluginFactory = () => ({
    name: 'core',
    priority: 10,
    init: () => order.push('core'),
  });

  const plugin1: EthqlPluginFactory = () => ({
    name: 'plugin1',
    priority: 10,
    init: () => order.push('plugin1'),
  });

  const plugin2: EthqlPluginFactory = () => ({
    name: 'plugin2',
    priority: 10,
    order: {
      after: ['plugin1'],
    },
    init: () => order.push('plugin2'),
  });

  bootstrap({
    config: {},
    plugins: [plugin2, core, plugin1],
  });

  expect(order).toEqual(['core', 'plugin1', 'plugin2']);
});

test.skip('bootstrap: services reorganised and init in right order (before)', () => {
  const order = [];

  const core: EthqlPluginFactory = () => ({
    name: 'core',
    priority: 10,
    init: () => order.push('core'),
  });

  const plugin1: EthqlPluginFactory = () => ({
    name: 'plugin1',
    priority: 10,
    init: () => order.push('plugin1'),
  });

  const plugin2: EthqlPluginFactory = () => ({
    name: 'plugin2',
    priority: 10,
    order: {
      before: ['plugin1'],
    },
    init: () => order.push('plugin2'),
  });

  bootstrap({
    config: {},
    plugins: [plugin2, core, plugin1],
  });

  expect(order).toEqual(['core', 'plugin2', 'plugin1']);
});

test.skip('bootstrap: services reorganised by priority', () => {
  const order = [];

  const core: EthqlPluginFactory = () => ({
    name: 'core',
    priority: 10,
    init: () => order.push('core'),
  });

  const plugin1: EthqlPluginFactory = () => ({
    name: 'plugin1',
    priority: 11,
    init: () => order.push('plugin1'),
  });

  const plugin2: EthqlPluginFactory = () => ({
    name: 'plugin2',
    priority: 12,
    init: () => order.push('plugin2'),
  });

  bootstrap({
    config: {},
    plugins: [plugin2, plugin1, core],
  });

  expect(order).toEqual(['core', 'plugin1', 'plugin2']);
});

test('bootstrap: service configuration merged', () => {
  let config: {};

  const core: EthqlPluginFactory = () => ({
    name: 'core',
    priority: 10,
    serviceDefinitions: {
      testService: {
        config: ['value1'],
        implementation: {
          singleton: c => (config = c),
        },
      },
    },
  });

  const plugin1: EthqlPluginFactory = () => ({
    name: 'plugin1',
    priority: 11,
    serviceDefinitions: {
      web3: {
        config: ['value2'],
      },
    },
  });

  bootstrap({
    config: {},
    plugins: [core, plugin1],
  });

  expect(config).toEqual(['value1', 'value2']);
});
