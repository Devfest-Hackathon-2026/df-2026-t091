// Local timezone time-of-day atmosphere (22:00 -> Night mode with stars, moon, glowing trails & campfires).

export function getLocalTimeInfo(overrideHour = null, now = new Date()) {
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || 'Local';
  const realHour = now.getHours() + now.getMinutes() / 60;
  const hour = overrideHour != null ? overrideHour : realHour;

  const hh = String(overrideHour != null ? Math.floor(overrideHour) : now.getHours()).padStart(2, '0');
  const mm = String(overrideHour != null ? Math.round((overrideHour % 1) * 60) : now.getMinutes()).padStart(2, '0');
  const timeStr = `${hh}:${mm}`;

  let phase = 'Day';
  let icon = '☀️';
  if (hour >= 20 || hour < 5) {
    phase = 'Night';
    icon = '🌙';
  } else if (hour >= 5 && hour < 7.5) {
    phase = 'Dawn';
    icon = '🌅';
  } else if (hour >= 17 && hour < 20) {
    phase = 'Sunset';
    icon = '🌇';
  }

  const isNight = hour >= 19.5 || hour < 5.5;
  const isSunset = hour >= 17 && hour < 19.5;
  const isDawn = hour >= 5.5 && hour < 7.5;

  if (isNight) {
    return {
      tz,
      timeStr,
      hour,
      phase,
      icon,
      isNight: true,
      showSky: false,
      bgColor: '#070d1b',
      fogColor: '#0a1326',
      sunPosition: [-18, 22, -14], // moonlight direction
      sunColor: '#9ec5ff',
      sunIntensity: 0.55,
      ambientIntensity: 0.22,
      hemiSky: '#2c4675',
      hemiGround: '#0a121d',
      hemiIntensity: 0.35,
      cloudColor: '#253554',
      cloudOpacity: 0.45,
      campfireBoost: 2.2,
    };
  }

  if (isSunset || isDawn) {
    return {
      tz,
      timeStr,
      hour,
      phase,
      icon,
      isNight: false,
      showSky: true,
      turbidity: 9,
      rayleigh: 2.6,
      bgColor: isDawn ? '#e8b9a8' : '#d88c6f',
      fogColor: isDawn ? '#e5c1b8' : '#d2937e',
      sunPosition: [isDawn ? -55 : 55, 6, 30],
      sunColor: '#ffad66',
      sunIntensity: 1.35,
      ambientIntensity: 0.42,
      hemiSky: '#ffc49b',
      hemiGround: '#2a3328',
      hemiIntensity: 0.5,
      cloudColor: '#ffd1b3',
      cloudOpacity: 0.78,
      campfireBoost: 1.4,
    };
  }

  return {
    tz,
    timeStr,
    hour,
    phase,
    icon,
    isNight: false,
    showSky: true,
    turbidity: 5,
    rayleigh: 1.35,
    bgColor: '#b8d4ee',
    fogColor: '#c9dff2',
    sunPosition: [55, 28, 35],
    sunColor: '#fff6e8',
    sunIntensity: 1.75,
    ambientIntensity: 0.5,
    hemiSky: '#e3f1ff',
    hemiGround: '#2c442e',
    hemiIntensity: 0.55,
    cloudColor: '#ffffff',
    cloudOpacity: 0.85,
    campfireBoost: 1.0,
  };
}
