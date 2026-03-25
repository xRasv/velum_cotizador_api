/**
 * AI Module — OpenAI GPT-4o-mini Integration
 * Handles conversation with tool calling for the Velum quoting assistant.
 */

import OpenAI from 'openai';
import { calculateProduct, buildDescription } from './calculator.js';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY || 'dummy_key_for_build' });

// ─── System Prompt ───────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `Eres una asistente interna de cotizaciones de Velum, una empresa guatemalteca de cortinas y persianas. Hablas en español de forma amigable y eficiente.

Tu trabajo es ayudar al equipo de Velum a generar cotizaciones rápidamente. Recibirás mensajes de texto o transcripciones de audio describiendo productos y medidas.

## Productos que manejas:

### 1. Enrollables (Roller Shades)
- Necesitas: ancho (m), alto (m), precio de tela por YARDA (Q)
- La tela puede ser: Screen, Blackout, Translúcida, etc.

### 2. Día y Noche (Day & Night Blinds)
- Necesitas: ancho (m), alto (m), precio de tela por METRO (Q)

### 3. Tradicionales (Traditional Curtains)
- Necesitas: ancho (m), alto (m), precio de tela por METRO (Q), tipo de galería (RippleFold, Francesa, Ojetes)

### 4. Verticales (Vertical Blinds)
- Necesitas: ancho (m, 0.5–4.9), alto (m, 0.5–3.5), tipo de material (PVC o Tela)
- NO necesitan precio de tela (usan tabla de precios fija)

## Parámetros opcionales (para TODOS los productos):
- Ganancia (profit): porcentaje, default 100%
- IVA: porcentaje, default 12%
- Extras/Imprevistos: monto fijo en Q, default 0

## Tu flujo de trabajo:
1. Lee el mensaje del usuario y extrae los productos mencionados.
2. Si falta información esencial (medidas, precio de tela, tipo de galería, etc.), pregunta de forma concisa y amigable.
3. Cuando tengas todos los datos, usa la herramienta calculate_and_quote para calcular los precios.
4. Presenta un resumen claro de los items con precios.
5. Pregunta obligatoriamente "¿Para qué empresa es la cotización? (Dekora, Cortilux o Velum)". Si el usuario no responde o pide usar valores por defecto, asume Velum. No generes el PDF hasta saber la empresa.
6. Cuando el usuario confirme todo, usa generate_pdf para generar la cotización en PDF.

