import { useState, useEffect, useCallback } from 'react';
import { getSettings, saveSettings, getLogo, saveLogo, getOperarios, saveOperarios } from '../utils/storage';

export function useSettings() {
  const [settings, setSettings] = useState({ nombre: '', cif: '', nima: '', direccion: '' });
  const [logo, setLogo] = useState(null);
  const [operarios, setOperarios] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const [s, l, o] = await Promise.all([getSettings(), getLogo(), getOperarios()]);
      setSettings(s);
      setLogo(l);
      setOperarios(o);
      setLoading(false);
    })();
  }, []);

  const updateSettings = useCallback(async (newSettings) => {
    setSettings(newSettings);
    await saveSettings(newSettings);
  }, []);

  const updateLogo = useCallback(async (uri) => {
    setLogo(uri);
    await saveLogo(uri);
  }, []);

  const addOperario = useCallback(async (nombre) => {
    const nueva = [...operarios, nombre.trim()];
    setOperarios(nueva);
    await saveOperarios(nueva);
  }, [operarios]);

  const removeOperario = useCallback(async (index) => {
    const nueva = operarios.filter((_, i) => i !== index);
    setOperarios(nueva);
    await saveOperarios(nueva);
  }, [operarios]);

  return { settings, logo, operarios, loading, updateSettings, updateLogo, addOperario, removeOperario };
}
