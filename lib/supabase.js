/**
 * Supabase Client — Session & Message Management
 */

import { createClient } from '@supabase/supabase-js';

let supabase;

function getClient() {
  if (!supabase) {
    supabase = createClient(
      process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );
  }
  return supabase;
}

/**
 * Get or create a session for a phone number.
 */
export async function getOrCreateSession(phone) {
  const db = getClient();
  const { data: existing } = await db
    .from('sessions')
    .select('*')
    .eq('phone', phone)
    .single();

  if (existing) return existing;

  const { data: created, error } = await db
    .from('sessions')
    .insert({ phone, state: 'collecting', items: [] })
    .select()
    .single();

  if (error) throw new Error(`Failed to create session: ${error.message}`);
  return created;
}

/**
 * Update session state and/or items.
 */
export async function updateSession(sessionId, updates) {
  const db = getClient();
  const { error } = await db
    .from('sessions')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', sessionId);

  if (error) throw new Error(`Failed to update session: ${error.message}`);
}

/**
 * Get conversation messages for a session (ordered by creation time).
 */
export async function getMessages(sessionId, limit = 30) {
  const db = getClient();
  const { data, error } = await db
    .from('messages')
    .select('role, content')
    .eq('session_id', sessionId)
    .order('created_at', { ascending: true })
    .limit(limit);

  if (error) throw new Error(`Failed to get messages: ${error.message}`);
  return data || [];
}

/**
 * Add a message to the conversation history.
 */
export async function addMessage(sessionId, role, content) {
  const db = getClient();
  const { error } = await db
    .from('messages')
    .insert({ session_id: sessionId, role, content });

  if (error) throw new Error(`Failed to add message: ${error.message}`);
}

/**
 * Reset a session (clear items, set state back to collecting, clear messages).
 */
export async function resetSession(sessionId) {
  const db = getClient();
  await db.from('messages').delete().eq('session_id', sessionId);
  await updateSession(sessionId, { state: 'collecting', items: [] });
}
