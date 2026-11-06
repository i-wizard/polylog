import type { Conversation, ConversationRef, StoredChatMessage } from '../../domain/ai/types';
import { db } from './db';

/** A saved conversation, or undefined if it was never started. */
export async function getConversation(id: string): Promise<Conversation | undefined> {
  return db.conversations.get(id);
}

/** Adds a message to a conversation, creating the conversation on its first message. */
export async function appendMessage({
  conversation,
  message,
  now,
}: {
  conversation: ConversationRef;
  message: StoredChatMessage;
  now: Date;
}): Promise<void> {
  await db.transaction('rw', db.conversations, async () => {
    const existing = await db.conversations.get(conversation.id);
    await db.conversations.put({
      ...conversation,
      messages: [...(existing?.messages ?? []), message],
      updatedAt: now.getTime(),
    });
  });
}

/** Deletes a conversation so it starts over. */
export async function clearConversation(id: string): Promise<void> {
  await db.conversations.delete(id);
}
