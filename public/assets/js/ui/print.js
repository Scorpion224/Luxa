/**
 * Impression du devis.
 */

import { printRoot } from './dom.js';
import { dateFr, dec, esc, money, todayIso } from '../core/format.js';
import { state } from '../core/state.js';

export function printQuote(quote) {
  const company = state.company || {};
  const client = state.clients.find((c) => c.id === quote.clientId) || {};
  const lines = quote.lines || [];
  const subtotal = quote.subtotal || lines.reduce((s, l) => s + l.amount, 0);
  const tva = quote.tvaAmount || 0;
  const total = quote.total || subtotal + tva;

  printRoot.innerHTML =
    '<div class="print-sheet">' +
    '<div class="print-head">' +
    '<div><h1>' +
    esc(company.name || 'PEINTURE PRO GUINÉE') +
    '</h1>' +
    '<div>' +
    esc(company.address || '') +
    '</div>' +
    '<div>Tél : ' +
    esc(company.phone || '') +
    ' • ' +
    esc(company.email || '') +
    '</div>' +
    '<div>' +
    esc(company.rccm || '') +
    ' • ' +
    esc(company.nif || '') +
    '</div>' +
    '</div>' +
    '<div style="text-align:right">' +
    '<div style="font-size:18px;font-weight:700;color:#0c5e62">DEVIS</div>' +
    '<div style="font-weight:600">' +
    esc(quote.id) +
    '</div>' +
    '<div>Date : ' +
    dateFr(quote.createdAt || todayIso()) +
    '</div>' +
    (quote.validUntil ? '<div>Validité : ' + dateFr(quote.validUntil) + '</div>' : '') +
    '</div>' +
    '</div>' +
    '<div style="margin-bottom:16px">' +
    '<div style="font-size:10px;text-transform:uppercase;color:#7a8a8d;margin-bottom:4px">Client</div>' +
    '<div style="font-size:14px;font-weight:600">' +
    esc(quote.clientName || client.name || '—') +
    '</div>' +
    (client.company ? '<div>' + esc(client.company) + '</div>' : '') +
    (client.address ? '<div>' + esc(client.address) + ', ' + esc(client.city || '') + '</div>' : '') +
    (client.phone ? '<div>Tél : ' + esc(client.phone) + '</div>' : '') +
    '</div>' +
    '<div style="font-size:13px;font-weight:600;margin-bottom:4px">' +
    esc(quote.subject || 'Prestation de peinture') +
    '</div>' +
    '<table><thead><tr><th>Désignation</th><th class="right">Qté</th><th class="right">P.U.</th><th class="right">Montant</th></tr></thead><tbody>' +
    lines
      .map(
        (l) =>
          '<tr><td>' +
          esc(l.designation) +
          (l.detail ? ' — ' + esc(l.detail) : '') +
          '</td>' +
          '<td class="right">' +
          dec(l.qty) +
          ' ' +
          esc(l.unit) +
          '</td>' +
          '<td class="right">' +
          money(l.unitPrice) +
          '</td>' +
          '<td class="right">' +
          money(l.amount) +
          '</td></tr>'
      )
      .join('') +
    '</tbody></table>' +
    '<div class="print-totals">' +
    '<div><span>Sous-total HT</span><span>' +
    money(subtotal) +
    '</span></div>' +
    '<div><span>TVA (' +
    Math.round((quote.tvaRate || 0.18) * 100) +
    ' %)</span><span>' +
    money(tva) +
    '</span></div>' +
    '<div class="grand"><span>Total TTC</span><span>' +
    money(total) +
    '</span></div>' +
    '</div>' +
    (quote.notes
      ? '<div style="margin-top:18px"><strong>Notes :</strong> ' + esc(quote.notes) + '</div>'
      : '') +
    '<div class="print-foot">' +
    'Devis valable 30 jours. Acompte de 40 % à la commande, solde selon l’échéancier PEINTURE FLEX. ' +
    'Paiement par virement, Mobile Money ou espèces. Merci de votre confiance.<br>' +
    esc(company.name || '') +
    ' — ' +
    esc(company.phone || '') +
    '</div>' +
    '</div>';
  window.print();
}
