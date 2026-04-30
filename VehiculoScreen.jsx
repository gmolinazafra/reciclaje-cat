import { useState, useEffect, useMemo } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ScrollView,
} from 'react-native';
import { useActa } from '../context/ActaContext';
import { getOperarios } from '../utils/storage';

const VEHICULOS = [
  { marca: 'AUDI', modelo: 'A1' }, { marca: 'AUDI', modelo: 'A3' }, { marca: 'AUDI', modelo: 'A4' }, { marca: 'AUDI', modelo: 'A6' }, { marca: 'AUDI', modelo: 'Q3' }, { marca: 'AUDI', modelo: 'Q5' },
  { marca: 'BMW', modelo: 'Serie 1' }, { marca: 'BMW', modelo: 'Serie 3' }, { marca: 'BMW', modelo: 'Serie 5' }, { marca: 'BMW', modelo: 'X1' }, { marca: 'BMW', modelo: 'X3' },
  { marca: 'CITROEN', modelo: 'Berlingo' }, { marca: 'CITROEN', modelo: 'C3' }, { marca: 'CITROEN', modelo: 'C4' }, { marca: 'CITROEN', modelo: 'C5' },
  { marca: 'DACIA', modelo: 'Duster' }, { marca: 'DACIA', modelo: 'Logan' }, { marca: 'DACIA', modelo: 'Sandero' },
  { marca: 'FIAT', modelo: '500' }, { marca: 'FIAT', modelo: 'Punto' },
  { marca: 'FORD', modelo: 'Fiesta' }, { marca: 'FORD', modelo: 'Focus' }, { marca: 'FORD', modelo: 'Mondeo' }, { marca: 'FORD', modelo: 'Kuga' },
  { marca: 'HONDA', modelo: 'Civic' }, { marca: 'HONDA', modelo: 'Jazz' }, { marca: 'HONDA', modelo: 'CR-V' },
  { marca: 'HYUNDAI', modelo: 'i10' }, { marca: 'HYUNDAI', modelo: 'i20' }, { marca: 'HYUNDAI', modelo: 'i30' }, { marca: 'HYUNDAI', modelo: 'Tucson' },
  { marca: 'KIA', modelo: 'Ceed' }, { marca: 'KIA', modelo: 'Rio' }, { marca: 'KIA', modelo: 'Sportage' },
  { marca: 'MERCEDES-BENZ', modelo: 'Clase A' }, { marca: 'MERCEDES-BENZ', modelo: 'Clase C' }, { marca: 'MERCEDES-BENZ', modelo: 'Clase E' },
  { marca: 'NISSAN', modelo: 'Juke' }, { marca: 'NISSAN', modelo: 'Micra' }, { marca: 'NISSAN', modelo: 'Qashqai' },
  { marca: 'OPEL', modelo: 'Astra' }, { marca: 'OPEL', modelo: 'Corsa' }, { marca: 'OPEL', modelo: 'Mokka' },
  { marca: 'PEUGEOT', modelo: '208' }, { marca: 'PEUGEOT', modelo: '308' }, { marca: 'PEUGEOT', modelo: '3008' },
  { marca: 'RENAULT', modelo: 'Clio' }, { marca: 'RENAULT', modelo: 'Megane' }, { marca: 'RENAULT', modelo: 'Captur' }, { marca: 'RENAULT', modelo: 'Kadjar' },
  { marca: 'SEAT', modelo: 'Arona' }, { marca: 'SEAT', modelo: 'Ateca' }, { marca: 'SEAT', modelo: 'Ibiza' }, { marca: 'SEAT', modelo: 'Leon' },
  { marca: 'SKODA', modelo: 'Fabia' }, { marca: 'SKODA', modelo: 'Octavia' }, { marca: 'SKODA', modelo: 'Karoq' },
  { marca: 'TOYOTA', modelo: 'Aygo' }, { marca: 'TOYOTA', modelo: 'Corolla' }, { marca: 'TOYOTA', modelo: 'RAV4' }, { marca: 'TOYOTA', modelo: 'Yaris' }, { marca: 'TOYOTA', modelo: 'Prius' }, { marca: 'TOYOTA', modelo: 'C-HR' },
  { marca: 'VOLKSWAGEN', modelo: 'Golf' }, { marca: 'VOLKSWAGEN', modelo: 'Passat' }, { marca: 'VOLKSWAGEN', modelo: 'Polo' }, { marca: 'VOLKSWAGEN', modelo: 'Tiguan' }, { marca: 'VOLKSWAGEN', modelo: 'T-Roc' },
  { marca: 'VOLVO', modelo: 'V60' }, { marca: 'VOLVO', modelo: 'XC40' }, { marca: 'VOLVO', modelo: 'XC60' },
];

