import { createPayment, submitPaymentProof, getPaymentForPlan } from './paymentService';
import { getPurchasablePlan, getPremiumVariant, resolvePlanId } from '../data/premiumPackages';

export async function createPremiumPurchase({ campaignId, userId, featureId, variantId }) {
  const resolvedId = resolvePlanId(featureId);
  const feature = getPurchasablePlan(resolvedId);
  if (!feature) throw new Error('Invalid premium feature');

  let pkg;
  let purchaseType = 'premium';
  const premiumFeatureId = resolvedId;
  let resolvedVariantId = variantId || null;

  if (feature.variants) {
    if (!variantId) {
      throw new Error('Select a boost duration before continuing.');
    }
    const variant = getPremiumVariant(resolvedId, variantId);
    if (!variant) throw new Error('Invalid boost duration');
    pkg = {
      id: variant.id,
      name: `${feature.name} — ${variant.label}`,
      price: variant.price,
      durationDays: Math.ceil(variant.durationMs / 86400000),
    };
    resolvedVariantId = variant.id;
  } else if (feature.isBundle || feature.isSubscription) {
    pkg = {
      id: feature.id,
      name: feature.name,
      price: feature.price,
      durationDays: feature.durationDays,
    };
    resolvedVariantId = feature.boostVariantId || null;
  } else if (feature.purchaseType === 'hosting') {
    purchaseType = 'hosting';
    pkg = {
      id: feature.id,
      name: feature.name,
      price: feature.price,
      durationDays: feature.durationDays,
    };
  } else {
    pkg = {
      id: feature.id,
      name: feature.name,
      price: feature.price ?? feature.priceFrom,
      durationDays: feature.durationDays,
    };
  }

  if (typeof pkg.price !== 'number' || Number.isNaN(pkg.price) || pkg.price <= 0) {
    throw new Error('Invalid package price. Please select a valid plan and try again.');
  }

  return createPayment({
    campaignId,
    userId,
    pkg,
    purchaseType,
    premiumFeatureId,
    variantId: resolvedVariantId,
  });
}

export { submitPaymentProof, getPaymentForPlan };
