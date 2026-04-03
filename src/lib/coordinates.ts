export const CITY_COORDINATES: Record<string, { lat: number; lng: number }> = {
  'القاهرة': { lat: 30.0444, lng: 31.2357 },
  'الإسكندرية': { lat: 31.2001, lng: 29.9187 },
  'شرم الشيخ': { lat: 27.9158, lng: 34.3300 },
  'الغردقة': { lat: 27.2579, lng: 33.8116 },
  'الأقصر': { lat: 25.6872, lng: 32.6396 },
  'أسوان': { lat: 24.0889, lng: 32.8998 },
  'المنصورة': { lat: 31.0409, lng: 31.3785 },
  'طنطا': { lat: 30.7865, lng: 31.0004 },
  'بورسعيد': { lat: 31.2653, lng: 32.3019 },
  'السويس': { lat: 29.9668, lng: 32.5498 },
};

export function getCoordinates(cityName: string) {
  return CITY_COORDINATES[cityName] || null;
}
