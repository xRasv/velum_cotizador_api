/**
 * WhatsApp Cloud API Helper
 * Handles sending messages and downloading media via Meta's Graph API.
 */

const GRAPH_API = 'https://graph.facebook.com/v21.0';

function getHeaders() {
  return {
    'Authorization': `Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}`,
    'Content-Type': 'application/json',
  };
}

export async function sendTextMessage(to, text) {
  const url = `${GRAPH_API}/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`;
  const res = await fetch(url, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      to,
      type: 'text',
      text: { body: text },
    }),
  });
  if (!res.ok) {
    console.error('WhatsApp send text error:', await res.text());
    throw new Error(`Failed to send WhatsApp text: ${res.status}`);
  }
  return res.json();
}

export async function uploadMedia(buffer, filename, mimetype) {
  const url = `${GRAPH_API}/${process.env.WHATSAPP_PHONE_NUMBER_ID}/media`;
  
  const form = new FormData();
  form.append('file', new Blob([buffer], { type: mimetype }), filename);
  form.append('messaging_product', 'whatsapp');

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}`
    },
    body: form,
  });

  if (!res.ok) throw new Error(`Failed to upload media: ${await res.text()}`);
  const data = await res.json();
  return data.id;
}

export async function sendDocument(to, documentUrlOrId, filename, caption = '') {
  const url = `${GRAPH_API}/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`;
  
  // If it's a URL, use link. If it's a media ID, use id.
  const doc = documentUrlOrId.startsWith('http') 
    ? { link: documentUrlOrId, filename }
    : { id: documentUrlOrId, filename };
    
  if (caption) doc.caption = caption;

  const res = await fetch(url, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      to,
      type: 'document',
      document: doc,
    }),
  });
  if (!res.ok) {
    console.error('WhatsApp send document error:', await res.text());
    throw new Error(`Failed to send document: ${res.status}`);
  }
  return res.json();
}

export async function sendAudio(to, mediaId) {
  const url = `${GRAPH_API}/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`;
  const res = await fetch(url, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      to,
      type: 'audio',
      audio: { id: mediaId },
    }),
  });
  if (!res.ok) {
    console.error('WhatsApp send audio error:', await res.text());
    throw new Error(`Failed to send audio: ${res.status}`);
  }
  return res.json();
}

export async function downloadMedia(mediaId) {
  // Step 1: Get the media URL
  const metaRes = await fetch(`${GRAPH_API}/${mediaId}`, {
    headers: { 'Authorization': `Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}` },
  });
  if (!metaRes.ok) throw new Error(`Failed to get media URL: ${metaRes.status}`);
  const { url: mediaUrl } = await metaRes.json();

  // Step 2: Download the actual file
  const mediaRes = await fetch(mediaUrl, {
    headers: { 'Authorization': `Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}` },
  });
  if (!mediaRes.ok) throw new Error(`Failed to download media: ${mediaRes.status}`);

  const arrayBuffer = await mediaRes.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

export async function markAsRead(messageId) {
  const url = `${GRAPH_API}/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`;
  await fetch(url, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      status: 'read',
      message_id: messageId,
    }),
  }).catch(err => console.error('Mark as read error:', err));
}
