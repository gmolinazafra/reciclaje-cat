import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system';

/**
 * Genera el HTML del acta de descontaminación
 */
function buildHtml({ settings, logo, vehiculo, checklist, tecnico, firma, actaNum, fecha }) {
  const logoTag = logo
    ? `<img src="${logo}" style="height:60px;max-width:120px;object-fit:contain;" />`
    : `<div style="width:80px;height:60px;background:#E6F1FB;display:flex;align-items:center;justify-content:center;border-radius:6px;font-weight:bold;color:#1D6FA4;font-size:12px;">CAT</div>`;

  const residuosRows = checklist
    .map(
      (item) => `
      <tr>
        <td style="padding:5px 8px;border-bottom:1px solid #eee;">${item.nombre}</td>
        <td style="padding:5px 8px;border-bottom:1px solid #eee;text-align:center;">
          <span style="color:${item.valor === 'si' ? '#3B6D11' : '#A32D2D'};font-weight:600;">
            ${item.valor === 'si' ? '✓ Sí' : '✗ No'}
          </span>
        </td>
      </tr>`
    )
    .join('');

  const airbagInfo = tecnico.airbagMetodo
    ? `<br><strong>Método airbag:</strong> ${tecnico.airbagMetodo}`
    : '';

  const hibridoInfo =
    tecnico.esHibrido && tecnico.responsableDesconexion
      ? `<br><strong>Responsable desconexión batería AT:</strong> ${tecnico.responsableDesconexion}`
      : '';

  const firmaTag = firma
    ? `<img src="${firma}" style="height:80px;max-width:240px;border:1px solid #ddd;border-radius:4px;" />`
    : '<p style="color:#aaa;font-style:italic;">Sin firma</p>';

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: Arial, sans-serif; font-size: 12px; color: #222; padding: 32px; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; padding-bottom: 16px; border-bottom: 2px solid #1D6FA4; margin-bottom: 20px; }
    .company-info { text-align: right; font-size: 11px; color: #555; line-height: 1.7; }
    .company-name { font-size: 14px; font-weight: bold; color: #1D6FA4; }
    .acta-title { font-size: 16px; font-weight: bold; color: #1D6FA4; margin-bottom: 20px; text-align: center; border: 1px solid #1D6FA4; padding: 8px; border-radius: 4px; }
    .section { margin-bottom: 18px; }
    .section-title { font-size: 12px; font-weight: bold; background: #E6F1FB; color: #0C447C; padding: 5px 8px; border-left: 3px solid #1D6FA4; margin-bottom: 8px; }
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
    .field { background: #f7f8fa; border-radius: 4px; padding: 6px 10px; }
    .field-label { font-size: 10px; color: #888; }
    .field-value { font-size: 12px; font-weight: 600; color: #222; }
    table { width: 100%; border-collapse: collapse; font-size: 11px; }
    th { background: #1D6FA4; color: white; padding: 6px 8px; text-align: left; font-size: 11px; }
    .legal { background: #FAEEDA; border: 1px solid #BA7517; border-radius: 4px; padding: 10px 12px; font-size: 10px; color: #444; line-height: 1.6; margin-bottom: 18px; }
    .legal strong { color: #BA7517; }
    .firma-section { display: flex; justify-content: space-between; align-items: flex-end; margin-top: 24px; padding-top: 16px; border-top: 1px solid #ddd; }
    .firma-block { text-align: center; }
    .firma-label { font-size: 10px; color: #888; margin-top: 6px; }
    .footer { margin-top: 30px; font-size: 9px; color: #aaa; text-align: center; border-top: 1px solid #eee; padding-top: 10px; }
  </style>
</head>
<body>

  <div class="header">
    ${logoTag}
    <div class="company-info">
      <div class="company-name">${settings.nombre || 'Centro Autorizado de Tratamiento'}</div>
      ${settings.cif ? `CIF: ${settings.cif}<br>` : ''}
      ${settings.nima ? `NIMA/NIRI: ${settings.nima}<br>` : ''}
      ${settings.direccion ? settings.direccion : ''}
    </div>
  </div>

  <div class="acta-title">ACTA DE DESCONTAMINACIÓN Nº ${String(actaNum).padStart(4, '0')} — ${fecha}</div>

  <div class="section">
    <div class="section-title">DATOS DEL VEHÍCULO</div>
    <div class="grid">
      <div class="field">
        <div class="field-label">Marca y Modelo</div>
        <div class="field-value">${vehiculo.marca} ${vehiculo.modelo}</div>
      </div>
      <div class="field">
        <div class="field-label">Matrícula</div>
        <div class="field-value">${vehiculo.matricula || '—'}</div>
      </div>
      <div class="field">
        <div class="field-label">Bastidor (VIN)</div>
        <div class="field-value">${vehiculo.bastidor || '—'}</div>
      </div>
      <div class="field">
        <div class="field-label">Tipo de vehículo</div>
        <div class="field-value">${vehiculo.tipo || 'Convencional'}</div>
      </div>
      <div class="field">
        <div class="field-label">Operario</div>
        <div class="field-value">${vehiculo.operario || '—'}</div>
      </div>
      <div class="field">
        <div class="field-label">Fecha</div>
        <div class="field-value">${vehiculo.fecha || fecha}</div>
      </div>
    </div>
  </div>

  <div class="section">
    <div class="section-title">CHECKLIST DE RESIDUOS</div>
    <table>
      <thead>
        <tr>
          <th>Residuo / Componente</th>
          <th style="width:80px;text-align:center;">Gestionado</th>
        </tr>
      </thead>
      <tbody>${residuosRows}</tbody>
    </table>
  </div>

  <div class="section">
    <div class="section-title">DATOS TÉCNICOS</div>
    <div class="field" style="line-height:2;">
      <strong>Gas AC (refrigerante):</strong> ${tecnico.gasAC || 0} gramos
      ${airbagInfo}
      ${hibridoInfo}
    </div>
  </div>

  <div class="legal">
    <strong>⚠ Declaración legal:</strong> El trabajador firmante declara bajo su responsabilidad que realizará los trabajos de descontaminación según lo descrito en este formulario y la normativa vigente.
  </div>

  <div class="firma-section">
    <div class="firma-block">
      ${firmaTag}
      <div class="firma-label">Firma del operario: ${vehiculo.operario || '—'}</div>
    </div>
    <div style="text-align:right;font-size:10px;color:#888;">
      Fecha y hora de emisión:<br>
      <strong style="color:#222;">${new Date().toLocaleString('es-ES')}</strong>
    </div>
  </div>

  <div class="footer">
    Documento generado por DesconCAT · ${settings.nombre || ''} · ${settings.nima ? 'NIMA ' + settings.nima : ''}
  </div>

</body>
</html>`;
}

/**
 * Genera el PDF y lo guarda en el sistema de archivos local.
 * Devuelve la URI del archivo generado.
 */
export async function generarActaPDF(datos) {
  const html = buildHtml(datos);
  const { uri } = await Print.printToFileAsync({ html, base64: false });

  // Renombrar a un nombre descriptivo
  const fecha = datos.fecha?.replace(/\//g, '-') || 'acta';
  const nombreArchivo = `Acta_${String(datos.actaNum).padStart(4, '0')}_${datos.vehiculo.matricula || 'VEH'}_${fecha}.pdf`;
  const destino = FileSystem.documentDirectory + nombreArchivo;

  await FileSystem.moveAsync({ from: uri, to: destino });
  return destino;
}

/**
 * Comparte el PDF generado (WhatsApp, Email, Drive, etc.)
 */
export async function compartirPDF(uri) {
  const disponible = await Sharing.isAvailableAsync();
  if (!disponible) {
    throw new Error('La función de compartir no está disponible en este dispositivo.');
  }
  await Sharing.shareAsync(uri, {
    mimeType: 'application/pdf',
    dialogTitle: 'Compartir Acta de Descontaminación',
    UTI: 'com.adobe.pdf',
  });
}
