/**
 * Degrees decimal minutes, 3 dp on minutes — the format aeromedical crews
 * expect for LZ coordinates. e.g. `42°15.756'N 071°48.137'W`
 *
 * Pure (no config access) so client components can use it.
 */
export function toDDM(lat: number, lng: number): string {
  const part = (value: number, isLat: boolean) => {
    const hemisphere = isLat ? (value >= 0 ? "N" : "S") : value >= 0 ? "E" : "W";
    const abs = Math.abs(value);
    let deg = Math.floor(abs);
    let min = (abs - deg) * 60;
    // Guard against 59.9995 rounding up to 60.000
    if (Number(min.toFixed(3)) >= 60) {
      deg += 1;
      min = 0;
    }
    const degStr = String(deg).padStart(isLat ? 2 : 3, "0");
    const minStr = min.toFixed(3).padStart(6, "0");
    return `${degStr}°${minStr}'${hemisphere}`;
  };
  return `${part(lat, true)} ${part(lng, false)}`;
}
