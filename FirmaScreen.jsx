import { useRef, useState } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView,
  StyleSheet, Alert, ActivityIndicator,
} from 'react-native';
import SignatureCanvas from 'react-native-signature-canvas';
import { useActa } from '../context/ActaContext';
import { generarActaPDF, compartirPDF } from '../utils/pdfGenerator';
import { getSettings, getLogo, getNextActaNumber } from '../utils/storage';

export default function FirmaScreen() {
  const { vehiculo, checklist, tecnico, firma, setFirma, pdfUri, setPdfUri, resetActa, actaCompleta } = useActa();
  const sigRef = useRef();
  const [generando, setGenerando] = useState(false);

  function handleOK(signature) {
    setFirma(signature);
  }

  function limpiarFirma() {
    sigRef.current?.clearSignature();
    setFirma(null);
    setPdfUri(null);
  }

  async function handleGenerarPDF() {
    if (!firma) {
      Alert.alert('Firma requerida', 'Por favor, firma el acta antes de continuar.');
      return;
    }
    if (!vehiculo.marca || !vehiculo.matricula) {
      Alert.alert('Datos incompletos', 'Completa al menos la marca y la matrícula del vehículo.');
      return;
    }
    if (!vehiculo.operario) {
      Alert.alert('Operario requerido', 'Selecciona un operario en la pestaña Vehículo.');
      return;
    }

    setGenerando(true);
    try {
      const [settings, logo, actaNum] = await Promise.all([
        getSettings(),
        getLogo(),
        getNextActaNumber(),
      ]);

      const uri = await generarActaPDF({
        settings,
        logo,
        actaNum,
        fecha: vehiculo.fecha || new Date().toLocaleDateString('es-ES'),
        vehiculo,
        checklist,
        tecnico,
        firma,
      });

      setPdfUri(uri);
    } catch (err) {
      Alert.alert('Error al generar PDF', err.message);
    } finally {
      setGenerando(false);
    }
  }

  async function handleCompartir() {
    if (!pdfUri) return;
    try {
      await compartirPDF(pdfUri);
    } catch (err) {
      Alert.alert('Error al compartir', err.message);
    }
  }

  function handleNuevaActa() {
    Alert.alert(
      'Nueva acta',
      '¿Quieres empezar una nueva acta? Se borrarán todos los datos actuales.',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Nueva acta', style: 'destructive', onPress: () => { sigRef.current?.clearSignature(); resetActa(); } },
      ]
    );
  }

  // Resumen del vehículo para mostrar en la cabecera
  const resumenVehiculo = vehiculo.marca
    ? `${vehiculo.marca} ${vehiculo.modelo} · ${vehiculo.matricula || 'Sin matrícula'}`
    : 'Sin vehículo seleccionado';

  const residuosGestionados = checklist.filter((i) => i.valor === 'si').length;

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 40 }}>

      {/* Resumen del acta */}
      <View style={styles.summaryCard}>
        <Text style={styles.summaryTitle}>Resumen del acta</Text>
        <Text style={styles.summaryLine}>🚗 {resumenVehiculo}</Text>
        <Text style={styles.summaryLine}>👤 {vehiculo.operario || 'Sin operario'}</Text>
        <Text style={styles.summaryLine}>📋 {residuosGestionados} residuos gestionados</Text>
        {tecnico.gasAC ? <Text style={styles.summaryLine}>❄️ Gas AC: {tecnico.gasAC}g</Text> : null}
        {tecnico.esHibrido ? <Text style={styles.summaryLine}>⚡ Híbrido/Eléctrico — Desconexión: {tecnico.responsableDesconexion || 'sin asignar'}</Text> : null}
      </View>

      {/* Aviso legal */}
      <View style={styles.legalBox}>
        <Text style={styles.legalIcon}>⚠️</Text>
        <Text style={styles.legalText}>
          <Text style={styles.legalBold}>Declaración legal obligatoria: </Text>
          El trabajador firmante declara bajo su responsabilidad que realizará los trabajos
          de descontaminación según lo descrito en este formulario y la normativa vigente.
        </Text>
      </View>

      <Text style={styles.sectionLabel}>FIRMA DEL OPERARIO</Text>
      <View style={styles.sigContainer}>
        <SignatureCanvas
          ref={sigRef}
          onOK={handleOK}
          onEmpty={() => setFirma(null)}
          descriptionText=""
          clearText="Borrar"
          confirmText="Confirmar"
          webStyle={`
            .m-signature-pad { box-shadow: none; border: none; }
            .m-signature-pad--body { border: none; }
            .m-signature-pad--footer { background: #f7f7f7; border-top: 0.5px solid #e0e0e0; }
            .m-signature-pad--footer .button { background: #1D6FA4; color: white; border-radius: 6px; }
            .m-signature-pad--footer .button.clear { background: #f2f2f7; color: #555; }
            body { margin: 0; }
          `}
          style={styles.sigCanvas}
        />
      </View>

      {firma && (
        <View style={styles.firmadaTag}>
          <Text style={styles.firmadaText}>✓ Firma registrada</Text>
        </View>
      )}

      <TouchableOpacity style={styles.clearBtn} onPress={limpiarFirma}>
        <Text style={styles.clearBtnText}>Borrar firma</Text>
      </TouchableOpacity>

      {/* Botón generar PDF */}
      <TouchableOpacity
        style={[styles.genBtn, (!firma || generando) && styles.genBtnDisabled]}
        onPress={handleGenerarPDF}
        disabled={!firma || generando}
      >
        {generando
          ? <ActivityIndicator color="#fff" />
          : <Text style={styles.genBtnText}>📄  Generar Acta PDF</Text>
        }
      </TouchableOpacity>

      {/* Compartir */}
      {pdfUri && (
        <View style={styles.shareSection}>
          <Text style={styles.pdfReady}>✓ PDF generado correctamente</Text>
          <TouchableOpacity style={styles.shareBtn} onPress={handleCompartir}>
            <Text style={styles.shareBtnText}>📤  Compartir (WhatsApp / Email / Drive...)</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.newActaBtn} onPress={handleNuevaActa}>
            <Text style={styles.newActaBtnText}>+ Nueva acta</Text>
          </TouchableOpacity>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F2F2F7' },
  summaryCard: {
    backgroundColor: '#fff', margin: 16, borderRadius: 10,
    padding: 14, borderWidth: 0.5, borderColor: '#E0E0E5', gap: 4,
  },
  summaryTitle: { fontSize: 12, fontWeight: '600', color: '#1D6FA4', marginBottom: 6 },
  summaryLine: { fontSize: 13, color: '#3C3C43', lineHeight: 20 },
  legalBox: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 10,
    backgroundColor: '#FAEEDA', borderWidth: 0.5, borderColor: '#EF9F27',
    borderRadius: 10, marginHorizontal: 16, marginBottom: 8, padding: 14,
  },
  legalIcon: { fontSize: 16 },
  legalText: { flex: 1, fontSize: 12, color: '#4A2800', lineHeight: 18 },
  legalBold: { fontWeight: '700' },
  sectionLabel: {
    fontSize: 11, fontWeight: '600', color: '#6B6B72',
    letterSpacing: 0.5, paddingHorizontal: 16, paddingBottom: 8,
  },
  sigContainer: {
    height: 220, marginHorizontal: 16, borderRadius: 10,
    borderWidth: 0.5, borderColor: '#E0E0E5', overflow: 'hidden', backgroundColor: '#fff',
  },
  sigCanvas: { flex: 1 },
  firmadaTag: {
    marginHorizontal: 16, marginTop: 8, backgroundColor: '#EAF3DE',
    borderRadius: 8, padding: 8, borderWidth: 0.5, borderColor: '#1D9E75',
  },
  firmadaText: { fontSize: 13, color: '#3B6D11', fontWeight: '500', textAlign: 'center' },
  clearBtn: {
    marginHorizontal: 16, marginTop: 8, padding: 10,
    borderWidth: 0.5, borderColor: '#C8C8CC', borderRadius: 8,
    backgroundColor: '#fff', alignItems: 'center',
  },
  clearBtnText: { fontSize: 13, color: '#6B6B72' },
  genBtn: {
    marginHorizontal: 16, marginTop: 16, backgroundColor: '#1D6FA4',
    borderRadius: 10, padding: 16, alignItems: 'center',
  },
  genBtnDisabled: { backgroundColor: '#C8C8CC' },
  genBtnText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  shareSection: { marginHorizontal: 16, marginTop: 12, gap: 10 },
  pdfReady: { fontSize: 13, color: '#3B6D11', fontWeight: '500', textAlign: 'center' },
  shareBtn: {
    backgroundColor: '#25D366', borderRadius: 10,
    padding: 14, alignItems: 'center',
  },
  shareBtnText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  newActaBtn: {
    borderWidth: 0.5, borderColor: '#1D6FA4', borderRadius: 10,
    padding: 12, alignItems: 'center', backgroundColor: '#E6F1FB',
  },
  newActaBtnText: { color: '#1D6FA4', fontSize: 14, fontWeight: '500' },
});
