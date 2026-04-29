import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, ScrollView, Switch, TextInput, TouchableOpacity, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Signature from 'react-native-signature-canvas';

export default function App() {
  const [tab, setTab] = useState('home');
  const [trabajadores, setTrabajadores] = useState([]);
  const [marcas, setMarcas] = useState(['SEAT', 'RENAULT', 'FORD']);
  const [modelos, setModelos] = useState({'SEAT': ['IBIZA', 'LEON'], 'RENAULT': ['CLIO']});
  
  // Datos del CAT
  const [cat, setCat] = useState({ nombre: '', nima: '', cif: '' });

  // Formulario actual
  const [form, setForm] = useState({
    trabajador: '', marca: '', modelo: '', matricula: '',
    gasSi: false, gramos: '', airbag: 'Retirada'
  });

  const [items, setItems] = useState({
    Bateria: false, AceiteMotor: false, AceiteCaja: false, 
    Anticongelante: false, Frenos: false, FiltroAceite: false,
    FiltroAire: false, FiltroCombustible: false, Catalizador: false
  });

  useEffect(() => { cargarPersistencia(); }, []);

  const cargarPersistencia = async () => {
    const t = await AsyncStorage.getItem('traba');
    const c = await AsyncStorage.getItem('cat');
    if (t) setTrabajadores(JSON.parse(t));
    if (c) setCat(JSON.parse(c));
  };

  const guardarAjustes = async () => {
    await AsyncStorage.setItem('traba', JSON.stringify(trabajadores));
    await AsyncStorage.setItem('cat', JSON.stringify(cat));
    Alert.alert("Guardado", "Datos almacenados en el teléfono");
  };

  return (
    <View style={styles.container}>
      <View style={styles.nav}>
        <Text style={styles.headerTitle}>CAT RECICLAJE</Text>
      </View>

      <ScrollView style={styles.content}>
        {tab === 'home' ? (
          <View>
            <Text style={styles.label}>Operario Responsable:</Text>
            <TextInput placeholder="Nombre del trabajador" style={styles.input} onChangeText={v => setForm({...form, trabajador: v})} />
            
            <Text style={styles.label}>Vehículo:</Text>
            <TextInput placeholder="Matrícula / Bastidor" style={styles.input} onChangeText={v => setForm({...form, matricula: v})} />

            <Text style={styles.section}>CHECKLIST DESCONTAMINACIÓN</Text>
            {Object.keys(items).map(k => (
              <View key={k} style={styles.switchRow}>
                <Text>{k}</Text>
                <Switch value={items[k]} onValueChange={() => setItems({...items, [k]: !items[k]})} />
              </View>
            ))}

            <View style={styles.switchRow}>
              <Text style={{fontWeight: 'bold'}}>Gases Aire Acondicionado</Text>
              <Switch value={form.gasSi} onValueChange={v => setForm({...form, gasSi: v})} />
            </View>
            {form.gasSi && <TextInput placeholder="Gramos de gas" keyboardType="numeric" style={styles.input} onChangeText={v => setForm({...form, gramos: v})} />}

            <Text style={styles.warning}>
              AVISO LEGAL: El trabajador firmante declara bajo su responsabilidad que realizará los trabajos de descontaminación según lo descrito.
            </Text>

            <TouchableOpacity style={styles.btn} onPress={() => setTab('firma')}>
              <Text style={styles.btnText}>PROCEDER A FIRMAR</Text>
            </TouchableOpacity>
          </View>
        ) : tab === 'firma' ? (
          <View style={{height: 500}}>
            <Text style={styles.label}>Firma de {form.trabajador || 'operario'}:</Text>
            <Signature onOK={(img) => Alert.alert("PDF Generado", "Enviando a Drive/WhatsApp...")} descriptionText="Firme aquí" clearText="Borrar" confirmText="Finalizar" />
            <Button title="Volver" onPress={() => setTab('home')} />
          </View>
        ) : (
          <View>
            <Text style={styles.section}>DATOS DEL CAT</Text>
            <TextInput placeholder="Nombre Empresa" style={styles.input} value={cat.nombre} onChangeText={v => setCat({...cat, nombre: v})} />
            <TextInput placeholder="NIMA / NIRI" style={styles.input} value={cat.nima} onChangeText={v => setCat({...cat, nima: v})} />
            <TouchableOpacity style={styles.btnSave} onPress={guardarAjustes}>
              <Text style={styles.btnText}>GUARDAR CONFIGURACIÓN</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      <View style={styles.tabBar}>
        <TouchableOpacity onPress={() => setTab('home')}><Text>NUEVO</Text></TouchableOpacity>
        <TouchableOpacity onPress={() => setTab('config')}><Text>AJUSTES</Text></TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  nav: { padding: 50, backgroundColor: '#1a252f', alignItems: 'center' },
  headerTitle: { color: 'white', fontWeight: 'bold', fontSize: 18 },
  content: { padding: 20 },
  label: { fontSize: 14, fontWeight: 'bold', marginTop: 15 },
  input: { backgroundColor: 'white', padding: 10, borderRadius: 5, marginTop: 5, borderWidth: 1, borderColor: '#ddd' },
  section: { fontWeight: 'bold', fontSize: 16, marginTop: 25, color: '#2c3e50', borderBottomWidth: 1 },
  switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 0.5, borderColor: '#eee' },
  warning: { color: 'red', fontSize: 12, fontStyle: 'italic', marginVertical: 20, textAlign: 'center' },
  btn: { backgroundColor: '#27ae60', padding: 15, borderRadius: 5, alignItems: 'center' },
  btnSave: { backgroundColor: '#2980b9', padding: 15, borderRadius: 5, alignItems: 'center', marginTop: 20 },
  btnText: { color: 'white', fontWeight: 'bold' },
  tabBar: { flexDirection: 'row', justifyContent: 'space-around', padding: 20, backgroundColor: 'white', borderTopWidth: 1, borderColor: '#ddd' }
});
