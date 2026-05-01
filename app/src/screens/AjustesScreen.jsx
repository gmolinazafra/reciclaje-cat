import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  ScrollView, StyleSheet, Alert, Image,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useSettings } from '../hooks/useSettings';

export default function AjustesScreen() {
  const {
    settings, logo, operarios, loading,
    updateSettings, updateLogo, addOperario, removeOperario,
  } = useSettings();

  const [nuevoOperario, setNuevoOperario] = useState('');

  async function seleccionarLogo() {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permiso necesario', 'Necesitamos acceso a tu galería para cargar el logo.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.7,
      base64: true,
    });
    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      const uri = asset.base64
        ? `data:image/jpeg;base64,${asset.base64}`
        : asset.uri;
      await updateLogo(uri);
    }
  }

  async function handleAddOperario() {
    const nombre = nuevoOperario.trim();
    if (!nombre) return;
    await addOperario(nombre);
    setNuevoOperario('');
  }

  async function handleRemoveOperario(index) {
    Alert.alert(
      'Eliminar operario',
      `¿Seguro que quieres eliminar a ${operarios[index]}?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Eliminar', style: 'destructive', onPress: () => removeOperario(index) },
      ]
    );
  }

  if (loading) return <View style={styles.loading}><Text>Cargando...</Text></View>;

  return (
    <ScrollView style={styles.container}>
      {/* Datos del CAT */}
      <Text style={styles.sectionLabel}>DATOS DEL CAT</Text>
      <View style={styles.fieldGroup}>
        {[
          { label: 'Nombre CAT', key: 'nombre', placeholder: 'Ej: AutoDescon CAT S.L.' },
          { label: 'CIF', key: 'cif', placeholder: 'B-12345678', mono: true },
          { label: 'NIMA / NIRI', key: 'nima', placeholder: '01234567', mono: true },
          { label: 'Dirección', key: 'direccion', placeholder: 'C/ Industrial 14, Zaragoza' },
        ].map(({ label, key, placeholder, mono }, i, arr) => (
          <View
            key={key}
            style={[styles.fieldRow, i === arr.length - 1 && styles.fieldRowLast]}
          >
            <Text style={styles.fieldLabel}>{label}</Text>
            <TextInput
              style={[styles.fieldInput, mono && { fontFamily: 'monospace' }]}
              value={settings[key]}
              onChangeText={(val) => updateSettings({ ...settings, [key]: val })}
              placeholder={placeholder}
              placeholderTextColor="#bbb"
            />
          </View>
        ))}
      </View>

      {/* Logo */}
      <Text style={styles.sectionLabel}>LOGO DEL CAT</Text>
      <View style={styles.logoCard}>
        <View style={styles.logoPreview}>
          {logo ? (
            <Image source={{ uri: logo }} style={styles.logoImage} resizeMode="contain" />
          ) : (
            <View style={styles.logoPlaceholder}>
              <Text style={styles.logoPlaceholderText}>Sin logo</Text>
            </View>
          )}
        </View>
        <View style={styles.logoActions}>
          <TouchableOpacity style={styles.logoBtn} onPress={seleccionarLogo}>
            <Text style={styles.logoBtnText}>📷 Cargar desde galería</Text>
          </TouchableOpacity>
          {logo && (
            <TouchableOpacity
              style={[styles.logoBtn, styles.logoBtnDanger]}
              onPress={() => updateLogo(null)}
            >
              <Text style={[styles.logoBtnText, { color: '#A32D2D' }]}>Eliminar logo</Text>
            </TouchableOpacity>
          )}
        </View>
        <Text style={styles.logoHint}>El logo aparecerá en la cabecera del acta PDF</Text>
      </View>

      {/* Operarios */}
      <Text style={styles.sectionLabel}>OPERARIOS</Text>
      <View style={styles.fieldGroup}>
        {operarios.length === 0 && (
          <View style={styles.emptyRow}>
            <Text style={styles.emptyText}>No hay operarios. Añade el primero.</Text>
          </View>
        )}
        {operarios.map((op, i) => {
          const initials = op.split(' ').slice(0, 2).map((w) => w[0]).join('').toUpperCase();
          return (
            <View key={i} style={[styles.workerRow, i === operarios.length - 1 && { borderBottomWidth: 0 }]}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{initials}</Text>
              </View>
              <Text style={styles.workerName}>{op}</Text>
              <TouchableOpacity style={styles.deleteBtn} onPress={() => handleRemoveOperario(i)}>
                <Text style={styles.deleteBtnText}>×</Text>
              </TouchableOpacity>
            </View>
          );
        })}

        {/* Añadir operario */}
        <View style={[styles.fieldRow, { borderBottomWidth: 0, gap: 8 }]}>
          <TextInput
            style={[styles.fieldInput, { flex: 1, borderWidth: 0.5, borderColor: '#E0E0E5', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 7 }]}
            placeholder="Nombre del operario..."
            placeholderTextColor="#bbb"
            value={nuevoOperario}
            onChangeText={setNuevoOperario}
            onSubmitEditing={handleAddOperario}
            returnKeyType="done"
          />
          <TouchableOpacity style={styles.addBtn} onPress={handleAddOperario}>
            <Text style={styles.addBtnText}>+ Añadir</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Acerca de */}
      <Text style={styles.sectionLabel}>ACERCA DE</Text>
      <View style={styles.fieldGroup}>
        <View style={styles.fieldRow}>
          <Text style={styles.fieldLabel}>Versión</Text>
          <Text style={styles.fieldValue}>DesconCAT 1.0.0</Text>
        </View>
        <View style={[styles.fieldRow, styles.fieldRowLast]}>
          <Text style={styles.fieldLabel}>Normativa</Text>
          <Text style={[styles.fieldValue, { fontSize: 11 }]}>Real Decreto 265/2021 · GVERD</Text>
        </View>
      </View>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F2F2F7' },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  sectionLabel: {
    fontSize: 11, fontWeight: '600', color: '#6B6B72',
    letterSpacing: 0.5, paddingHorizontal: 16, paddingTop: 20, paddingBottom: 6,
  },
  fieldGroup: {
    backgroundColor: '#fff', marginHorizontal: 16, borderRadius: 10,
    borderWidth: 0.5, borderColor: '#E0E0E5', overflow: 'hidden',
  },
  fieldRow: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14,
    paddingVertical: 12, borderBottomWidth: 0.5, borderBottomColor: '#F0F0F5',
  },
  fieldRowLast: { borderBottomWidth: 0 },
  fieldLabel: { fontSize: 13, color: '#6B6B72', width: 90 },
  fieldInput: { flex: 1, fontSize: 13, color: '#1C1C1E' },
  fieldValue: { fontSize: 13, color: '#3C3C43' },
  logoCard: {
    backgroundColor: '#fff', marginHorizontal: 16, borderRadius: 10,
    borderWidth: 0.5, borderColor: '#E0E0E5', padding: 14,
  },
  logoPreview: { alignItems: 'center', marginBottom: 12 },
  logoImage: { width: 120, height: 60 },
  logoPlaceholder: {
    width: 120, height: 60, backgroundColor: '#F2F2F7',
    borderRadius: 8, alignItems: 'center', justifyContent: 'center',
    borderWidth: 0.5, borderColor: '#E0E0E5', borderStyle: 'dashed',
  },
  logoPlaceholderText: { fontSize: 12, color: '#C0C0C8' },
  logoActions: { gap: 8 },
  logoBtn: {
    borderWidth: 0.5, borderColor: '#1D6FA4', borderRadius: 8,
    padding: 10, alignItems: 'center', backgroundColor: '#E6F1FB',
  },
  logoBtnDanger: { borderColor: '#E24B4A', backgroundColor: '#FCEBEB' },
  logoBtnText: { fontSize: 13, color: '#1D6FA4', fontWeight: '500' },
  logoHint: { fontSize: 11, color: '#8E8E93', marginTop: 10, textAlign: 'center' },
  emptyRow: { padding: 16, alignItems: 'center' },
  emptyText: { fontSize: 13, color: '#C0C0C8' },
  workerRow: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14,
    paddingVertical: 10, borderBottomWidth: 0.5, borderBottomColor: '#F0F0F5', gap: 10,
  },
  avatar: {
    width: 34, height: 34, borderRadius: 17,
    backgroundColor: '#E6F1FB', alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { fontSize: 13, fontWeight: '600', color: '#0C447C' },
  workerName: { flex: 1, fontSize: 13, color: '#1C1C1E' },
  deleteBtn: {
    width: 26, height: 26, borderRadius: 13,
    backgroundColor: '#FCEBEB', alignItems: 'center', justifyContent: 'center',
  },
  deleteBtnText: { fontSize: 18, color: '#E24B4A', lineHeight: 22 },
  addBtn: {
    backgroundColor: '#1D6FA4', borderRadius: 8,
    paddingHorizontal: 14, paddingVertical: 8,
  },
  addBtnText: { color: '#fff', fontSize: 13, fontWeight: '500' },
});
