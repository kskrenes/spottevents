import { City, Country, State } from "country-state-city";

export const INVALID_LOCATION = { city: null, state: null, country: null, isValid: false };

const formatSlugPart = (part) => {
  return part.split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
}

export function createLocationSlug(city, state, country) {
  if (!city || !state || !country) return '';
  return `${city}-${state}-${country}`.toLowerCase().replace(/\s+/g, '-');
}

export function parseLocationSlug(slug) {
  if (!slug || typeof slug !== 'string') return INVALID_LOCATION;

  // split into at least 3 parts
  const parts = slug.split('-');
  if (parts.length < 3) return INVALID_LOCATION;

  // parse city, state, country
  const cityName = formatSlugPart(parts[0]);
  const stateName = formatSlugPart(parts[1]);
  const countryName = formatSlugPart(parts[2]);

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
