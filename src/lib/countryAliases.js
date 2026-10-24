/**
 * What people type instead of the official name. Nobody searches "United
 * Arab Emirates" — they type "uae" or "dubai" — and a search that finds
 * nothing reads as "your country is not supported".
 */
const COUNTRY_ALIASES = {
  AE: ['uae', 'emirates', 'dubai', 'abu dhabi', 'sharjah'],
  US: ['usa', 'america', 'united states of america'],
  GB: ['uk', 'england', 'britain', 'great britain', 'scotland', 'wales'],
  SA: ['ksa', 'saudi'],
  KR: ['korea', 'south korea'],
  KP: ['north korea'],
  RU: ['russia'],
  NL: ['holland'],
  CZ: ['czech republic'],
  TR: ['turkey', 'türkiye'],
  HK: ['hongkong'],
  VN: ['viet nam'],
  IR: ['persia'],
  CI: ['ivory coast'],
};

export default COUNTRY_ALIASES;
