export function resolveWebsocketUrl(apiUrl: string, websocketUrl?: string): string {
  if (websocketUrl) {
    return websocketUrl;
  }

  const secure = apiUrl.startsWith('https');
  const protocol = secure ? 'wss' : 'ws';
  const stripped = apiUrl.replace(/^https?:\/\//, '');
  return `${protocol}://${stripped}/graphql`;
}

export function isBrowserEnvironment(): boolean {
  return typeof window !== 'undefined';
}
