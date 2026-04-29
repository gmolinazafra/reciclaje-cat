import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:signature/signature.dart'; // Librería para la firma
import 'dart:convert';

void main() => runApp(MaterialApp(
      debugShowCheckedModeBanner: false,
      theme: ThemeData(colorScheme: ColorScheme.fromSeed(seedColor: Colors.blueGrey), useMaterial3: true),
      home: AppReciclajeCAT(),
    ));

class AppReciclajeCAT extends StatefulWidget {
  @override
  _AppReciclajeCATState createState() => _AppReciclajeCATState();
}

class _AppReciclajeCATState extends State<AppReciclajeCAT> {
  int _tabActual = 0;
  Map<String, List<String>> datosVehiculos = {};
  List<String> listaTrabajadores = [];

  // Estados de selección
  String? marcaSel;
  String? modeloSel;
  String? trabajadorSel;
  String? airbagSel;
  final TextEditingController gasController = TextEditingController();
  final TextEditingController _catNombre = TextEditingController();
  final TextEditingController _catNima = TextEditingController();
  final TextEditingController _catCif = TextEditingController();

  // Controlador de firma
  final SignatureController _signatureController = SignatureController(
    penStrokeWidth: 3,
    penColor: Colors.black,
    exportBackgroundColor: Colors.white,
  );

  Map<String, bool> checklist = {
    "Batería": false, "Aceite Motor": false, "Aceite Caja": false,
    "Líquido Dirección": false, "Anticongelante": false, "Gases AC": false,
    "Filtro Aceite": false, "Filtro Aire": false, "Filtro Combustible": false,
    "Combustible": false, "Catalizador": false, "Vidrio": false,
    "Salpicadero": false, "Parachoques": false, "Neumáticos": false, "Cables": false,
  };

  @override
  void initState() {
    super.initState();
    _cargarDatos();
  }

  _cargarDatos() async {
    SharedPreferences prefs = await SharedPreferences.getInstance();
    setState(() {
      _catNombre.text = prefs.getString('cat_nombre') ?? "";
      _catNima.text = prefs.getString('cat_nima') ?? "";
      _catCif.text = prefs.getString('cat_cif') ?? "";
      listaTrabajadores = prefs.getStringList('trabajadores') ?? [];
      String? vehiculosJson = prefs.getString('vehiculos_data');
      if (vehiculosJson != null) {
        Map<String, dynamic> decoded = jsonDecode(vehiculosJson);
        datosVehiculos = decoded.map((key, value) => MapEntry(key, List<String>.from(value)));
      } else {
        datosVehiculos = {"SEAT": ["IBIZA"], "RENAULT": ["CLIO"]};
      }
    });
  }

