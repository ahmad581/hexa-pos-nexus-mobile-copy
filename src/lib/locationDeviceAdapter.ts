// Adapter that provides geolocation permission, position and device id
// Uses browser APIs on web and falls back to expo modules on native

export async function requestGeolocationPermission(): Promise<'granted' | 'denied' | 'undetermined'> {
  if (typeof navigator !== 'undefined' && (navigator as any).permissions) {
    try {
      // @ts-ignore
      const res = await (navigator as any).permissions.query({ name: 'geolocation' });
      return res.state === 'granted' ? 'granted' : (res.state === 'prompt' ? 'undetermined' : 'denied');
    } catch (e) {
      return 'undetermined';
    }
  }

  // Native: dynamic import to avoid bundling expo-location into web build
  try {
    const Location = await import('expo-location');
    const { status } = await Location.requestForegroundPermissionsAsync();
    return (status || 'denied') as 'granted' | 'denied' | 'undetermined';
  } catch (e) {
    return 'denied';
  }
}

export async function getCurrentPosition(): Promise<{ coords: { latitude: number; longitude: number } }> {
  if (typeof navigator !== 'undefined' && navigator.geolocation) {
    return new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(
        (pos) => resolve({ coords: { latitude: pos.coords.latitude, longitude: pos.coords.longitude } }),
        (err) => reject(err),
        { enableHighAccuracy: false, maximumAge: 10000, timeout: 10000 }
      );
    });
  }

  // Native: use expo-location
  const Location = await import('expo-location');
  const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
  return { coords: { latitude: pos.coords.latitude, longitude: pos.coords.longitude } };
}

export async function getDeviceId(): Promise<string> {
  if (typeof navigator !== 'undefined') {
    try {
      // Use a stable identifier for the browser session (userAgent fallback)
      const existing = typeof window !== 'undefined' ? window.localStorage.getItem('device_id') : null;
      if (existing) return existing;
      const id = `${navigator.userAgent}-${Math.random().toString(36).slice(2, 9)}`;
      try { if (typeof window !== 'undefined') window.localStorage.setItem('device_id', id); } catch {}
      return id;
    } catch (e) {
      return 'web-unknown';
    }
  }

  // Native: dynamic import expo-device
  try {
    const Device = await import('expo-device');
    // fallback to modelName or other identifier
    return (Device && (Device as any).osInternalBuildId) || (Device as any).modelName || 'native-unknown';
  } catch (e) {
    return 'native-unknown';
  }
}
