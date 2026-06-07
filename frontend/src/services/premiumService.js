import { createPayment, submitPaymentProof } from './paymentService';
import { getPurchasablePlan, getPremiumVariant } from '../data/premiumPackages';

export async function createPremiumPurchase({ campaignId, userId, featureId, variantId }) {
  const feature = getPurchasablePlan(featureId);
  if (!feature) throw new Error('Invalid premium feature');

  let pkg;
  let purchaseType = 'premium';
  let premiumFeatureId = featureId;
  let resolvedVariantId = variantId || null;

  if (feature.variants && variantId) {
    const variant = getPremiumVariant(featureId, variantId);
    if (!variant) throw new Error('Invalid boost duration');
    pkg = {
      id: variant.id,
      name: `${feature.name} — ${variant.label}`,
      price: variant.price,
      durationDays: Math.ceil(variant.durationMs / 86400000),
    };
    resolvedVariantId = variant.id;
  } else if (feature.isBundle) {
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
      price: feature.price,
      durationDays: feature.durationDays,
    };
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

export { submitPaymentProof };