const TIPOS = ['Convencional', 'Híbrido', 'Eléctrico'];

export default function VehiculoScreen() {
  const { vehiculo, setVehiculo } = useActa();
  const [query, setQuery] = useState(
    vehiculo.marca ? `${vehiculo.marca} ${vehiculo.modelo}` : ''
  );
  const [showResults, setShowResults] = useState(false);
  const [operarios, setOperarios] = useState([]);

  useEffect(() => {
    getOperarios().then(setOperarios);
  }, []);

  const resultados = useMemo(() => {
    if (!query || query.length < 2) return [];
    const q = query.toLowerCase();
    return VEHICULOS.filter(
      (v) => v.marca.toLowerCase().includes(q) || v.modelo.toLowerCase().includes(q)
    ).slice(0, 8);
  }, [query]);

  function seleccionarVehiculo(v) {
    setVehiculo({ marca: v.marca, modelo: v.modelo });
    setQuery(`${v.marca} ${v.modelo}`);
    setShowResults(false);
  }

  return (
    <ScrollView style={styles.container} keyboardShouldPersistTaps="handled">

      <Text style={styles.sectionLabel}>BÚSQUEDA DE VEHÍCULO</Text>
      <View style={styles.searchBox}>
        <Text style={styles.searchIcon}>🔍</Text>
        <TextInput
          style={styles.searchInput}
          placeholder="Escribe marca o modelo..."
          placeholderTextColor="#999"
          value={query}
          onChangeText={(t) => {
            setQuery(t);
            setShowResults(true);
            if (!t) setVehiculo({ marca: '', modelo: '' });
          }}
          onFocus={() => setShowResults(true)}
        />
        {query.length > 0 && (
          <TouchableOpacity onPress={() => { setQuery(''); setVehiculo({ marca: '', modelo: '' }); setShowResults(false); }}>
            <Text style={{ color: '#999', fontSize: 16 }}>✕</Text>
          </TouchableOpacity>
        )}
      </View>

      {showResults && resultados.length > 0 && (
        <View style={styles.dropdownList}>
          {resultados.map((v, i) => (
            <TouchableOpacity key={i} style={styles.dropdownItem} onPress={() => seleccionarVehiculo(v)}>
              <Text style={styles.dropdownMarca}>{v.marca}</Text>
              <Text style={styles.dropdownModelo}>{v.modelo}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {vehiculo.marca ? (
        <View style={styles.selectedBadge}>
          <Text style={styles.selectedText}>✓ {vehiculo.marca} {vehiculo.modelo}</Text>
        </View>
      ) : null}

      <Text style={styles.sectionLabel}>DATOS DEL VEHÍCULO</Text>
      <View style={styles.fieldGroup}>
        <View style={styles.fieldRow}>
          <Text style={styles.fieldLabel}>Matrícula</Text>
          <TextInput
            style={[styles.fieldInput, { fontFamily: 'monospace', textTransform: 'uppercase' }]}
            placeholder="0000 AAA"
            placeholderTextColor="#bbb"
            value={vehiculo.matricula}
            onChangeText={(v) => setVehiculo({ matricula: v.toUpperCase() })}
            autoCapitalize="characters"
          />
        </View>
        <View style={[styles.fieldRow, styles.fieldRowLast]}>
          <Text style={styles.fieldLabel}>Bastidor VIN</Text>
          <TextInput
            style={[styles.fieldInput, { fontFamily: 'monospace', fontSize: 11 }]}
            placeholder="17 caracteres"
            placeholderTextColor="#bbb"
            value={vehiculo.bastidor}
            onChangeText={(v) => setVehiculo({ bastidor: v.toUpperCase() })}
            maxLength={17}
            autoCapitalize="characters"
          />
        </View>
      </View>

      <Text style={styles.sectionLabel}>TIPO DE VEHÍCULO</Text>
      <View style={styles.chipRow}>
        {TIPOS.map((t) => (
          <TouchableOpacity
            key={t}
            style={[styles.chip, vehiculo.tipo === t && styles.chipSelected]}
            onPress={() => setVehiculo({ tipo: t })}
          >
            <Text style={[styles.chipText, vehiculo.tipo === t && styles.chipTextSelected]}>{t}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.sectionLabel}>OPERARIO Y FECHA</Text>
      <View style={styles.fieldGroup}>
        <View style={styles.fieldRow}>
          <Text style={styles.fieldLabel}>Operario</Text>
          <View style={styles.pickerWrapper}>
            {operarios.length === 0 ? (
              <Text style={{ color: '#999', fontSize: 12 }}>Sin operarios (añade en Ajustes)</Text>
            ) : (
              operarios.map((op, i) => (
                <TouchableOpacity
                  key={i}
                  style={[styles.opChip, vehiculo.operario === op && styles.opChipSelected]}
                  onPress={() => setVehiculo({ operario: op })}
                >
                  <Text style={[styles.opChipText, vehiculo.operario === op && styles.opChipTextSelected]}>
                    {op}
                  </Text>
                </TouchableOpacity>
              ))
            )}
          </View>
        </View>
        <View style={[styles.fieldRow, styles.fieldRowLast]}>
          <Text style={styles.fieldLabel}>Fecha</Text>
          <TextInput
            style={styles.fieldInput}
            value={vehiculo.fecha}
            onChangeText={(v) => setVehiculo({ fecha: v })}
            placeholder="DD/MM/AAAA"
            placeholderTextColor="#bbb"
          />
        </View>
      </View>

      <View style={{ height: 32 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F2F2F7' },
  sectionLabel: {
    fontSize: 11, fontWeight: '600', color: '#6B6B72',
    letterSpacing: 0.5, paddingHorizontal: 16, paddingTop: 20, paddingBottom: 6,
  },
  searchBox: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff',
    marginHorizontal: 16, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10,
    borderWidth: 0.5, borderColor: '#E0E0E5',
  },
  searchIcon: { fontSize: 15, marginRight: 8 },
  searchInput: { flex: 1, fontSize: 14, color: '#1C1C1E' },
  dropdownList: {
    backgroundColor: '#fff', marginHorizontal: 16, borderRadius: 10,
    marginTop: 4, borderWidth: 0.5, borderColor: '#E0E0E5', overflow: 'hidden',
  },
  dropdownItem: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 14, paddingVertical: 11,
    borderBottomWidth: 0.5, borderBottomColor: '#F0F0F5',
  },
  dropdownMarca: { fontSize: 13, fontWeight: '600', color: '#1D6FA4', width: 130 },
  dropdownModelo: { fontSize: 13, color: '#3C3C43' },
  selectedBadge: {
    marginHorizontal: 16, marginTop: 8, backgroundColor: '#E1F5EE',
    borderRadius: 8, padding: 8, borderWidth: 0.5, borderColor: '#1D9E75',
  },
  selectedText: { fontSize: 13, color: '#0F6E56', fontWeight: '500' },
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
  chipRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 16 },
  chip: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20,
    borderWidth: 0.5, borderColor: '#C8C8CC', backgroundColor: '#fff',
  },
  chipSelected: { backgroundColor: '#E6F1FB', borderColor: '#1D6FA4' },
  chipText: { fontSize: 13, color: '#6B6B72' },
  chipTextSelected: { color: '#0C447C', fontWeight: '500' },
  pickerWrapper: { flex: 1, flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  opChip: {
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 16,
    borderWidth: 0.5, borderColor: '#C8C8CC', backgroundColor: '#F2F2F7',
  },
  opChipSelected: { backgroundColor: '#E6F1FB', borderColor: '#1D6FA4' },
  opChipText: { fontSize: 12, color: '#6B6B72' },
  opChipTextSelected: { color: '#0C447C', fontWeight: '500' },
});
