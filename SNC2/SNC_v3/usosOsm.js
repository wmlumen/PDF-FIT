/**
 * Clasificación de los usos de OpenStreetMap (comercios por tipo, salud, educación, gobierno, etc.) en sectores
 * que usa la Municipalidad: Habilitación de Comercio, liquidaciones y áreas a crear. Puro, sin E/S.
 * `habilitacion: true` = actividad que normalmente necesita patente / habilitación municipal (a verificar).
 */
export const SECTORES = {
  comercio: { nombre: 'Comercio minorista y mayorista', habilitacion: true, color: '#3b82f6' },
  gastronomia: { nombre: 'Gastronomía y ocio nocturno', habilitacion: true, color: '#f97316' },
  alojamiento: { nombre: 'Alojamiento y turismo', habilitacion: true, color: '#ec4899' },
  financiero: { nombre: 'Bancos y servicios financieros', habilitacion: true, color: '#14b8a6' },
  combustible: { nombre: 'Estaciones de servicio', habilitacion: true, color: '#eab308' },
  servicios: { nombre: 'Servicios y oficinas privadas', habilitacion: true, color: '#8b5cf6' },
  industria: { nombre: 'Industria, depósitos y oficios', habilitacion: true, color: '#78716c' },
  salud: { nombre: 'Salud', habilitacion: true, color: '#ef4444' },
  educacion: { nombre: 'Educación', habilitacion: false, color: '#22c55e' },
  gobierno: { nombre: 'Gobierno y servicios públicos', habilitacion: false, color: '#64748b' },
  culto: { nombre: 'Templos y culto', habilitacion: false, color: '#a16207' },
  recreacion: { nombre: 'Deporte, cultura y recreación', habilitacion: false, color: '#06b6d4' },
  otros: { nombre: 'Otros usos', habilitacion: false, color: '#94a3b8' },
};
const A = (lista, sector) => Object.fromEntries(lista.split(' ').map(k => [k, sector]));
const AMENITY = {
  ...A('restaurant bar cafe fast_food pub ice_cream food_court nightclub biergarten casino gambling', 'gastronomia'),
  ...A('bank atm bureau_de_change money_transfer payment_centre', 'financiero'),
  ...A('fuel charging_station', 'combustible'),
  ...A('hospital clinic doctors dentist pharmacy nursing_home', 'salud'),
  ...A('school kindergarten university college language_school driving_school music_school library training', 'educacion'),
  ...A('townhall police fire_station courthouse post_office public_building prison ranger_station social_facility', 'gobierno'),
  ...A('place_of_worship monastery', 'culto'),
  ...A('theatre cinema community_centre arts_centre events_venue stadium', 'recreacion'),
  ...A('car_wash car_rental veterinary marketplace internet_cafe vehicle_inspection funeral_hall studio coworking_space', 'servicios'),
};
/** Mobiliario urbano y elementos sin actividad: no se cargan. */
const IGNORAR = new Set('bench waste_basket waste_disposal toilets drinking_water shelter telephone recycling parking_space bicycle_parking motorcycle_parking clock fountain post_box vending_machine water_point hunting_stand grave_yard bbq loading_dock parking_entrance letter_box give_box'.split(' '));
const EDIF = { ...A('commercial retail supermarket kiosk', 'comercio'), ...A('industrial warehouse factory', 'industria'), hotel: 'alojamiento', office: 'servicios', ...A('hospital', 'salud'), ...A('school university kindergarten college', 'educacion'), ...A('government public civic', 'gobierno'), ...A('church chapel mosque temple cathedral', 'culto') };
const OCIO = new Set('sports_centre stadium fitness_centre swimming_pool pitch park playground water_park dance'.split(' '));

export function etiquetas(other = '') {
  const t = {};
  for (const m of String(other || '').matchAll(/"([^"]+)"=>"((?:[^"\\]|\\.)*)"/g)) t[m[1]] = m[2];
  return t;
}
/** props: propiedades de ogr2ogr (name, other_tags y, en áreas, amenity/shop/...). Devuelve { sector, tipo } o null. */
export function clasificar(props = {}) {
  const t = { ...etiquetas(props.other_tags) };
  for (const k of ['amenity', 'shop', 'office', 'craft', 'tourism', 'leisure', 'building', 'landuse']) if (props[k]) t[k] = props[k];
  if (t.amenity && IGNORAR.has(t.amenity)) return null;
  if (t.amenity && AMENITY[t.amenity]) return { sector: AMENITY[t.amenity], tipo: `amenity=${t.amenity}` };
  if (t.healthcare) return { sector: 'salud', tipo: `healthcare=${t.healthcare}` };
  if (t.shop) return { sector: 'comercio', tipo: `shop=${t.shop}` };
  if (t.office) return { sector: t.office === 'government' ? 'gobierno' : 'servicios', tipo: `office=${t.office}` };
  if (t.craft) return { sector: 'industria', tipo: `craft=${t.craft}` };
  if (t.tourism && /^(hotel|motel|hostel|guest_house|apartment|camp_site|chalet|resort)$/.test(t.tourism)) return { sector: 'alojamiento', tipo: `tourism=${t.tourism}` };
  if (t.tourism && /^(museum|gallery|attraction|zoo|theme_park)$/.test(t.tourism)) return { sector: 'recreacion', tipo: `tourism=${t.tourism}` };
  if (t.leisure && OCIO.has(t.leisure)) return { sector: 'recreacion', tipo: `leisure=${t.leisure}` };
  if (t.building && EDIF[t.building]) return { sector: EDIF[t.building], tipo: `building=${t.building}` };
  if (t.industrial || t.landuse === 'industrial') return { sector: 'industria', tipo: `industrial=${t.industrial || 'si'}` };
  if (t.amenity) return { sector: 'otros', tipo: `amenity=${t.amenity}` };
  return null;
}
/** Texto legible del tipo OSM ("shop=supermarket" → "supermarket"). */
export const tipoCorto = tipo => String(tipo || '').split('=')[1]?.replace(/_/g, ' ') || 'comercio';
