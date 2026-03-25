/**
 * Invoice API Helper
 * Generates PDF invoices via the existing Velum API.
 */

const INVOICE_API = 'https://rasv.dev/velum/generate_invoice';

/**
 * Generate an invoice PDF.
 * @param {Object} params
 * @param {Array} params.items - Array of { description, quantity, unitPrice }
 * @param {string} params.recipientName - e.g. phone number or client name
 * @param {string} [params.company] - optional company name
 * @param {string} [params.date] - DD/MM/YYYY format, defaults to today
 * @returns {Promise<string>} - URL of the generated PDF
 */
export async function generateInvoice({ items, recipientName, company = '', business = 2, date }) {
  if (!date) {
    const now = new Date();
    const dd = String(now.getDate()).padStart(2, '0');
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const yyyy = now.getFullYear();
    date = `${dd}/${mm}/${yyyy}`;
  }

  const payload = {
    business,       // Dekora 0, Cortilux 1, Velum 2
    date,
    recipientInfo: {
      name: recipientName,
      company,
    },
    items: items.map(item => ({
      description: item.description,
      quantity: item.quantity,
      unitPrice: Math.round(item.unitPrice),
    })),
  };

  console.log('Generating invoice with payload:', JSON.stringify(payload, null, 2));

  const res = await fetch(INVOICE_API, {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'X-API-Key': process.env.VELUM_API_KEY || 'velum_secure_token_123'
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const errText = await res.text();
    console.error('Invoice API error:', errText);
    throw new Error(`Invoice API failed: ${res.status}`);
  }

  // The API returns the raw PDF binary
  const arrayBuffer = await res.arrayBuffer();
  return Buffer.from(arrayBuffer);
}
