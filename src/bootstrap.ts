import { alg, Graph } from 'graphlib';
import { GraphQLSchema } from 'graphql';
import { IResolvers, mergeSchemas } from 'graphql-tools';
import * as _ from 'lodash';
import config, { Options } from './config';
import { EthqlPlugin } from './plugin';
import { EthqlServerOpts } from './server';
import { EthqlServiceDefinitions, EthqlServiceFactories } from './services';

export type EthqlPrelude = {
  config: Options;
  schemas: string[];
  resolvers: IResolvers[];
  serviceDefinitions: Partial<EthqlServiceDefinitions>;
};

export type EthqlBootstrapResult = {
  config: Options;
  schema: GraphQLSchema;
  serviceDefinitions: EthqlServiceDefinitions;
  serviceFactories: EthqlServiceFactories;
};

export function bootstrap(opts: EthqlServerOpts): EthqlBootstrapResult {
  let plugins = opts.plugins.map(pf => pf(opts));

  if (plugins === null || !plugins.length) {
    throw new Error(
      "Cannot start EthQL with no plugins; this is likely an internal error as at least the 'core' plugin should be present.",
    );
  }

  if (!_.find(plugins, { name: 'core' })) {
    throw new Error("'core' plugin is required.");
  }

  plugins = _.sortBy(plugins, 'priority');
  const graph = new Graph({ directed: true, multigraph: false, compound: false });

  for (let plugin of plugins) {
    let {
      name,
      order: { after, before },
    } = _.defaultsDeep({ order: { after: [], before: [] } }, plugin);

    graph.setNode(name, plugin);

    if (name !== 'core' && ![...after, ...before].includes('core')) {
      after.push('core');
    }

    before.forEach(b => graph.setEdge(name, b));
    after.forEach(a => graph.setEdge(a, name));
  }

  const orderedPlugins = () => alg.topsort(graph).map(node => graph.node(node) as EthqlPlugin);

  const sources = graph.sources();
  if (sources.length === 0 || !alg.isAcyclic(graph)) {
    throw new Error('Plugin graph contains no root, or contains cycles.');
  } else if (sources.length > 1) {
    throw new Error(`Expected plugin graph to be a tree, but there are ${sources.length} roots.`);
  }

  let prelude: EthqlPrelude = { config, schemas: [], resolvers: [], serviceDefinitions: {} };

  prelude = orderedPlugins()
    .map(({ schema, resolvers, serviceDefinitions }) => ({ schema, resolvers, serviceDefinitions }))
    .reduce((prev, curr) => _.merge(curr, prev), prelude);

  const serviceImpls = Object.keys(prelude.serviceDefinitions)
    .filter(key => prelude.serviceDefinitions[key].implementation)
    .map(name => name);

  const missingServices = plugins
    .filter(plugin => plugin.dependsOn && plugin.dependsOn.services)
    .map(plugin => ({ name: plugin.name, missing: plugin.dependsOn.services.filter(s => !serviceImpls.includes(s)) }))
    .filter(scan => scan.missing);

  if (missingServices.length) {
    throw new Error(
      `Missing services: ${missingServices.map(({ name, missing }) => `${missing}, required by: ${name}`).join(';')}`,
    );
  }

  const { schemas, resolvers, serviceDefinitions } = prelude;

  console.log(JSON.stringify(prelude));

  const serviceFactories = {};
  for (let [name, { config: serviceConfig, implementation }] of Object.entries(
    serviceDefinitions as EthqlServiceDefinitions,
  )) {
    if (implementation) {
      serviceFactories[name] = implementation.factory
        ? implementation.factory(serviceConfig)
        : implementation.singleton(serviceConfig);
    }
  }

  const result: EthqlBootstrapResult = {
    schema: mergeSchemas({
      schemas,
      resolvers,
      inheritResolversFromInterfaces: true,
    }),
    config,
    serviceDefinitions: serviceDefinitions as EthqlServiceDefinitions,
    serviceFactories: serviceFactories as EthqlServiceFactories,
  };

  orderedPlugins().forEach(({ init }) => init && init(result));

  return result;
}
