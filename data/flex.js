/**
 * PEINTURE FLEX — abonnement + crédit
 *
 * Principe :
 *  1. le client règle à la banque un abonnement de 250 000 GNF (acompte et
 *     garantie de prestation) ;
 *  2. la banque instruit et valide le dossier de financement (crédibilité) ;
 *  3. le solde du devis est financé sur 1 à 12 mois, au taux de 1 % par mois ;
 *  4. la prestation de peinture est offerte une fois le dossier validé.
 */

const FLEX = {
  subscription: 250000,
  monthlyRate: 0.01,
  minMonths: 1,
  maxMonths: 12,
  bank: 'Banque partenaire — Agence Kaloum',
  offer: 'Prestation de peinture offerte dès la validation du dossier'
};

function pad(n) {
  return String(n).padStart(2, '0');
}

function isoDate(value) {
  const d = value instanceof Date ? value : new Date(value || Date.now());
  return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
}

/** Ajoute n mois à une date ISO en conservant le jour quand c'est possible. */
function addMonths(iso, months) {
  const d = new Date(String(iso).slice(0, 10) + 'T00:00:00');
  const day = d.getDate();
  d.setDate(1);
  d.setMonth(d.getMonth() + months);
  const lastDay = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  d.setDate(Math.min(day, lastDay));
  return isoDate(d);
}

/** Mensualité : principal + intérêts simples (1 %/mois), répartis sur la durée. */
function buildFlexPlan(total, months, opts) {
  const options = opts || {};
  const gross = Math.max(0, Math.round(Number(total) || 0));
  const duration = Math.min(FLEX.maxMonths, Math.max(FLEX.minMonths, Math.round(Number(months) || FLEX.minMonths)));
  const subscription = Math.min(FLEX.subscription, gross);
  const financed = Math.max(0, gross - subscription);
  const interest = Math.round(financed * FLEX.monthlyRate * duration);
  const totalCredit = financed + interest;
  const monthly = duration ? Math.round(totalCredit / duration) : 0;

  const start = isoDate(options.startDate || Date.now());
  const schedule = [{
    id: 'f0',
    kind: 'subscription',
    step: 'Abonnement FLEX (banque)',
    amount: subscription,
    dueDate: start,
    status: 'a_venir'
  }];

  let rest = totalCredit;
  for (let i = 1; i <= duration; i++) {
    const amount = i === duration ? rest : monthly;
    rest -= amount;
    schedule.push({
      id: 'f' + i,
      kind: 'installment',
      step: 'Échéance ' + i,
      amount,
      dueDate: addMonths(start, i),
      status: 'a_venir'
    });
  }

  return {
    months: duration,
    rate: FLEX.monthlyRate,
    subscription,
    financed,
    interest,
    totalCredit,
    monthly,
    total: subscription + totalCredit,
    startDate: start,
    schedule
  };
}

/** Le dossier est validé quand l'étape « Décision de la banque » est validée. */
function isBankValidated(quote) {
  const steps = (quote && quote.financing && quote.financing.steps) || [];
  const decision = steps.find((s) => s.name === 'Décision de la banque');
  return !!(decision && decision.status === 'valide');
}

module.exports = { FLEX, buildFlexPlan, isBankValidated, addMonths };
