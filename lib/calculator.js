/**
 * Velum Price Calculator Module
 * Implements all pricing formulas from the Flutter Cotizador app.
 * All monetary values are in Quetzales (Q).
 */

import {
  PVC_ROW_HEADERS, PVC_COL_HEADERS, PVC_PRECIOS,
  TELA_ROW_HEADERS, TELA_COL_HEADERS, TELA_PRECIOS
} from './verticales-tables.js';

// ─── Shared Three-Tier Pricing ───────────────────────────────────────────────

function applyPricingTiers(basePrice, profit, iva, extras) {
  const totalCosto = basePrice + extras;
  const profitAmount = basePrice * (profit / 100);
  const totalWithoutIva = basePrice + profitAmount + extras;
  const totalWithIva = totalWithoutIva * (1 + iva / 100);

  return {
    totalCosto: Math.round(totalCosto * 100) / 100,
    totalSinIva: Math.round(totalWithoutIva * 100) / 100,
    totalConIva: Math.round(totalWithIva * 100) / 100,
  };
}

// ─── 1. Enrollables (Roller Shades) ──────────────────────────────────────────

/**
 * @param {number} width  - meters, > 0
 * @param {number} height - meters, > 0
 * @param {number} fabric_price  - Q per YARD
 * @param {number} profit - %, default 100
 * @param {number} iva    - %, default 12
 * @param {number} extras - Q flat, default 0
 */
export function calculateEnrollable(width, height, fabric_price, profit = 100, iva = 12, extras = 0) {
  const fabricCost = ((height + 0.2) / 0.91) * fabric_price;
  const mechanismCost = (width * 100) + 60;
  const basePrice = fabricCost + mechanismCost;
  return applyPricingTiers(basePrice, profit, iva, extras);
}

// ─── 2. Día y Noche (Day & Night Blinds) ─────────────────────────────────────

/**
 * @param {number} width  - meters, > 0
 * @param {number} height - meters, > 0
 * @param {number} fabric_price  - Q per METER
 * @param {number} profit - %, default 100
 * @param {number} iva    - %, default 12
 * @param {number} extras - Q flat, default 0
 */
export function calculateDiaYNoche(width, height, fabric_price, profit = 100, iva = 12, extras = 0) {
  const fabricYards = ((height + 0.2) / 0.91) * 2;
  const fabricCost = fabricYards * fabric_price;
  const mechanismCost = (width * 150) + 75;
  const basePrice = fabricCost + mechanismCost;
  return applyPricingTiers(basePrice, profit, iva, extras);
}

// ─── 3. Tradicionales (Traditional Curtains) ─────────────────────────────────

/**
 * @param {number} width   - meters, > 0
 * @param {number} height  - meters, > 0 (not used in formula, only in description)
 * @param {number} fabric_price   - Q per METER
 * @param {string} galeria - "RippleFold" | "Francesa" | "Ojetes"
 * @param {number} profit  - %, default 100
 * @param {number} iva     - %, default 12
 * @param {number} extras  - Q flat, default 0
 */
export function calculateTradicional(width, height, fabric_price, galeria, profit = 100, iva = 12, extras = 0) {
  const laborCost = 100 * width;

  let stylePrice;
  switch (galeria) {
    case 'RippleFold':
      stylePrice = 160 * width;
      break;
    case 'Francesa':
      stylePrice = 70 * width;
      break;
    case 'Ojetes':
      stylePrice = (width > 4 ? 500 : 350) + (70 * width);
      break;
    default:
      throw new Error(`Unknown galeria type: ${galeria}`);
  }

  const fabricCost = (2.5 * width * fabric_price) / 0.91;
  const basePrice = fabricCost + stylePrice + laborCost;
  return applyPricingTiers(basePrice, profit, iva, extras);
}

// ─── 4. Verticales (Vertical Blinds) ─────────────────────────────────────────

/**
 * @param {number} width  - meters, 0.5–4.9
 * @param {number} height - meters, 0.5–3.5
 * @param {string} type   - "PVC" | "Tela"
 * @param {number} profit - %, default 100
 * @param {number} iva    - %, default 12
 * @param {number} extras - Q flat, default 0
 */
export function calculateVertical(width, height, type, profit = 100, iva = 12, extras = 0) {
  let rowHeaders, colHeaders, table, multiplier;

  if (type === 'PVC') {
    rowHeaders = PVC_ROW_HEADERS;
    colHeaders = PVC_COL_HEADERS;
    table = PVC_PRECIOS;
    multiplier = 1.2;
  } else if (type === 'Tela') {
    rowHeaders = TELA_ROW_HEADERS;
    colHeaders = TELA_COL_HEADERS;
    table = TELA_PRECIOS;
    multiplier = 1.3;
  } else {
    throw new Error(`Unknown vertical type: ${type}`);
  }

  const rowIdx = rowHeaders.findIndex(v => v >= width);
  const colIdx = colHeaders.findIndex(v => v >= height);

  if (rowIdx === -1 || colIdx === -1) {
    throw new Error(`Dimensions out of range for ${type}: width=${width}, height=${height}`);
  }

  const rawPrice = table[colIdx][rowIdx];
  const basePrice = multiplier * rawPrice;
  return applyPricingTiers(basePrice, profit, iva, extras);
}

// ─── Dispatcher ──────────────────────────────────────────────────────────────

/**
 * Calculate price for any product type.
 * @param {Object} params
 * @param {string} params.product_type - "enrollable" | "dia_y_noche" | "tradicional" | "vertical"
 * @param {number} params.width
 * @param {number} params.height
 * @param {number} [params.fabric_price] - not needed for vertical
 * @param {string} [params.galeria] - only for tradicional
 * @param {string} [params.vertical_type] - only for vertical: "PVC" | "Tela"
 * @param {number} [params.profit=100]
 * @param {number} [params.iva=12]
 * @param {number} [params.extras=0]
 */
export function calculateProduct(params) {
  const {
    product_type,
    width,
    height,
    fabric_price,
    galeria,
    vertical_type,
    profit = 100,
    iva = 12,
    extras = 0,
  } = params;

  switch (product_type) {
    case 'enrollable':
      return calculateEnrollable(width, height, fabric_price, profit, iva, extras);
    case 'dia_y_noche':
      return calculateDiaYNoche(width, height, fabric_price, profit, iva, extras);
    case 'tradicional':
      return calculateTradicional(width, height, fabric_price, galeria, profit, iva, extras);
    case 'vertical':
      return calculateVertical(width, height, vertical_type, profit, iva, extras);
    default:
      throw new Error(`Unknown product type: ${product_type}`);
  }
}

/**
 * Build the description string for use in the invoice.
 */
export function buildDescription(params) {
  const { product_type, width, height, galeria, vertical_type, fabric_name } = params;
  const dims = `${width}m x ${height}m`;

  switch (product_type) {
    case 'enrollable':
      return `Cortina Enrollable${fabric_name ? ` ${fabric_name}` : ''} | ${dims}`;
    case 'dia_y_noche':
      return `Cortina Día y Noche${fabric_name ? ` ${fabric_name}` : ''} | ${dims}`;
    case 'tradicional':
      return `Cortina Tradicional ${galeria}${fabric_name ? ` ${fabric_name}` : ''} | ${dims}`;
    case 'vertical':
      return `Cortina Vertical de ${vertical_type} | ${dims}`;
    default:
      return `Producto | ${dims}`;
  }
}
