import { IResolvers } from 'graphql-tools';
import { EthqlBootstrapResult } from './bootstrap';
import { EthqlServerOpts } from './server';
import { EthqlServiceDefinitions, EthqlServices } from './services';

export interface EthqlPlugin {
  name: string;
  priority: number;
  schema?: string[];
  resolvers?: IResolvers<any, any>;
  serviceDefinitions?: Partial<EthqlServiceDefinitions>;
  dependsOn?: {
    services?: Array<keyof EthqlServices>;
  };
  order?: {
    before?: string[];
    after?: string[];
  };
  init?: (result: EthqlBootstrapResult) => void;
}

export type EthqlPluginFactory = (opts: EthqlServerOpts) => EthqlPlugin;
