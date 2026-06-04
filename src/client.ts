import { createClient, type PolkadotClient } from 'polkadot-api';
import { getWsProvider } from 'polkadot-api/ws';
import type { RequestFn, SubscribeFn } from '@novasamatech/sdk-statement';

/**
 * A connection to a single RPC endpoint, exposing the request/subscribe
 * functions the statement SDK expects. Mirrors the `LazyClient` pattern from
 * `@novasamatech/statement-store`.
 */
export type StatementClient = {
  endpoint: string;
  request: RequestFn;
  subscribe: SubscribeFn;
  disconnect: () => void;
};

export function connect(endpoint: string): StatementClient {
  const provider = getWsProvider(endpoint);
  const client: PolkadotClient = createClient(provider);

  const request: RequestFn = (method, params) => client._request(method, params);

  const subscribe: SubscribeFn = (method, params, onMessage, onError) => {
    // Derive the unsubscribe method from the subscribe method name, e.g.
    // statement_subscribeStatement -> statement_unsubscribeStatement.
    const unsubscribeMethod = method.replace('subscribe', 'unsubscribe');
    const sub = client._subscribe(method, unsubscribeMethod, params).subscribe({
      next: onMessage,
      error: onError,
    });
    return () => sub.unsubscribe();
  };

  return {
    endpoint,
    request,
    subscribe,
    disconnect: () => client.destroy(),
  };
}
