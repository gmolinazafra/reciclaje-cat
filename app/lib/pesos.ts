/** Diccionario de pesos de piezas (kg por unidad) y taras de vehículos (kg). Editables por el usuario en Ajustes en el futuro. */

export const PESOS_PIEZAS: Record<string, number> = {
  motor: 140, "motor completo": 160, "caja de cambios": 45, "caja cambios": 45, cambio: 45, alternador: 6, "motor de arranque": 4,
  arranque: 4, turbo: 8, radiador: 5, "bomba de agua": 2, "bomba inyectora": 6, inyector: 0.4, culata: 25, "colector": 6,
  catalizador: 4, "tubo de escape": 8, escape: 8, puerta: 22, "puerta delantera": 22, "puerta trasera": 20, capo: 15, capó: 15,
  porton: 18, portón: 18, "porton trasero": 18, aleta: 4, paragolpes: 7, parachoques: 7, faro: 2, piloto: 1, retrovisor: 1,
  luna: 12, parabrisas: 12, "luneta": 8, asiento: 15, "asiento delantero": 15, "asiento trasero": 20, volante: 2, airbag: 1.5,
  "cuadro de instrumentos": 1.5, "centralita": 0.6, "ecu": 0.6, "unidad de control": 0.6, "bomba abs": 2, abs: 2,
  llanta: 9, neumatico: 8, neumático: 8, rueda: 17, "rueda completa": 17, amortiguador: 3, "brazo suspension": 3,
  "brazo de suspension": 3, "buje": 4, "palier": 5, "transmision": 5, "transmisión": 5, "pinza de freno": 3, "disco de freno": 6,
  "disco freno": 6, "bomba de freno": 1, "compresor aire acondicionado": 6, compresor: 6, "compresor a/a": 6, "bateria": 18,
  "batería": 18, "deposito": 9, "depósito": 9, "deposito combustible": 9, "puente trasero": 60, "eje trasero": 60, "subchasis": 25,
  "cremallera": 6, "direccion": 6, "dirección": 6, "electroventilador": 3, "ventilador": 3, "climatizador": 3,
  "cinturon": 1, "cinturón": 1, "elevalunas": 2, "cerradura": 0.5, "manilla": 0.2, "antena": 0.2, "radio": 1, "navegador": 1.5,
};

/** Devuelve peso por unidad si hay coincidencia (normalizada) en el diccionario, o null. */
export function pesoDiccionario(pieza: string, descripcion = ""): number | null {
  const n = (pieza + " " + descripcion).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  // Coincidencia más larga primero.
  const claves = Object.keys(PESOS_PIEZAS).sort((a, b) => b.length - a.length);
  for (const k of claves) {
    const kn = k.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    if (n.includes(kn)) return PESOS_PIEZAS[k];
  }
  return null;
}

/** Taras orientativas por segmento (kg). Se usa cuando no hay peso de báscula. */
export const TARAS_VEHICULOS: Record<string, number> = {
  "moto": 180, "ciclomotor": 90, "microcoche": 450, "urbano": 950, "compacto": 1200, "berlina": 1400, "familiar": 1450,
  "suv": 1550, "todoterreno": 1900, "monovolumen": 1500, "furgoneta": 1700, "furgon": 2100, "pickup": 2000, "camion ligero": 3000,
};

const MODELOS: [RegExp, string][] = [
  [/\b(yaris|ibiza|polo|clio|208|207|c3|fiesta|micra|corsa|i20|swift|jazz|fabia|sandero|aygo|c1|107|108|up|ka|twingo|panda|500)\b/i, "urbano"],
  [/\b(golf|leon|astra|focus|megane|308|307|civic|corolla|auris|i30|octavia|ceed|308|bravo|stilo|tipo|a3|serie 1|clase a)\b/i, "compacto"],
  [/\b(passat|mondeo|insignia|laguna|talisman|508|407|accord|avensis|a4|a6|serie 3|serie 5|clase c|clase e|toledo|exeo|superb|mazda6|camry)\b/i, "berlina"],
  [/\b(qashqai|tucson|sportage|tiguan|ateca|3008|2008|5008|kuga|rav4|cr-v|hr-v|x1|x3|q3|q5|kadjar|captur|juke|arona|kona|yeti|karoq|kodiaq|c-hr|duster)\b/i, "suv"],
  [/\b(land cruiser|pajero|montero|patrol|discovery|defender|range rover|x5|x-trail|santa fe|sorento|touareg|cayenne|terrano|vitara|jimny)\b/i, "todoterreno"],
  [/\b(scenic|picasso|touran|sharan|alhambra|galaxy|s-max|zafira|verso|espace|carens|c4 picasso)\b/i, "monovolumen"],
  [/\b(caddy|berlingo|partner|kangoo|doblo|combo|connect|courier|bipper|nemo|fiorino|dokker)\b/i, "furgoneta"],
  [/\b(transit|sprinter|ducato|boxer|jumper|crafter|master|trafic|vivaro|daily|transporter|t5|t6|hiace|nv300|nv400|h1)\b/i, "furgon"],
  [/\b(hilux|navara|ranger|l200|amarok|d-max)\b/i, "pickup"],
];

/** Estima la tara a partir de marca/modelo. Devuelve {kg, segmento}. */
export function taraEstimada(marca: string, modelo: string): { kg: number; segmento: string } {
  const t = `${marca} ${modelo}`;
  for (const [re, seg] of MODELOS) if (re.test(t)) return { kg: TARAS_VEHICULOS[seg], segmento: seg };
  if (/\b(moto|motocicleta|scooter)\b/i.test(t)) return { kg: TARAS_VEHICULOS.moto, segmento: "moto" };
  return { kg: TARAS_VEHICULOS.compacto, segmento: "compacto (por defecto)" };
}
