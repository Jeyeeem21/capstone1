/**
 * OpenRouteService API Helper
 * 
 * Free geocoding (address autocomplete) and distance calculation.
 * Docs: https://openrouteservice.org/dev/#/api-docs
 */
import { ORS_API_KEY, ORS_BASE_URL } from './config';

// Debounce timer reference
let autocompleteTimer = null;

/**
 * Search for addresses (autocomplete)
 * @param {string} query - Search text (e.g., "Calapan City")
 * @param {object} options - Optional: focus coordinates { lat, lng } to bias results
 * @returns {Promise<Array>} Array of { label, lat, lng }
 */
export const searchAddress = async (query, options = {}) => {
  if (!query || query.length < 3) return [];

  try {
    const params = new URLSearchParams({
      api_key: ORS_API_KEY,
      text: query,
      size: 5,
      'boundary.country': 'PH', // Limit to Philippines
    });

    // Bias results near a focus point (e.g., warehouse location)
    if (options.lat && options.lng) {
      params.append('focus.point.lat', options.lat);
      params.append('focus.point.lon', options.lng);
    }

    const response = await fetch(`${ORS_BASE_URL}/geocode/autocomplete?${params}`);
    if (!response.ok) throw new Error('Address search failed');
    
    const data = await response.json();
    return (data.features || []).map(f => ({
      label: f.properties.label,
      lat: f.geometry.coordinates[1],
      lng: f.geometry.coordinates[0],
      region: f.properties.region,
      locality: f.properties.locality || f.properties.county,
    }));
  } catch (error) {
    console.error('ORS autocomplete error:', error);
    return [];
  }
};

/**
 * Debounced address search — waits 400ms after last keystroke
 * @param {string} query
 * @param {function} callback - Receives results array
 * @param {object} options - Optional focus point
 */
export const debouncedSearchAddress = (query, callback, options = {}) => {
  clearTimeout(autocompleteTimer);
  if (!query || query.length < 3) {
    callback([]);
    return;
  }
  autocompleteTimer = setTimeout(async () => {
    const results = await searchAddress(query, options);
    callback(results);
  }, 400);
};

/**
 * Calculate distance between two coordinates (driving)
 * @param {number} fromLat
 * @param {number} fromLng
 * @param {number} toLat
 * @param {number} toLng
 * @returns {Promise<{ distanceKm: number, durationMin: number }>}
 */
export const calculateDistance = async (fromLat, fromLng, toLat, toLng) => {
  try {
    // ORS uses [longitude, latitude] order
    const response = await fetch(`${ORS_BASE_URL}/v2/directions/driving-hgv`, {
      method: 'POST',
      headers: {
        'Authorization': ORS_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        coordinates: [
          [fromLng, fromLat],
          [toLng, toLat],
        ],
        units: 'km',
      }),
    });

    if (!response.ok) {
      // Fallback to straight-line distance if routing fails
      return { 
        distanceKm: haversineDistance(fromLat, fromLng, toLat, toLng), 
        durationMin: null,
        isEstimate: true,
      };
    }

    const data = await response.json();
    const route = data.routes?.[0]?.summary;
    if (route) {
      return {
        distanceKm: Math.round(route.distance * 100) / 100, // already in km
        durationMin: Math.round(route.duration / 60),
        isEstimate: false,
      };
    }

    throw new Error('No route found');
  } catch (error) {
    console.error('ORS distance error:', error);
    // Fallback to haversine
    return { 
      distanceKm: haversineDistance(fromLat, fromLng, toLat, toLng), 
      durationMin: null,
      isEstimate: true,
    };
  }
};

/**
 * Geocode a full address to coordinates
 * @param {string} address
 * @returns {Promise<{ lat: number, lng: number } | null>}
 */
export const geocodeAddress = async (address) => {
  if (!address) return null;

  try {
    const params = new URLSearchParams({
      api_key: ORS_API_KEY,
      text: address,
      size: 1,
      'boundary.country': 'PH',
    });

    const response = await fetch(`${ORS_BASE_URL}/geocode/search?${params}`);
    if (!response.ok) return null;

    const data = await response.json();
    const feature = data.features?.[0];
    if (feature) {
      return {
        lat: feature.geometry.coordinates[1],
        lng: feature.geometry.coordinates[0],
      };
    }
    return null;
  } catch (error) {
    console.error('ORS geocode error:', error);
    return null;
  }
};

/**
 * Haversine formula — straight-line distance fallback (km)
 */
const haversineDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) ** 2;
  return Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)) * 100) / 100;
};
