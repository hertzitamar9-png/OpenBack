export interface SocialRealtimeEvent {
  recipients: string[];
  type: "friends_changed" | "chat_message" | "blocks_changed";
  [key: string]: unknown;
}

type Listener = (event: SocialRealtimeEvent) => void;
const listeners = new Set<Listener>();

export function publishSocialEvent(event: SocialRealtimeEvent): void {
  for (const listener of listeners) listener(event);
}

export function subscribeSocialEvents(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
