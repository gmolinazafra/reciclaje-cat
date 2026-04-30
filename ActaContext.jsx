import { createContext, useContext, useReducer } from 'react';

// ── Estado inicial ──────────────────────────────────────────────
const RESIDUOS_INICIALES = [
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

const initialState = {
  // Tab 1 - Vehículo
  vehiculo: {
    marca: '',
    modelo: '',
    matricula: '',
    bastidor: '',
    tipo: 'Convencional',   // 'Convencional' | 'Híbrido' | 'Eléctrico'
    operario: '',
    fecha: new Date().toLocaleDateString('es-ES'),
  },

  // Tab 2 - Checklist
  checklist: RESIDUOS_INICIALES.map((nombre) => ({ nombre, valor: null })),

  // Tab 2 - Datos técnicos
  tecnico: {
    gasAC: '',
    airbagMetodo: 'Retirada',
    esHibrido: false,
    responsableDesconexion: '',
  },

  // Tab 3 - Firma
  firma: null,       // base64 dataURL
  pdfUri: null,      // ruta local del PDF generado
};

// ── Reducer ─────────────────────────────────────────────────────
function actaReducer(state, action) {
  switch (action.type) {

    case 'SET_VEHICULO':
      return { ...state, vehiculo: { ...state.vehiculo, ...action.payload } };

    case 'SET_RESIDUO': {
      const checklist = state.checklist.map((item) =>
        item.nombre === action.payload.nombre
          ? { ...item, valor: action.payload.valor }
          : item
      );
      return { ...state, checklist };
    }

    case 'SET_TECNICO':
      return { ...state, tecnico: { ...state.tecnico, ...action.payload } };

    case 'SET_FIRMA':
      return { ...state, firma: action.payload };

    case 'SET_PDF_URI':
      return { ...state, pdfUri: action.payload };

    case 'RESET':
      return {
        ...initialState,
        vehiculo: {
          ...initialState.vehiculo,
          fecha: new Date().toLocaleDateString('es-ES'),
        },
        checklist: RESIDUOS_INICIALES.map((nombre) => ({ nombre, valor: null })),
      };

    default:
      return state;
  }
}

// ── Context ──────────────────────────────────────────────────────
const ActaContext = createContext(null);

export function ActaProvider({ children }) {
  const [state, dispatch] = useReducer(actaReducer, initialState);

  // Helpers semánticos para no exponer dispatch en bruto
  function setVehiculo(campos) {
    dispatch({ type: 'SET_VEHICULO', payload: campos });
  }

  function setResiduo(nombre, valor) {
    dispatch({ type: 'SET_RESIDUO', payload: { nombre, valor } });
  }

  function setTecnico(campos) {
    dispatch({ type: 'SET_TECNICO', payload: campos });
  }

  function setFirma(dataUrl) {
    dispatch({ type: 'SET_FIRMA', payload: dataUrl });
  }

  function setPdfUri(uri) {
    dispatch({ type: 'SET_PDF_URI', payload: uri });
  }

  function resetActa() {
    dispatch({ type: 'RESET' });
  }

  // Selector: progreso del checklist
  const checklistProgreso = {
    gestionados: state.checklist.filter((i) => i.valor === 'si').length,
    total: state.checklist.length,
  };

  // Selector: acta completada (mínimo vehículo + operario + firma)
  const actaCompleta =
    state.vehiculo.marca &&
    state.vehiculo.matricula &&
    state.vehiculo.operario &&
    state.firma;

  return (
    <ActaContext.Provider
      value={{
        ...state,
        setVehiculo,
        setResiduo,
        setTecnico,
        setFirma,
        setPdfUri,
        resetActa,
        checklistProgreso,
        actaCompleta,
      }}
    >
      {children}
    </ActaContext.Provider>
  );
}

// ── Hook de acceso ───────────────────────────────────────────────
export function useActa() {
  const ctx = useContext(ActaContext);
  if (!ctx) throw new Error('useActa debe usarse dentro de <ActaProvider>');
  return ctx;
}