  _guardarTodo() async {
    SharedPreferences prefs = await SharedPreferences.getInstance();
    await prefs.setString('cat_nombre', _catNombre.text);
    await prefs.setString('cat_nima', _catNima.text);
    await prefs.setString('cat_cif', _catCif.text);
    await prefs.setStringList('trabajadores', listaTrabajadores);
    await prefs.setString('vehiculos_data', jsonEncode(datosVehiculos));
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text("Configuración guardada")));
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text("CAT CONTROL PRO"), backgroundColor: Colors.blueGrey[900], foregroundColor: Colors.white),
      body: _tabActual == 0 ? _pantallaChecklist() : _pantallaConfig(),
      bottomNavigationBar: BottomNavigationBar(
        currentIndex: _tabActual,
        onTap: (index) => setState(() => _tabActual = index),
        items: [
          BottomNavigationBarItem(icon: Icon(Icons.description), label: "Informe"),
          BottomNavigationBarItem(icon: Icon(Icons.settings), label: "Ajustes"),
        ],
      ),
    );
  }

  Widget _pantallaChecklist() {
    return SingleChildScrollView(
      padding: EdgeInsets.all(16),
      child: Column(
        children: [
          _bloque("IDENTIFICACIÓN VEHÍCULO", [
            _selector("Trabajador firmante", listaTrabajadores, trabajadorSel, (v) => setState(() => trabajadorSel = v)),
            _selector("Marca", datosVehiculos.keys.toList(), marcaSel, (v) { setState(() { marcaSel = v; modeloSel = null; }); }),
            _selector("Modelo", datosVehiculos[marcaSel] ?? [], modeloSel, (v) => setState(() => modeloSel = v)),
            TextField(decoration: InputDecoration(labelText: "Matrícula / Bastidor")),
          ]),
          _bloque("ESTADO DE DESCONTAMINACIÓN", [
            ...checklist.keys.map((k) => SwitchListTile(title: Text(k), value: checklist[k]!, onChanged: (v) => setState(() => checklist[k] = v))),
            if (checklist["Gases AC"] == true)
              TextField(controller: gasController, decoration: InputDecoration(labelText: "Gramos Gas", suffixText: "gr"), keyboardType: TextInputType.number),
          ]),
          _bloque("GESTIÓN AIRBAGS", [
            ...['Retirada', 'Detonación', 'Inertización'].map((opt) => RadioListTile(title: Text(opt), value: opt, groupValue: airbagSel, onChanged: (v) => setState(() => airbagSel = v as String))),
          ]),
          SizedBox(height: 20),
          ElevatedButton(
            onPressed: () => _abrirFirmaLegala(),
            child: Text("PROCEDER A LA FIRMA"),
            style: ElevatedButton.styleFrom(minimumSize: Size(double.infinity, 50), backgroundColor: Colors.orange[800], foregroundColor: Colors.white),
          ),
          SizedBox(height: 40),
        ],
      ),
    );
  }

  // --- VENTANA DE FIRMA Y ADVERTENCIA LEGAL ---
  void _abrirFirmaLegala() {
    if (trabajadorSel == null) {
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text("Seleccione un trabajador primero")));
      return;
    }
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      builder: (context) => Container(
        height: MediaQuery.of(context).size.height * 0.8,
        padding: EdgeInsets.all(20),
        child: Column(
          children: [
            Text("DECLARACIÓN DE RESPONSABILIDAD", style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16, color: Colors.red[900])),
            Divider(),
            Text(
              "Yo, $trabajadorSel, declaro bajo mi responsabilidad que realizaré los trabajos de descontaminación según lo descrito en este formulario, cumpliendo con la normativa vigente de gestión de VFU.",
              textAlign: TextAlign.justify,
              style: TextStyle(fontStyle: FontStyle.italic),
            ),
            SizedBox(height: 20),
            Text("Firma aquí:"),
            Container(
              decoration: BoxDecoration(border: Border.all(color: Colors.grey)),
              child: Signature(controller: _signatureController, height: 200, backgroundColor: Colors.white),
            ),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceEvenly,
              children: [
                TextButton(onPressed: () => _signatureController.clear(), child: Text("Borrar")),
                ElevatedButton(onPressed: () => Navigator.pop(context), child: Text("GENERAR INFORME FINAL")),
              ],
            )
          ],
        ),
      ),
    );
  }

  Widget _pantallaConfig() {
    return SingleChildScrollView(
      padding: EdgeInsets.all(16),
      child: Column(
        children: [
          _bloque("DATOS DEL CAT", [
            TextField(controller: _catNombre, decoration: InputDecoration(labelText: "Nombre Comercial")),
            TextField(controller: _catCif, decoration: InputDecoration(labelText: "CIF Empresa")),
            TextField(controller: _catNima, decoration: InputDecoration(labelText: "NIMA / NIRI")),
          ]),
          _bloque("GESTIÓN DE PERSONAL", [
            TextField(
              controller: TextEditingController(),
              onSubmitted: (v) { setState(() => listaTrabajadores.add(v.toUpperCase())); },
              decoration: InputDecoration(labelText: "Nuevo trabajador (Pulsa Enter)", suffixIcon: Icon(Icons.add)),
            ),
            ...listaTrabajadores.map((t) => ListTile(title: Text(t), trailing: IconButton(icon: Icon(Icons.delete), onPressed: () => setState(() => listaTrabajadores.remove(t))))),
          ]),
          ElevatedButton(onPressed: _guardarTodo, child: Text("GUARDAR CONFIGURACIÓN")),
        ],
      ),
    );
  }

  Widget _bloque(String t, List<Widget> c) => Card(margin: EdgeInsets.only(bottom: 16), child: Padding(padding: EdgeInsets.all(12), child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [Text(t, style: TextStyle(fontWeight: FontWeight.bold)), Divider(), ...c])));
  Widget _selector(String l, List<String> i, String? v, Function(String?) on) => DropdownButtonFormField<String>(decoration: InputDecoration(labelText: l), value: v, items: i.map((e) => DropdownMenuItem(value: e, child: Text(e))).toList(), onChanged: on);
}
