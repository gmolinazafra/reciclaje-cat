import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, ScrollView, Switch, TextInput, Button, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Signature from 'react-native-signature-canvas';

export default function App() {
  const [view, setView] = useState('checklist'); // 'checklist' o 'config'
  
  // Datos del CAT
  const [catData, setCatData] = useState({ nombre: '', nima: '', cif: '' });
  const [trabajadores, setTrabajadores] = useState([]);
  const [nuevoTraba, setNuevoTraba] = useState('');

  // Checklist
  const [form, setForm] = useState({
    trabajador: '', marca: '', modelo: '', matricula: '',
    gases: false, gramosGas: '', airbag: 'Retirada'
  });

  const [residuos, setResiduos] = useState({
    Bateria: false, AceiteMotor: false, AceiteCaja: false,
    FiltroAire: false, Combustible: false, Catalizador: false
  });

  // Cargar datos al iniciar
  useEffect(() => {
    cargarDatos();
  }, []);

  const cargarDatos = async () => {
    const savedCat = await AsyncStorage.getItem('catData');
    const savedTraba = await AsyncStorage.getItem('trabajadores');
    if (savedCat) setCatData(JSON.parse(savedCat));
    if (savedTraba) setTrabajadores(JSON.parse(savedTraba));
  };

  const guardarConfig = async () => {
    await AsyncStorage.setItem('catData', JSON.stringify(catData));
    await AsyncStorage.setItem('trabajadores', JSON.stringify(trabajadores));
    Alert.alert("Éxito", "Configuración guardada localmente");
  };

  const toggleResiduo = (key) => {
    setResiduos({ ...residuos, [key]: !residuos[key] });
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>CAT RECICLAJE PRO</Text>
      </View>

      <ScrollView style={styles.body}>
        {view === 'checklist' ? (
          <>
            <Text style={styles.sectionTitle}>IDENTIFICACIÓN</Text>
            <TextInput 
              placeholder="Matrícula / Bastidor" 
              style={styles.input} 
              onChangeText={(t) => setForm({...form, matricula: t})}
            />
            
            <Text style={styles.sectionTitle}>CHECKLIST (SÍ/NO)</Text>
            {Object.keys(residuos).map(r => (
              <View key={r} style={styles.row}>
                <Text>{r}</Text>
                <Switch value={residuos[r]} onValueChange={() => toggleResiduo(r)} />
              </View>
            ))}

            <Text style={styles.legalText}>
              ADVERTENCIA: El trabajador firmante declara bajo su responsabilidad que realizará los trabajos según normativa.
            </Text>
            
            <Button title="FINALIZAR Y FIRMAR" color="green" onPress={() => Alert.alert("Abrir Firma", "Aquí se abre el panel de firma")} />
          </>
        ) : (
          <>
            <Text style={styles.sectionTitle}>AJUSTES CAT</Text>
            <TextInput placeholder="Nombre CAT" style={styles.input} value={catData.nombre} onChangeText={t => setCatData({...catData, nombre: t})} />
            <TextInput placeholder="NIMA / NIRI" style={styles.input} value={catData.nima} onChangeText={t => setCatData({...catData, nima: t})} />
            
            <Text style={styles.sectionTitle}>TRABAJADORES</Text>
            <TextInput 
              placeholder="Nuevo trabajador" 
              style={styles.input} 
              value={nuevoTraba} 
              onChangeText={setNuevoTraba}
              onSubmitEditing={() => {
                setTrabajadores([...trabajadores, nuevoTraba]);
                setNuevoTraba('');
              }}
            />
            {trabajadores.map((t, i) => <Text key={i}>- {t}</Text>)}
            
            <Button title="GUARDAR TODO" onPress={guardarConfig} />
          </>
        )}
      </ScrollView>

      <View style={styles.footer}>
        <Button title="Checklist" onPress={() => setView('checklist')} />
        <Button title="Configuración" onPress={() => setView('config')} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: { padding: 40, backgroundColor: '#2c3e50', alignItems: 'center' },
  title: { color: '#fff', fontSize: 20, fontWeight: 'bold' },
  body: { padding: 20 },
  sectionTitle: { fontWeight: 'bold', marginTop: 20, marginBottom: 10, borderBottomWidth: 1 },
  input: { borderBottomWidth: 1, padding: 10, marginBottom: 10 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10 },
  legalText: { fontStyle: 'italic', color: 'red', marginVertical: 20, textAlign: 'center' },
  footer: { flexDirection: 'row', justifyContent: 'space-around', padding: 20, borderTopWidth: 1 }
});
