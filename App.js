import React, { useState } from 'react';
import { StyleSheet, Text, View, ScrollView, TextInput, Switch, TouchableOpacity, Alert } from 'react-native';

export default function App() {
  const [tab, setTab] = useState('home');
  const [form, setForm] = useState({ trabajador: '', matricula: '', marca: '', modelo: '', gas: false, gramos: '' });
  
  // Lista simplificada de tus marcas (luego cargaremos el CSV completo)
  const marcas = ["SEAT", "RENAULT", "PEUGEOT", "FORD", "CITROEN"];

  return (
    <View style={styles.container}>
      {/* Cabecera */}
      <View style={styles.header}>
        <Text style={styles.headerText}>CAT RECICLAJE - VISTA PREVIA</Text>
      </View>

      <ScrollView style={styles.content}>
        {tab === 'home' ? (
          <View>
            <Text style={styles.label}>Operario Responsable</Text>
            <TextInput 
              style={styles.input} 
              placeholder="Ej: Juan Pérez" 
              onChangeText={(v) => setForm({...form, trabajador: v})}
            />

            <Text style={styles.label}>Matrícula / Bastidor</Text>
            <TextInput 
              style={styles.input} 
              placeholder="0000-BBB" 
              onChangeText={(v) => setForm({...form, matricula: v})}
            />

            <Text style={styles.section}>CHECKLIST DESCONTAMINACIÓN</Text>
            {["Batería", "Aceite Motor", "Líquido Frenos", "Filtro Aceite", "Catalizador"].map(item => (
              <View key={item} style={styles.row}>
                <Text>{item}</Text>
                <Switch 
                  value={form[item]} 
                  onValueChange={(v) => setForm({...form, [item]: v})} 
                />
              </View>
            ))}

            <View style={styles.row}>
              <Text style={{fontWeight: 'bold'}}>¿Gases Aire Acondicionado?</Text>
              <Switch value={form.gas} onValueChange={(v) => setForm({...form, gas: v})} />
            </View>

            {form.gas && (
              <TextInput 
                style={styles.input} 
                placeholder="Gramos de gas" 
                keyboardType="numeric"
                onChangeText={(v) => setForm({...form, gramos: v})}
              />
            )}

            <Text style={styles.legal}>
              "El trabajador firmante declara bajo su responsabilidad que realizará los trabajos según normativa."
            </Text>

            <TouchableOpacity style={styles.button} onPress={() => alert("Simulación de Firma y Envío")}>
              <Text style={styles.buttonText}>FIRMAR Y GENERAR PDF</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View>
            <Text style={styles.section}>CONFIGURACIÓN DEL CENTRO</Text>
            <TextInput style={styles.input} placeholder="Nombre del CAT" />
            <TextInput style={styles.input} placeholder="NIMA / NIRI" />
            <TouchableOpacity style={[styles.button, {backgroundColor: '#34495e'}]}>
              <Text style={styles.buttonText}>GUARDAR AJUSTES</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {/* Menú Inferior */}
      <View style={styles.footer}>
        <TouchableOpacity onPress={() => setTab('home')}><Text style={tab === 'home' ? styles.activeTab : null}>INFORME</Text></TouchableOpacity>
        <TouchableOpacity onPress={() => setTab('config')}><Text style={tab === 'config' ? styles.activeTab : null}>AJUSTES</Text></TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0f2f5' },
  header: { padding: 40, backgroundColor: '#1a252f', alignItems: 'center', paddingTop: 60 },
  headerText: { color: 'white', fontWeight: 'bold', fontSize: 18 },
  content: { padding: 20 },
  label: { fontSize: 14, fontWeight: 'bold', marginTop: 15, color: '#34495e' },
  input: { backgroundColor: 'white', padding: 12, borderRadius: 8, marginTop: 5, borderWidth: 1, borderColor: '#dcdde1' },
  section: { fontWeight: 'bold', fontSize: 16, marginTop: 30, marginBottom: 10, color: '#2f3640', borderBottomWidth: 2, borderBottomColor: '#27ae60' },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f1f2f6' },
  legal: { color: '#c0392b', fontSize: 12, fontStyle: 'italic', marginVertical: 25, textAlign: 'center', padding: 10, backgroundColor: '#ffebed', borderRadius: 5 },
  button: { backgroundColor: '#27ae60', padding: 18, borderRadius: 10, alignItems: 'center', marginTop: 10 },
  buttonText: { color: 'white', fontWeight: 'bold', fontSize: 16 },
  footer: { flexDirection: 'row', justifyContent: 'space-around', padding: 25, backgroundColor: 'white', borderTopWidth: 1, borderColor: '#dcdde1' },
  activeTab: { color: '#27ae60', fontWeight: 'bold' }
});
