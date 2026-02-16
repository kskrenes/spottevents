import { City, Country, State } from "country-state-city";

export const INVALID_LOCATION = { city: null, state: null, country: null, isValid: false };

const encodeSlugPart = (part) => encodeURIComponent(part.trim());
const decodeSlugPart = (part) => decodeURIComponent(part);
const formatSlugPart = (part) => {
  return part.split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
}

export function getCityStateString(cityOrState) {
  if (cityOrState) return cityOrState + ', ';
  return '';
}

export function createLocationSlug(city, state, country) {
  if (!city || !state || !country) return '';
  return [city, state, country].map(encodeSlugPart).join('~');
}

export function parseLocationSlug(slug) {
  if (!slug || typeof slug !== 'string') return INVALID_LOCATION;

  // split into exactly 3 parts
  const parts = slug.split('~');
  if (parts.length !== 3) return INVALID_LOCATION;

  // parse city, state, country
  const [cityRaw, stateRaw, countryRaw] = parts.map(decodeSlugPart);
  const cityName = formatSlugPart(cityRaw);
  const stateName = formatSlugPart(stateRaw);
  const countryName = formatSlugPart(countryRaw);

  // validate country
  const allCountries = Country.getAllCountries();
  const countryObj = allCountries.find(c => c.name.toLowerCase() === countryName.toLowerCase());
  if (!countryObj) return INVALID_LOCATION;

  // validate state
  const allStates = State.getStatesOfCountry(countryObj.isoCode);
  const stateObj = allStates.find(s => s.name.toLowerCase() === stateName.toLowerCase());
  if (!stateObj) return INVALID_LOCATION;

  // validate city
  const allCities = City.getCitiesOfState(countryObj.isoCode, stateObj.isoCode);
  const isCityValid = allCities.some(c => c.name.toLowerCase() === cityName.toLowerCase());
  if (!isCityValid) return INVALID_LOCATION;

  return { city: cityName, state: stateName, country: countryName, isValid: true };
}
