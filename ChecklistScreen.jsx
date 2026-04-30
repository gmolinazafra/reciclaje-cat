import {
  View, Text, TouchableOpacity, ScrollView,
  TextInput, Switch, StyleSheet,
} from 'react-native';
import { useActa } from '../context/ActaContext';

const AIRBAG_METODOS = ['Retirada', 'Detonación', 'Inertización'];

export default function ChecklistScreen() {
  const { checklist, tecnico, checklistProgreso, setResiduo, setTecnico } = useActa();

  const { gestionados, total } = checklistProgreso;
  const progreso = Math.round((gestionados / total) * 100);

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
        {checklist.map((item, i) => (
          <View
            key={item.nombre}
            style={[styles.itemRow, i === checklist.length - 1 && styles.itemRowLast]}
          >
            <Text style={styles.itemName}>{item.nombre}</Text>
            <View style={styles.toggleGroup}>
              <TouchableOpacity
                style={[styles.toggleBtn, item.valor === 'si' && styles.toggleYes]}
                onPress={() => setResiduo(item.nombre, 'si')}
              >
                <Text style={[styles.toggleText, item.valor === 'si' && styles.toggleYesText]}>Sí</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.toggleBtn, item.valor === 'no' && styles.toggleNo]}
                onPress={() => setResiduo(item.nombre, 'no')}
              >
                <Text style={[styles.toggleText, item.valor === 'no' && styles.toggleNoText]}>No</Text>
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
            value={tecnico.gasAC}
            onChangeText={(v) => setTecnico({ gasAC: v })}
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
              style={[styles.chip, tecnico.airbagMetodo === m && styles.chipSelected]}
              onPress={() => setTecnico({ airbagMetodo: m })}
            >
              <Text style={[styles.chipText, tecnico.airbagMetodo === m && styles.chipTextSelected]}>{m}</Text>
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
            value={tecnico.esHibrido}
            onValueChange={(v) => setTecnico({ esHibrido: v })}
            trackColor={{ false: '#E0E0E5', true: '#1D6FA4' }}
            thumbColor="#fff"
          />
        </View>
        {tecnico.esHibrido && (
          <View style={styles.hybridExtra}>
            <Text style={styles.techLabel}>Responsable de la desconexión</Text>
            <TextInput
              style={styles.hybridInput}
              placeholder="Nombre del operario cualificado..."
              placeholderTextColor="#bbb"
              value={tecnico.responsableDesconexion}
              onChangeText={(v) => setTecnico({ responsableDesconexion: v })}
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
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14,
    paddingVertical: 11, borderBottomWidth: 0.5, borderBottomColor: '#F0F0F5',
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