## Reglas importantes:
- El usuario puede mencionar múltiples productos en un solo mensaje.
- Las medidas pueden venir en formatos como: "2.90 x 2.10", "2.90m por 2.10m", "ancho 2.90 alto 2.10", etc.
- Si mencionan "instalación" o algún servicio adicional, agrégalo como item con precio fijo.
- Siempre redondea los precios al entero más cercano para el unitPrice.
- No muestres centavos en los precios finales.
- Si el usuario dice algo como "los mismos datos de siempre" o "la misma ganancia", usa los valores default (profit=100, iva=12).
- Los precios que calculas son el totalConIva (precio final con IVA).
- Si mencionan "cortina" o "persiana" y no especifican que es "tradicional" o "vertical", asume categóricamente que es una "cortina enrollable".
- **IMPORTANTE:** NO TRATES AL USUARIO COMO UN CLIENTE. El usuario es tu jefe, tu eres su asistente personal y estás para ayudarle a realizar su trabajo.
- **IMPORTANTE:** Tu tono debe ser directo y conciso. Está PROHIBIDO hacer preguntas típicas de ventas como "¿Para qué habitación es?" o "¿Le gustaría ver catálogos?". Tu único trabajo es recibir medidas, procesar la matemática rápidamente y generar el PDF.
- **IMPORTANTE:** Adopta una personalidad y género FEMENINO en todas tus respuestas (ej. "estoy lista", "soy una experta").
- **IMPORTANTE:** Si el usuario te pide que respondas con "audio" o "voz," responde que sí con mucho gusto. NUNCA digas que no puedes enviar audios o que solo generas texto. Tus respuestas de texto serán convertidas a audio en real por el backend.
- **IMPORTANTE:** Cuando llenes el campo 'fabric_name' en la herramienta 'calculate_and_quote', DEBES usar SOLAMENTE el tipo genérico (ej. 'screen', 'blackout', 'día y noche', 'velo', 'lino'). NUNCA incluyas marcas, nombres específicos ni dimensiones del catálogo impreso en ese campo, aunque las hayas usado para buscar el precio.
- **IMPORTANTE:** Si usas 'fetch_past_quote' para buscar una cotización antigua, tu ÚNICO trabajo es mostrarle al usuario los items y darle el link de descarga ('pdf_url'). ESTÁ ESTRICTAMENTE PROHIBIDO usar 'generate_pdf' o pedirle el nombre de la empresa para hacer uno nuevo, a menos que el usuario te pida explícitamente editar o hacer una nueva versión de esa cotización vieja.`;

// ─── Tool Definitions ────────────────────────────────────────────────────────

const TOOLS = [
  {
    type: 'function',
    function: {
      name: 'calculate_and_quote',
      description: 'Calculate prices for one or more window treatment products. Call this once you have all the required measurements and prices from the user.',
      parameters: {
        type: 'object',
        properties: {
          items: {
            type: 'array',
            description: 'List of products to calculate',
            items: {
              type: 'object',
              properties: {
                product_type: {
                  type: 'string',
                  enum: ['enrollable', 'dia_y_noche', 'tradicional', 'vertical'],
                  description: 'Type of window treatment product',
                },
                width: { type: 'number', description: 'Width in meters' },
                height: { type: 'number', description: 'Height in meters' },
                price: { type: 'number', description: 'Fabric price (Q/yard for enrollable, Q/meter for others). Not needed for vertical.' },
                fabric_name: { type: 'string', description: 'Generic name of the fabric ONLY (e.g. screen, blackout, día y noche, velo). NEVER include catalog-specific details or brands.' },
                galeria: { type: 'string', enum: ['RippleFold', 'Francesa', 'Ojetes'], description: 'Gallery type (only for tradicional)' },
                vertical_type: { type: 'string', enum: ['PVC', 'Tela'], description: 'Material type (only for vertical)' },
                quantity: { type: 'integer', description: 'Number of units, default 1', default: 1 },
                profit: { type: 'number', description: 'Profit margin %, default 100' },
                iva: { type: 'number', description: 'IVA %, default 12' },
                extras: { type: 'number', description: 'Extra cost in Q, default 0' },
              },
              required: ['product_type', 'width', 'height'],
            },
          },
          extra_items: {
            type: 'array',
            description: 'Additional line items like installation, shipping, etc.',
            items: {
              type: 'object',
              properties: {
                description: { type: 'string' },
                quantity: { type: 'integer', default: 1 },
                unitPrice: { type: 'number' },
              },
              required: ['description', 'unitPrice'],
            },
          },
        },
        required: ['items'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'generate_pdf',
      description: 'Generate a PDF quote/invoice with all the calculated items. Only call this after the user has confirmed the items, prices, and the enterprise (Dekora, Cortilux, or Velum).',
      parameters: {
        type: 'object',
        properties: {
          confirm: { type: 'boolean', description: 'Must be true to generate' },
          business_name: { type: 'string', enum: ['Dekora', 'Cortilux', 'Velum'], description: 'The enterprise the quote is for.' }
        },
        required: ['confirm', 'business_name'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'edit_quote_items',
      description: 'Overwrites the current quote items in memory with a new manually-edited list. Use this when the user asks you to modify descriptions, quantities, or prices of the current quote or an old quote without recalculating dimensions.',
      parameters: {
        type: 'object',
        properties: {
          items: {
            type: 'array',
            description: 'The updated list of items to replace the current quote memory.',
            items: {
              type: 'object',
              properties: {
                description: { type: 'string', description: 'The item description.' },
                quantity: { type: 'integer', description: 'Number of units.' },
                unitPrice: { type: 'number', description: 'The final unit price (totalConIva) to charge.' }
              },
              required: ['description', 'quantity', 'unitPrice']
            }
          }
        },
        required: ['items']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'fetch_past_quote',
      description: 'Fetches the items from a past invoice in the legacy database. Use this when the user asks you to modify or look up an old quote number.',
      parameters: {
        type: 'object',
        properties: {
          company_name: { type: 'string', enum: ['Dekora', 'Cortilux', 'Velum'], description: 'The company the old quote belongs to.' },
          invoice_number: { type: 'integer', description: 'The number of the old quote to fetch.' }
        },
        required: ['company_name', 'invoice_number']
      }
    }
  }
];

// ─── Tool Execution ──────────────────────────────────────────────────────────

function executeCalculateAndQuote(args) {
  const results = [];

  for (const item of (args.items || [])) {
    try {
      const calculation = calculateProduct({
        product_type: item.product_type,
        width: item.width,
        height: item.height,
        price: item.price,
        galeria: item.galeria,
        vertical_type: item.vertical_type,
        profit: item.profit ?? 100,
        iva: item.iva ?? 12,
        extras: item.extras ?? 0,
      });

      const description = buildDescription({
        product_type: item.product_type,
        width: item.width,
        height: item.height,
        galeria: item.galeria,
        vertical_type: item.vertical_type,
        fabric_name: item.fabric_name,
      });

      results.push({
        description,
        quantity: item.quantity || 1,
        unitPrice: Math.round(calculation.totalConIva),
        breakdown: calculation,
      });
    } catch (err) {
      results.push({
        description: `Error calculando ${item.product_type}`,
        error: err.message,
      });
    }
  }

  // Add extra items (installation, etc.)
  for (const extra of (args.extra_items || [])) {
    results.push({
      description: extra.description,
      quantity: extra.quantity || 1,
      unitPrice: Math.round(extra.unitPrice),
    });
  }

  return results;
}

/**
 * Fetches the live catalog of fabrics and prices from the legacy API.
 * @returns {Promise<string>} - Formatted string of fabrics and prices
 */
async function fetchFabricCatalog() {
  try {
    const response = await fetch('https://rasv.dev/velum/values', {
      headers: { 'X-API-Key': process.env.VELUM_API_KEY || 'velum_secure_token_123' }
    });
    if (!response.ok) return '';
    const data = await response.json();
    if (!data || data.length === 0) return '';

    let catalogStr = '';
    for (const item of data) {
      catalogStr += `- ${item.key} (Precio: Q${item.value})\n`;
    }
    return catalogStr;
  } catch (err) {
    console.error('Error fetching fabric catalog:', err);
    return '';
  }
}

// ─── Main Chat Function ──────────────────────────────────────────────────────

/**
 * Process a conversation turn.
 * @param {Array} messages - Chat history [{ role, content }]
 * @param {Object} sessionData - Current session data with accumulated items
 * @returns {Object} { reply, updatedItems, shouldGeneratePdf }
 */
export async function chat(messages, sessionData = {}) {
  const catalog = await fetchFabricCatalog();

  let systemContent = SYSTEM_PROMPT;
  if (catalog) {
    systemContent += `\n\n## Catálogo de Telas y Precios Actualizados:\n${catalog}\n\n**REGLAS DE AUTO-COMPLETADO:**
