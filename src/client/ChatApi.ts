import {
  type SocialChatMessage,
  SocialChatMessageSchema,
  type SocialConversation,
  SocialConversationSchema,
  SocialConversationsResponseSchema,
  SocialMessagesResponseSchema,
} from "../core/ApiSchemas";
import { getApiBase } from "./Api";
import { getAuthHeader } from "./Auth";

async function chatFetch(path: string, options?: RequestInit) {
  return fetch(`${getApiBase()}${path}`, {
    ...options,
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      ...options?.headers,
      Authorization: await getAuthHeader(),
    },
  });
}

export async function fetchConversations(): Promise<SocialConversation[]> {
  const response = await chatFetch("/social/conversations");
  if (!response.ok) return [];
  const parsed = SocialConversationsResponseSchema.safeParse(
    await response.json(),
  );
  return parsed.success ? parsed.data.results : [];
}

export async function openDirectConversation(
  publicId: string,
): Promise<SocialConversation | null> {
  const response = await chatFetch(
    `/social/conversations/direct/${encodeURIComponent(publicId)}`,
    { method: "POST" },
  );
  if (!response.ok) return null;
  const parsed = SocialConversationSchema.safeParse(await response.json());
  return parsed.success ? parsed.data : null;
}

export async function createGroupConversation(
  name: string,
  members: string[],
): Promise<SocialConversation | null> {
  const response = await chatFetch("/social/groups", {
    method: "POST",
    body: JSON.stringify({ name, members }),
  });
  if (!response.ok) return null;
  const parsed = SocialConversationSchema.safeParse(await response.json());
  return parsed.success ? parsed.data : null;
}

export async function fetchConversationMessages(
  conversationId: string,
): Promise<SocialChatMessage[]> {
  const response = await chatFetch(
    `/social/conversations/${encodeURIComponent(conversationId)}/messages`,
  );
  if (!response.ok) return [];
  const parsed = SocialMessagesResponseSchema.safeParse(await response.json());
  return parsed.success ? parsed.data.results : [];
}

export async function sendConversationMessage(
  conversationId: string,
  text: string,
): Promise<SocialChatMessage | null> {
  const response = await chatFetch(
    `/social/conversations/${encodeURIComponent(conversationId)}/messages`,
    { method: "POST", body: JSON.stringify({ text }) },
  );
  if (!response.ok) return null;
  const parsed = SocialChatMessageSchema.safeParse(await response.json());
  return parsed.success ? parsed.data : null;
}

export async function fetchClanMessages(
  tag: string,
): Promise<SocialChatMessage[]> {
  const response = await chatFetch(`/clans/${encodeURIComponent(tag)}/chat`);
  if (!response.ok) return [];
  const parsed = SocialMessagesResponseSchema.safeParse(await response.json());
  return parsed.success ? parsed.data.results : [];
}

export async function sendClanMessage(
  tag: string,
  text: string,
): Promise<SocialChatMessage | null> {
  const response = await chatFetch(`/clans/${encodeURIComponent(tag)}/chat`, {
    method: "POST",
    body: JSON.stringify({ text }),
  });
  if (!response.ok) return null;
  const parsed = SocialChatMessageSchema.safeParse(await response.json());
  return parsed.success ? parsed.data : null;
}
