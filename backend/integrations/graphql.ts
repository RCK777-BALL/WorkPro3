import IntegrationHook from '../models/IntegrationHook';
import { registerHook } from '../services/integrationHub';

export const schema = `
  type IntegrationHook { id: ID! name: String! type: String! url: String events: [String!]! }
  type Query { integrationHooks: [IntegrationHook!]! }
  input HookInput { name: String! type: String! url: String events: [String!]! }
  type Mutation { registerHook(input: HookInput!): IntegrationHook! }
`;

export async function execute(query: string, variables?: any) {
  if (query.includes('integrationHooks')) {
    const hooks = await IntegrationHook.find();
    return { data: { integrationHooks: hooks } };
  }
  if (query.includes('registerHook')) {
    const hook = await registerHook(variables.input);
    return { data: { registerHook: hook } };
  }
  return { errors: ['Unknown query'] };
}