1. Si el usuario pide cotizar un producto con una tela específica PERO NO da el precio, busca el precio exacto en este Catálogo y úsalo automáticamente.
2. Si el nombre que da el usuario es ambiguo y califica para múltiples opciones (ej. "Tela Screen" y hay de 2.50m y de 3.00m), ABORTA LA COTIZACIÓN, muéstrale las opciones exactas que tienes y pídele que aclare.
3. Si el usuario pregunta "qué telas tienen" o sus precios, responde con el contenido de este catálogo en un formato claro y amigable.`;
  }

  const conversationMessages = [
    { role: 'system', content: systemContent },
    ...messages,
  ];

  // If we have accumulated items, add them as context
  if (sessionData.items && sessionData.items.length > 0) {
    conversationMessages.splice(1, 0, {
      role: 'system',
      content: `Items acumulados en esta cotización:\n${JSON.stringify(sessionData.items, null, 2)}\n\nSi el usuario confirma, usa generate_pdf para generar el PDF.`,
    });
  }

  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: conversationMessages,
    tools: TOOLS,
    tool_choice: 'auto',
    temperature: 0.3,
  });

  const message = response.choices[0].message;
  let reply = message.content || '';
  let updatedItems = sessionData.items || [];
  let shouldGeneratePdf = false;
  let pdfBusinessId = 2;
  let pastPdfUrl = null;

  // Handle tool calls
  if (message.tool_calls && message.tool_calls.length > 0) {
    const toolResults = [];

    for (const toolCall of message.tool_calls) {
      const args = JSON.parse(toolCall.function.arguments);

      if (toolCall.function.name === 'calculate_and_quote') {
        const calculated = executeCalculateAndQuote(args);
        updatedItems = calculated;
        toolResults.push({
          tool_call_id: toolCall.id,
          role: 'tool',
          content: JSON.stringify(calculated),
        });
      } else if (toolCall.function.name === 'generate_pdf') {
        if (args.confirm && updatedItems.length > 0) {
          shouldGeneratePdf = true;
          const businessMap = { 'Dekora': 0, 'Cortilux': 1, 'Velum': 2 };
          pdfBusinessId = businessMap[args.business_name] ?? 2;
        }
        toolResults.push({
          tool_call_id: toolCall.id,
          role: 'tool',
          content: JSON.stringify({ success: true, message: 'PDF will be generated and sent.' }),
        });
      } else if (toolCall.function.name === 'edit_quote_items') {
        updatedItems = args.items || [];
        toolResults.push({
          tool_call_id: toolCall.id,
          role: 'tool',
          content: JSON.stringify({ success: true, message: 'Current quote memory has been updated with these modified items.', items: updatedItems }),
        });
      } else if (toolCall.function.name === 'fetch_past_quote') {
        const businessMap = { 'Dekora': 0, 'Cortilux': 1, 'Velum': 2 };
        const cid = businessMap[args.company_name] ?? 2;
        try {
          const apiRes = await fetch(`https://rasv.dev/velum/get_invoice_payload/${cid}/${args.invoice_number}`, {
            headers: { 'X-API-Key': process.env.VELUM_API_KEY || 'velum_secure_token_123' }
          });
          if (!apiRes.ok) throw new Error('Invoice not found');
          const payload = await apiRes.json();
          updatedItems = payload.items || [];
          const pdfUrl = `https://rasv.dev/velum/get_invoice/${cid}/${args.invoice_number}`;
          pastPdfUrl = pdfUrl;
          toolResults.push({
            tool_call_id: toolCall.id,
            role: 'tool',
            content: JSON.stringify({ success: true, items: updatedItems, message: 'Past quote successfully loaded. The backend has automatically downloaded and sent the user the PDF file for this quote. Ask the user if they want to edit any items from this quote to generate a new branched version.' }),
          });
        } catch (err) {
          toolResults.push({
            tool_call_id: toolCall.id,
            role: 'tool',
            content: JSON.stringify({ error: 'Invoice not found or could not be loaded.' }),
          });
        }
      }
    }

    // Send tool results back to get a natural language response
    const followUp = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        ...conversationMessages,
        message,
        ...toolResults,
      ],
      temperature: 0.3,
    });

    reply = followUp.choices[0].message.content || '';
  }

  return { reply, updatedItems, shouldGeneratePdf, pdfBusinessId, pastPdfUrl };
}

/**
 * Transcribe audio using OpenAI Whisper.
 * @param {Buffer} audioBuffer - Audio file buffer
 * @returns {Promise<string>} - Transcribed text
 */
export async function transcribeAudio(audioBuffer) {
  const file = new File([audioBuffer], 'audio.ogg', { type: 'audio/ogg' });
  const transcription = await openai.audio.transcriptions.create({
    model: 'whisper-1',
    file,
    language: 'es',
  });
  return transcription.text;
}

/**
 * Generate speech from text using OpenAI TTS.
 * @param {string} text - Text to convert to speech
 * @param {string} voice - Voice to use (alloy, echo, fable, onyx, nova, shimmer)
 * @returns {Promise<Buffer>} - MP3 Audio buffer
 */
export async function generateSpeech(text, voice = 'nova') {
  const mp3 = await openai.audio.speech.create({
    model: 'tts-1',
    voice: voice,
    input: text,
  });
  return Buffer.from(await mp3.arrayBuffer());
}
