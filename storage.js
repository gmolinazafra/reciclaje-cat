import AsyncStorage from '@react-native-async-storage/async-storage';

const KEYS = {
  CAT_SETTINGS: '@desconcat:cat_settings',
  OPERARIOS: '@desconcat:operarios',
  CAT_LOGO: '@desconcat:cat_logo',
  ACTA_COUNTER: '@desconcat:acta_counter',
};

// --- Ajustes del CAT ---
export async function getSettings() {
  try {
    const raw = await AsyncStorage.getItem(KEYS.CAT_SETTINGS);
    return raw
      ? JSON.parse(raw)
      : { nombre: '', cif: '', nima: '', direccion: '' };
  } catch {
    return { nombre: '', cif: '', nima: '', direccion: '' };
  }
}

export async function saveSettings(settings) {
  await AsyncStorage.setItem(KEYS.CAT_SETTINGS, JSON.stringify(settings));
}

// --- Logo del CAT (URI base64 o path local) ---
export async function getLogo() {
  try {
    return await AsyncStorage.getItem(KEYS.CAT_LOGO);
  } catch {
    return null;
  }
}

export async function saveLogo(uri) {
  await AsyncStorage.setItem(KEYS.CAT_LOGO, uri);
}

// --- Operarios ---
export async function getOperarios() {
  try {
    const raw = await AsyncStorage.getItem(KEYS.OPERARIOS);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export async function saveOperarios(lista) {
  await AsyncStorage.setItem(KEYS.OPERARIOS, JSON.stringify(lista));
}

// --- Contador de actas (número correlativo) ---
export async function getNextActaNumber() {
  try {
    const raw = await AsyncStorage.getItem(KEYS.ACTA_COUNTER);
    const current = raw ? parseInt(raw, 10) : 0;
    const next = current + 1;
    await AsyncStorage.setItem(KEYS.ACTA_COUNTER, String(next));
    return next;
  } catch {
    return 1;
  }
}
