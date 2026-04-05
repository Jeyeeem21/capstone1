/**
 * Geocoding & Routing Helper
 * 
 * Uses Nominatim (OpenStreetMap) for geocoding — accurate PH barangay-level data.
 * Uses OpenRouteService for driving route distance calculation.
 */
import { ORS_API_KEY, ORS_BASE_URL } from './config';

const NOMINATIM_URL = 'https://nominatim.openstreetmap.org';

// Debounce timer reference
let autocompleteTimer = null;

/**
 * Search for addresses (autocomplete) via Nominatim
 * @param {string} query - Search text (e.g., "Cantil, Roxas, Oriental Mindoro")
 * @param {object} options - Optional: focus coordinates { lat, lng } to bias results
 * @returns {Promise<Array>} Array of { label, lat, lng }
 */
export const searchAddress = async (query, options = {}) => {
  if (!query || query.length < 3) return [];

  try {
    const params = new URLSearchParams({
      q: query,
      format: 'json',
      limit: 5,
      countrycodes: 'PH',
      addressdetails: 1,
    });

    // Bias results near a viewbox around the focus point
    if (options.lat && options.lng) {
      const offset = 0.5; // ~55km bias radius
      params.append('viewbox', `${options.lng - offset},${options.lat + offset},${options.lng + offset},${options.lat - offset}`);
      params.append('bounded', 0);
    }

    const response = await fetch(`${NOMINATIM_URL}/search?${params}`, {
      headers: { 'User-Agent': 'KJPRiceMillApp/1.0' },
    });
    if (!response.ok) throw new Error('Address search failed');
    
    const data = await response.json();
    return (data || []).map(item => {
      const addr = item.address || {};
      return {
        label: item.display_name,
        lat: parseFloat(item.lat),
        lng: parseFloat(item.lon),
        region: addr.state || addr.region || '',
        locality: addr.city || addr.town || addr.municipality || addr.county || '',
      };
    });
  } catch (error) {
    console.error('Nominatim autocomplete error:', error);
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
  }, 600);
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
    const response = await fetch(`${ORS_BASE_URL}/v2/directions/driving-car`, {
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
 * Geocode a full address to coordinates via Nominatim.
 * Tries the full address first, then progressively removes the most specific
 * part (sitio, purok, etc.) so barangay/municipality-level addresses still resolve.
 * @param {string} address
 * @param {number} retries - Network retries per attempt
 * @returns {Promise<{ lat: number, lng: number } | null>}
 */
export const geocodeAddress = async (address, retries = 2) => {
  if (!address) return null;

  // Build an array of address variants from most specific to least
  const variants = [address.trim()];
  const parts = address.split(/[,]+/).map(p => p.trim()).filter(Boolean);
  // Progressively drop the first segment (most specific: sitio, purok, etc.)
  for (let i = 1; i < parts.length; i++) {
    variants.push(parts.slice(i).join(', '));
  }

  for (const variant of variants) {
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const params = new URLSearchParams({
          q: variant,
          format: 'json',
          limit: 1,
          countrycodes: 'PH',
        });

        const response = await fetch(`${NOMINATIM_URL}/search?${params}`, {
          headers: { 'User-Agent': 'KJPRiceMillApp/1.0' },
        });
        if (!response.ok) break; // skip to next variant

        const data = await response.json();
        if (data?.[0]) {
          return {
            lat: parseFloat(data[0].lat),
            lng: parseFloat(data[0].lon),
          };
        }
        break; // no result for this variant, try next
      } catch (error) {
        console.error(`Nominatim geocode error (variant: "${variant}", attempt ${attempt + 1}/${retries + 1}):`, error);
        if (attempt < retries) {
          await new Promise(r => setTimeout(r, 1000 * (attempt + 1)));
          continue;
        }
      }
    }
  }
  return null;
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
