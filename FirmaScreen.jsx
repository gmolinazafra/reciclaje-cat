import { useState, useRef } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView,
  StyleSheet, Alert, ActivityIndicator,
} from 'react-native';
import SignatureCanvas from 'react-native-signature-canvas';
import { generarActaPDF, compartirPDF } from '../utils/pdfGenerator';
import { getSettings, getLogo, getNextActaNumber } from '../utils/storage';

export default function FirmaScreen() {
  const sigRef = useRef();
  const [firmada, setFirmada] = useState(false);
  const [firmaData, setFirmaData] = useState(null);
  const [generando, setGenerando] = useState(false);
  const [pdfUri, setPdfUri] = useState(null);

  function handleOK(signature) {
    setFirmaData(signature);
    setFirmada(true);
  }

  function limpiarFirma() {
    sigRef.current?.clearSignature();
    setFirmada(false);
    setFirmaData(null);
  }

  async function handleGenerarPDF() {
    if (!firmada || !firmaData) {
      Alert.alert('Firma requerida', 'Por favor, firma el acta antes de continuar.');
      return;
    }

    setGenerando(true);
    try {
      const [settings, logo, actaNum] = await Promise.all([
        getSettings(),
        getLogo(),
        getNextActaNumber(),
      ]);

      const hoy = new Date().toLocaleDateString('es-ES');

      const datos = {
        settings,
        logo,
        actaNum,
        fecha: hoy,
        vehiculo: {
          marca: 'VOLKSWAGEN',   // TODO: pasar desde VehiculoScreen via context/store
          modelo: 'Golf',
          matricula: '3456 BCF',
          bastidor: '',
          tipo: 'Convencional',
          operario: 'Carlos Martínez',
          fecha: hoy,
        },
        checklist: [
          { nombre: 'Batería (12V)', valor: 'si' },
          { nombre: 'Aceite motor', valor: 'si' },
          { nombre: 'Líquido de frenos', valor: 'si' },
          { nombre: 'Gas AC (refrigerante)', valor: 'si' },
          { nombre: 'Airbag', valor: 'si' },
          { nombre: 'Filtro de aire', valor: 'no' },
          { nombre: 'Catalizador', valor: 'no' },
        ],
        tecnico: {
          gasAC: '320',
          airbagMetodo: 'Retirada',
          esHibrido: false,
          responsableDesconexion: '',
        },
        firma: firmaData,
      };

      const uri = await generarActaPDF(datos);
      setPdfUri(uri);
    } catch (err) {
      Alert.alert('Error', 'No se pudo generar el PDF: ' + err.message);
    } finally {
      setGenerando(false);
    }
  }

  async function handleCompartir() {
    if (!pdfUri) return;
    try {
      await compartirPDF(pdfUri);
    } catch (err) {
      Alert.alert('Error', err.message);
    }
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 40 }}>
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
          onEmpty={() => setFirmada(false)}
          descriptionText=""
          clearText="Borrar"
          confirmText="Confirmar"
          webStyle={`
            .m-signature-pad { box-shadow: none; border: none; }
            .m-signature-pad--body { border: none; }
            .m-signature-pad--footer { background: #f7f7f7; border-top: 0.5px solid #e0e0e0; }
            .m-signature-pad--footer .button { background: #1D6FA4; color: white; border-radius: 6px; }
            .m-signature-pad--footer .button.clear { background: #f2f2f7; color: #666; }
            body { margin: 0; }
          `}
          style={styles.sigCanvas}
        />
      </View>

      {firmada && (
        <View style={styles.firmadaTag}>
          <Text style={styles.firmadaText}>✓ Firma registrada</Text>
        </View>
      )}

      <TouchableOpacity style={styles.clearBtn} onPress={limpiarFirma}>
        <Text style={styles.clearBtnText}>Borrar firma</Text>
      </TouchableOpacity>

      {/* Botón generar PDF */}
      <TouchableOpacity
        style={[styles.genBtn, (!firmada || generando) && styles.genBtnDisabled]}
        onPress={handleGenerarPDF}
        disabled={!firmada || generando}
      >
        {generando ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.genBtnText}>📄 Generar Acta PDF</Text>
        )}
      </TouchableOpacity>

      {/* Botones de compartir */}
      {pdfUri && (
        <View style={styles.shareSection}>
          <Text style={styles.pdfReady}>✓ PDF generado y guardado</Text>
          <TouchableOpacity style={styles.shareBtn} onPress={handleCompartir}>
            <Text style={styles.shareBtnText}>Compartir (WhatsApp / Email / Drive...)</Text>
          </TouchableOpacity>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F2F2F7' },
  legalBox: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 10,
    backgroundColor: '#FAEEDA', borderWidth: 0.5, borderColor: '#EF9F27',
    borderRadius: 10, margin: 16, padding: 14,
  },
  legalIcon: { fontSize: 16 },
  legalText: { flex: 1, fontSize: 12, color: '#4A2800', lineHeight: 18 },
  legalBold: { fontWeight: '700' },
  sectionLabel: {
    fontSize: 11, fontWeight: '600', color: '#6B6B72',
    letterSpacing: 0.5, paddingHorizontal: 16, paddingTop: 4, paddingBottom: 8,
  },
  sigContainer: {
    height: 220, marginHorizontal: 16, borderRadius: 10,
    borderWidth: 0.5, borderColor: '#E0E0E5', overflow: 'hidden',
    backgroundColor: '#fff',
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
  shareSection: { marginHorizontal: 16, marginTop: 12 },
  pdfReady: { fontSize: 13, color: '#3B6D11', fontWeight: '500', textAlign: 'center', marginBottom: 10 },
  shareBtn: {
    backgroundColor: '#25D366', borderRadius: 10,
    padding: 14, alignItems: 'center',
  },
  shareBtnText: { color: '#fff', fontSize: 14, fontWeight: '600' },
});
