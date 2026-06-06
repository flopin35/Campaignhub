export const EXTENSION_PACKAGES = [
  { id: 'ext-7', days: 7, price: 80, label: '7 Days Extension' },
  { id: 'ext-14', days: 14, price: 150, label: '14 Days Extension' },
  { id: 'ext-30', days: 30, price: 280, label: '30 Days Extension' },
];

export function getExtensionPackage(id) {
  return EXTENSION_PACKAGES.find((p) => p.id === id) || null;
}
