import { City, State } from "country-state-city";

export const INVALID_LOCATION = { city: null, state: null, isValid: false };
// LOCALIZED TO INDIA (use geolocation in future, or change to USA)
const COUNTRY_CODE = 'IN';
export const COUNTRY_NAME = 'India';

export function createLocationSlug(city, state) {
  if (!city || !state) return '';
  return `${city}-${state}`.toLowerCase().replace(/\s+/g, '-');
}

export function parseLocationSlug(slug) {
  if (!slug || typeof slug !== 'string') return INVALID_LOCATION;

  // split into at least 2 parts
  const parts = slug.split('-');
  if (parts.length < 2) return INVALID_LOCATION;

  // parse city
  const city = parts[0].charAt(0).toUpperCase() + parts[0].slice(1);
  // parse state
  const state = parts.slice(1).map(part => part.charAt(0).toUpperCase() + part.slice(1)).join(' ');

  // validate state
  const allStates = State.getStatesOfCountry(COUNTRY_CODE);
  const stateObj = allStates.find(s => s.name.toLowerCase() === state.toLowerCase());
  if (!stateObj) return INVALID_LOCATION;

  // validate city
  const allCities = City.getCitiesOfState(COUNTRY_CODE, stateObj.isoCode);
  const isCityValid = allCities.some(c => c.name.toLowerCase() === city.toLowerCase());
  if (!isCityValid) return INVALID_LOCATION;

  return { city: city, state: state, isValid: true };
}
