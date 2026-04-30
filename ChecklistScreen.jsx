import { useState } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView,
  TextInput, Switch, StyleSheet,
} from 'react-native';

const RESIDUOS = [
  'Batería (12V)',
  'Batería alta tensión',
  'Aceite caja cambios y transfer',
  'Aceite motor',
  'Líquido de dirección',
  'Líquido de frenos',
  'Líquido anticongelante',
  'Filtro de aire',
  'Filtro de aceite',
  'Filtro de combustible',
  'Gas AC (refrigerante)',
  'Catalizador',
  'Airbag',
  'Vidrio',
  'Parachoques',
  'Salpicaderos',
  'Neumáticos',
  'Cables',
];

const AIRBAG_METODOS = ['Retirada', 'Detonación', 'Inertización'];

export default function ChecklistScreen() {
  const [valores, setValores] = useState(
    Object.fromEntries(RESIDUOS.map((r) => [r, null]))
  );
  const [gasAC, setGasAC] = useState('');
  const [airbagMetodo, setAirbagMetodo] = useState('Retirada');
  const [esHibrido, setEsHibrido] = useState(false);
  const [responsableDesconexion, setResponsableDesconexion] = useState('');

  const gestionados = Object.values(valores).filter((v) => v === 'si').length;
  const total = RESIDUOS.length;
  const progreso = Math.round((gestionados / total) * 100);

  function setValor(residuo, val) {
    setValores((prev) => ({ ...prev, [residuo]: val }));
  }

  return (
    <ScrollView style={styles.container}>
      {/* Barra de progreso */}
      <View style={styles.progressContainer}>
        <View style={styles.progressHeader}>
          <Text style={styles.progressLabel}>Residuos gestionados</Text>
          <Text style={styles.progressCount}>{gestionados}/{total}</Text>
        </View>
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: `${progreso}%` }]} />
        </View>
      </View>

      <Text style={styles.sectionLabel}>RESIDUOS Y COMPONENTES</Text>
      <View style={styles.fieldGroup}>
        {RESIDUOS.map((residuo, i) => (
          <View
            key={residuo}
            style={[styles.itemRow, i === RESIDUOS.length - 1 && styles.itemRowLast]}
          >
            <Text style={styles.itemName}>{residuo}</Text>
            <View style={styles.toggleGroup}>
              <TouchableOpacity
                style={[styles.toggleBtn, valores[residuo] === 'si' && styles.toggleYes]}
                onPress={() => setValor(residuo, 'si')}
              >
                <Text style={[styles.toggleText, valores[residuo] === 'si' && styles.toggleYesText]}>
                  Sí
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.toggleBtn, valores[residuo] === 'no' && styles.toggleNo]}
                onPress={() => setValor(residuo, 'no')}
              >
                <Text style={[styles.toggleText, valores[residuo] === 'no' && styles.toggleNoText]}>
                  No
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}
      </View>

      <Text style={styles.sectionLabel}>DATOS TÉCNICOS</Text>

      {/* Gas AC */}
      <View style={styles.techCard}>
        <Text style={styles.techLabel}>Gramos de Gas AC (refrigerante)</Text>
        <View style={styles.numRow}>
          <TextInput
            style={styles.numInput}
            placeholder="0"
            placeholderTextColor="#bbb"
            keyboardType="numeric"
            value={gasAC}
            onChangeText={setGasAC}
          />
          <Text style={styles.numUnit}>gramos</Text>
        </View>
      </View>

      {/* Airbag */}
      <View style={styles.techCard}>
        <Text style={styles.techLabel}>Método de gestión del Airbag</Text>
        <View style={styles.chipRow}>
          {AIRBAG_METODOS.map((m) => (
            <TouchableOpacity
              key={m}
              style={[styles.chip, airbagMetodo === m && styles.chipSelected]}
              onPress={() => setAirbagMetodo(m)}
            >
              <Text style={[styles.chipText, airbagMetodo === m && styles.chipTextSelected]}>{m}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Híbrido / Eléctrico */}
      <View style={styles.techCard}>
        <View style={styles.switchRow}>
          <View>
            <Text style={styles.switchLabel}>Vehículo híbrido o eléctrico</Text>
            <Text style={styles.switchSub}>Requiere desconexión batería AT</Text>
          </View>
          <Switch
            value={esHibrido}
            onValueChange={setEsHibrido}
            trackColor={{ false: '#E0E0E5', true: '#1D6FA4' }}
            thumbColor="#fff"
          />
        </View>
        {esHibrido && (
          <View style={styles.hybridExtra}>
            <Text style={styles.techLabel}>Responsable de la desconexión</Text>
            <TextInput
              style={styles.hybridInput}
              placeholder="Nombre del operario cualificado..."
              placeholderTextColor="#bbb"
              value={responsableDesconexion}
              onChangeText={setResponsableDesconexion}
            />
          </View>
        )}
      </View>

      <View style={{ height: 32 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F2F2F7' },
  progressContainer: {
    backgroundColor: '#fff', margin: 16, borderRadius: 10,
    padding: 14, borderWidth: 0.5, borderColor: '#E0E0E5',
  },
  progressHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  progressLabel: { fontSize: 13, color: '#6B6B72' },
  progressCount: { fontSize: 13, fontWeight: '600', color: '#1D6FA4' },
  progressBar: { height: 6, backgroundColor: '#E0E0E5', borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: '#1D9E75', borderRadius: 3 },
  sectionLabel: {
    fontSize: 11, fontWeight: '600', color: '#6B6B72',
    letterSpacing: 0.5, paddingHorizontal: 16, paddingTop: 8, paddingBottom: 6,
  },
  fieldGroup: {
    backgroundColor: '#fff', marginHorizontal: 16, borderRadius: 10,
    borderWidth: 0.5, borderColor: '#E0E0E5', overflow: 'hidden',
  },
  itemRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 14, paddingVertical: 11,
    borderBottomWidth: 0.5, borderBottomColor: '#F0F0F5',
  },
  itemRowLast: { borderBottomWidth: 0 },
  itemName: { flex: 1, fontSize: 13, color: '#1C1C1E' },
  toggleGroup: {
    flexDirection: 'row', borderWidth: 0.5, borderColor: '#E0E0E5',
    borderRadius: 8, overflow: 'hidden',
  },
  toggleBtn: { paddingHorizontal: 12, paddingVertical: 6, backgroundColor: '#F2F2F7' },
  toggleYes: { backgroundColor: '#EAF3DE' },
  toggleNo: { backgroundColor: '#FCEBEB' },
  toggleText: { fontSize: 12, color: '#999' },
  toggleYesText: { color: '#3B6D11', fontWeight: '600' },
  toggleNoText: { color: '#A32D2D', fontWeight: '600' },
  techCard: {
    backgroundColor: '#fff', marginHorizontal: 16, borderRadius: 10,
    borderWidth: 0.5, borderColor: '#E0E0E5', padding: 14, marginBottom: 10,
  },
  techLabel: { fontSize: 12, color: '#6B6B72', marginBottom: 10 },
  numRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  numInput: {
    width: 90, borderWidth: 0.5, borderColor: '#E0E0E5', borderRadius: 8,
    paddingHorizontal: 12, paddingVertical: 8, fontSize: 16, color: '#1C1C1E',
    fontWeight: '600', textAlign: 'center',
  },
  numUnit: { fontSize: 13, color: '#6B6B72' },
  chipRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  chip: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20,
    borderWidth: 0.5, borderColor: '#C8C8CC', backgroundColor: '#F2F2F7',
  },
  chipSelected: { backgroundColor: '#E6F1FB', borderColor: '#1D6FA4' },
  chipText: { fontSize: 13, color: '#6B6B72' },
  chipTextSelected: { color: '#0C447C', fontWeight: '500' },
  switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  switchLabel: { fontSize: 14, color: '#1C1C1E', fontWeight: '500' },
  switchSub: { fontSize: 11, color: '#8E8E93', marginTop: 2 },
  hybridExtra: { marginTop: 14, paddingTop: 14, borderTopWidth: 0.5, borderTopColor: '#F0F0F5' },
  hybridInput: {
    borderWidth: 0.5, borderColor: '#E0E0E5', borderRadius: 8,
    paddingHorizontal: 12, paddingVertical: 10, fontSize: 13, color: '#1C1C1E',
  },
});
