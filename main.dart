import 'package:flutter/material.dart';

void main() => runApp(MaterialApp(home: AppReciclajeCAT()));

class AppReciclajeCAT extends StatefulWidget {
  @override
  _AppReciclajeCATState createState() => _AppReciclajeCATState();
}

class _AppReciclajeCATState extends State<AppReciclajeCAT> {
  // --- 1. DATOS DEL VEHÍCULO Y OPERARIO ---
  String? marcaSel;
  String? modeloSel;
  String? trabajadorSel;
  final TextEditingController gasController = TextEditingController();

  // Listas de ejemplo (Aquí pondrás tus tablas)
  List<String> marcas = ["Seat", "Renault", "Peugeot"];
  Map<String, List<String>> modelos = {
    "Seat": ["Ibiza", "León"],
    "Renault": ["Clio", "Megane"],
  };
  List<String> trabajadores = ["Operario 1", "Operario 2"];

  // --- 2. CHECKLIST (Todos Sí/No) ---
  Map<String, bool> peligrosos = {
    "Batería": false, "Aceite Motor": false, "Aceite Caja": false,
    "Liq. Dirección": false, "Anticongelante": false, "Filtro Aire": false,
    "Filtro Aceite": false, "Filtro Combustible": false, "Combustible": false,
  };

  Map<String, bool> noPeligrosos = {
    "Catalizador": false, "Vidrio": false, "Salpicadero": false,
    "Parachoques": false, "Neumáticos": false, "Cables": false,
  };

  // --- 3. LÓGICA AIRBAGS ---
  String? airbagOpcion; // Retirada, Detonación o Inertización

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text("RECICLAJE CAT v1.0"), backgroundColor: Colors.blueGrey),
      body: SingleChildScrollView(
        padding: EdgeInsets.all(16),
        child: Column(
          children: [
            // SECCIÓN DATOS
            _buildCard("Identificación", [
              _buildDropdown("Marca", marcas, marcaSel, (v) => setState(() { marcaSel = v; modeloSel = null; })),
              _buildDropdown("Modelo", modelos[marcaSel] ?? [], modeloSel, (v) => setState(() => modeloSel = v)),
              _buildDropdown("Trabajador", trabajadores, trabajadorSel, (v) => setState(() => trabajadorSel = v)),
            ]),

            // SECCIÓN PELIGROSOS
            _buildCard("Residuos Peligrosos", [
              ...peligrosos.keys.map((k) => SwitchListTile(
                title: Text(k), value: peligrosos[k]!, 
                onChanged: (v) => setState(() => peligrosos[k] = v),
              )),
              TextField(
                controller: gasController,
                decoration: InputDecoration(labelText: "Gramos Gas Aire Acondicionado"),
                keyboardType: TextInputType.number,
              ),
            ]),

            // SECCIÓN AIRBAGS
            _buildCard("Gestión Airbags", [
              _buildRadio("Retirada"), _buildRadio("Detonación"), _buildRadio("Inertización"),
            ]),

            // SECCIÓN NO PELIGROSOS
            _buildCard("Residuos No Peligrosos", [
              ...noPeligrosos.keys.map((k) => SwitchListTile(
                title: Text(k), value: noPeligrosos[k]!,
                onChanged: (v) => setState(() => noPeligrosos[k] = v),
              )),
            ]),

            // BOTÓN FINAL
            SizedBox(height: 20),
            ElevatedButton(
              style: ElevatedButton.styleFrom(minimumSize: Size(double.infinity, 50)),
              onPressed: () => _mostrarFirma(), 
              child: Text("FIRMAR Y FINALIZAR"),
            ),
          ],
        ),
      ),
    );
  }

  // --- COMPONENTES VISUALES ---
  Widget _buildCard(String titulo, List<Widget> hijos) {
    return Card(
      margin: EdgeInsets.only(bottom: 15),
      child: Padding(
        padding: EdgeInsets.all(10),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text(titulo, style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
          ...hijos
        ]),
      ),
    );
  }

  Widget _buildDropdown(String label, List<String> items, String? val, Function(String?) onCh) {
    return DropdownButtonFormField<String>(
      decoration: InputDecoration(labelText: label),
      value: val, items: items.map((i) => DropdownMenuItem(value: i, child: Text(i))).toList(),
      onChanged: onCh,
    );
  }

  Widget _buildRadio(String label) {
    return RadioListTile(
      title: Text(label), value: label, groupValue: airbagOpcion,
      onChanged: (v) => setState(() => airbagOpcion = v as String),
    );
  }

  void _mostrarFirma() {
    // Aquí se abriría el panel de firma táctil
    showDialog(context: context, builder: (_) => AlertDialog(title: Text("Firma del Operario"), content: Container(height: 200, color: Colors.grey[200], child: Center(child: Text("Panel de Firma")))));
  }
}
