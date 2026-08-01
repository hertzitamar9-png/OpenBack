const connections = new Map<string, number>();

export function setPlayerConnected(publicId: string, connected: boolean): void {
  const next = Math.max(
    0,
    (connections.get(publicId) ?? 0) + (connected ? 1 : -1),
  );
  if (next === 0) connections.delete(publicId);
  else connections.set(publicId, next);
}

export function isPlayerOnline(publicId: string): boolean {
  return (connections.get(publicId) ?? 0) > 0;
}
