import { useState, useEffect, useMemo } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ScrollView,
} from 'react-native';
import { useActa } from '../context/ActaContext';
import { getOperarios } from '../utils/storage';
import { VEHICULOS, MARCAS } from '../data/vehiculos_db';

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

  // Búsqueda inteligente: filtra por marca O modelo
  const resultados = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (q.length < 2) return [];

    const palabras = q.split(' ').filter(Boolean);

    return VEHICULOS.filter((v) => {
      const texto = `${v.marca} ${v.modelo}`.toLowerCase();
      return palabras.every((p) => texto.includes(p));
    }).slice(0, 10);
  }, [query]);

  // Al seleccionar un resultado
  function seleccionarVehiculo(v) {
    setVehiculo({ marca: v.marca, modelo: v.modelo });
    setQuery(`${v.marca} — ${v.modelo}`);
    setShowResults(false);
  }

  function limpiarBusqueda() {
    setQuery('');
    setVehiculo({ marca: '', modelo: '' });
    setShowResults(false);
  }

  return (
    <ScrollView style={styles.container} keyboardShouldPersistTaps="handled">

      <Text style={styles.sectionLabel}>BÚSQUEDA DE VEHÍCULO</Text>
      <Text style={styles.hint}>Base de datos: {VEHICULOS.length} modelos de {MARCAS.length} marcas</Text>

      <View style={styles.searchBox}>
        <Text style={styles.searchIcon}>🔍</Text>
        <TextInput
          style={styles.searchInput}
          placeholder="Ej: Golf, Clio, Toyota Yaris..."
          placeholderTextColor="#999"
          value={query}
          onChangeText={(t) => {
            setQuery(t);
            setShowResults(true);
            if (!t) setVehiculo({ marca: '', modelo: '' });
          }}
          onFocus={() => query.length >= 2 && setShowResults(true)}
          autoCorrect={false}
        />
        {query.length > 0 && (
          <TouchableOpacity onPress={limpiarBusqueda}>
            <Text style={{ color: '#999', fontSize: 18, lineHeight: 20 }}>✕</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Resultados del buscador */}
      {showResults && resultados.length > 0 && (
        <View style={styles.dropdownList}>
          {resultados.map((v, i) => (
            <TouchableOpacity
              key={`${v.marca}-${v.modelo}-${i}`}
              style={[styles.dropdownItem, i === resultados.length - 1 && { borderBottomWidth: 0 }]}
              onPress={() => seleccionarVehiculo(v)}
            >
              <Text style={styles.dropdownMarca}>{v.marca}</Text>
              <Text style={styles.dropdownModelo}>{v.modelo}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {showResults && query.length >= 2 && resultados.length === 0 && (
        <View style={styles.noResults}>
          <Text style={styles.noResultsText}>Sin resultados para "{query}"</Text>
        </View>
      )}

      {/* Vehículo seleccionado */}
      {vehiculo.marca ? (
        <View style={styles.selectedBadge}>
          <Text style={styles.selectedText}>✓  {vehiculo.marca}  —  {vehiculo.modelo}</Text>
        </View>
      ) : null}

      {/* Matrícula y bastidor */}
      <Text style={styles.sectionLabel}>DATOS DEL VEHÍCULO</Text>
      <View style={styles.fieldGroup}>
        <View style={styles.fieldRow}>
          <Text style={styles.fieldLabel}>Matrícula</Text>
          <TextInput
            style={[styles.fieldInput, { fontFamily: 'monospace', textTransform: 'uppercase', fontSize: 15, letterSpacing: 1 }]}
            placeholder="0000 AAA"
            placeholderTextColor="#bbb"
            value={vehiculo.matricula}
            onChangeText={(v) => setVehiculo({ matricula: v.toUpperCase() })}
            autoCapitalize="characters"
            autoCorrect={false}
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
            autoCorrect={false}
          />
        </View>
      </View>

      {/* Tipo de vehículo */}
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

      {/* Operario y fecha */}
      <Text style={styles.sectionLabel}>OPERARIO Y FECHA</Text>
      <View style={styles.fieldGroup}>
        <View style={[styles.fieldRow, { alignItems: 'flex-start', paddingTop: 14 }]}>
          <Text style={[styles.fieldLabel, { paddingTop: 2 }]}>Operario</Text>
          <View style={styles.pickerWrapper}>
            {operarios.length === 0 ? (
              <Text style={{ color: '#999', fontSize: 12 }}>
                Sin operarios — añade en Ajustes
              </Text>
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

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F2F2F7' },
  sectionLabel: {
    fontSize: 11, fontWeight: '600', color: '#6B6B72',
    letterSpacing: 0.5, paddingHorizontal: 16, paddingTop: 20, paddingBottom: 6,
  },
  hint: {
    fontSize: 11, color: '#AEAEB2', paddingHorizontal: 16, paddingBottom: 6,
  },
  searchBox: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff',
    marginHorizontal: 16, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 11,
    borderWidth: 0.5, borderColor: '#E0E0E5',
  },
  searchIcon: { fontSize: 15, marginRight: 8 },
  searchInput: { flex: 1, fontSize: 14, color: '#1C1C1E' },
  dropdownList: {
    backgroundColor: '#fff', marginHorizontal: 16, borderRadius: 10,
    marginTop: 4, borderWidth: 0.5, borderColor: '#E0E0E5', overflow: 'hidden',
    maxHeight: 320,
  },
  dropdownItem: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 12,
    borderBottomWidth: 0.5, borderBottomColor: '#F0F0F5', gap: 8,
  },
  dropdownMarca: { fontSize: 12, fontWeight: '600', color: '#1D6FA4', width: 110 },
  dropdownModelo: { fontSize: 13, color: '#3C3C43', flex: 1 },
  noResults: {
    backgroundColor: '#fff', marginHorizontal: 16, borderRadius: 10,
    marginTop: 4, padding: 14, borderWidth: 0.5, borderColor: '#E0E0E5',
  },
  noResultsText: { fontSize: 13, color: '#AEAEB2', textAlign: 'center' },
  selectedBadge: {
    marginHorizontal: 16, marginTop: 8, backgroundColor: '#E1F5EE',
    borderRadius: 8, padding: 10, borderWidth: 0.5, borderColor: '#1D9E75',
  },
  selectedText: { fontSize: 13, color: '#0F6E56', fontWeight: '500', textAlign: 'center' },
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
