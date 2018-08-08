import { IResolvers } from 'graphql-tools';
import { DecoderDefinition } from './dec/types';
import { EthqlPrelude } from './schema';

type CalledWithPrelude<T> = (prelude: EthqlPrelude) => T;

export interface EthqlPlugin {
  name: string;
  decoders?: CalledWithPrelude<Array<DecoderDefinition<any, any>>>;
  schema?: CalledWithPrelude<string[]>;
  resolvers?: CalledWithPrelude<IResolvers<any, any>>;
  services?: CalledWithPrelude<any>;
}
