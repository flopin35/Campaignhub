/** Ghana regions and constituencies for supporter sign-ups. */

export const GHANA_REGIONS = [
  'Greater Accra',
  'Ashanti',
  'Western',
  'Central',
  'Eastern',
  'Volta',
  'Northern',
  'Upper East',
  'Upper West',
  'Bono',
  'Bono East',
  'Ahafo',
  'Western North',
  'Oti',
  'Savannah',
  'North East',
];

export const CONSTITUENCIES_BY_REGION = {
  'Greater Accra': [
    'Ablekuma Central', 'Ablekuma North', 'Ablekuma South', 'Ablekuma West',
    'Accra Central', 'Adenta', 'Ashaiman', 'Ayawaso Central', 'Ayawaso East',
    'Ayawaso North', 'Ayawaso West Wuogon', 'Domeabra-Obom', 'Kpone-Katamanso',
    'Krowor', 'Ledzokuku', 'Madina', 'Ningo-Prampram', 'Odododiodoo',
    'Okaikwei Central', 'Okaikwei North', 'Okaikwei South', 'Shai-Osudoku',
    'Tema Central', 'Tema East', 'Tema West', 'Weija-Gbawe',
  ],
  Ashanti: [
    'Asokwa', 'Bantama', 'Bekwai', 'Ejisu', 'Fomena', 'Kumawu', 'Kwadaso',
    'Manhyia North', 'Manhyia South', 'Mampong', 'Obuasi East', 'Obuasi West',
    'Oforikrom', 'Old Tafo', 'Suame', 'Subin', 'Asawase',
  ],
  Western: ['Takoradi', 'Sekondi', 'Effia', 'Kwesimintsim', 'Shama', 'Wassa East'],
  Central: ['Cape Coast', 'Komenda-Edina-Eguafo-Abirem', 'Mfantseman', 'Awutu Senya East'],
  Eastern: ['Abetifi', 'Akim Oda', 'Akropong', 'Koforidua', 'Lower Manya Krobo', 'New Juaben South'],
  Volta: ['Ho Central', 'Hohoe', 'Keta', 'Kpando', 'North Tongu', 'South Dayi'],
  Northern: ['Tamale Central', 'Tamale North', 'Tamale South', 'Yendi', 'Savelugu'],
  'Upper East': ['Bolgatanga Central', 'Bolgatanga East', 'Tempane', 'Bawku Central'],
  'Upper West': ['Wa Central', 'Wa East', 'Wa West', 'Lawra'],
  Bono: ['Sunyani East', 'Sunyani West', 'Dormaa Central', 'Berekum East'],
  'Bono East': ['Techiman South', 'Techiman North', 'Atebubu-Amantin'],
  Ahafo: ['Tano South', 'Tano North', 'Asunafo North'],
  'Western North': ['Sefwi-Wiawso', 'Bibiani-Anhwiaso-Bekwai'],
  Oti: ['Krachi East', 'Krachi West', 'Nkwanta North'],
  Savannah: ['Salaga South', 'Bole', 'Damongo'],
  'North East': ['Walewale', 'Yagaba', 'Chereponi'],
};

export const SUPPORTER_INTERESTS = [
  'Campaign updates',
  'Events & rallies',
  'Donations',
  'Policy & ideas',
  'Share online',
];

export const DONATION_TIERS = [10, 25, 50, 100, 200, 500];

export function getConstituenciesForRegion(region) {
  return CONSTITUENCIES_BY_REGION[region] || [];
}
