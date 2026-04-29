import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';
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

  // --- DATOS DINÁMICOS ---
  Map<String, List<String>> datosVehiculos = {};
  List<String> listaTrabajadores = [];

  // --- CONTROLADORES Y ESTADOS ---
  String? marcaSel;
  String? modeloSel;
  String? trabajadorSel;
  String? airbagSel;
  final TextEditingController gasController = TextEditingController();
  final TextEditingController _catNombre = TextEditingController();
  final TextEditingController _catNima = TextEditingController();
  
  // Controladores para añadir nuevos
  final TextEditingController _nuevaMarcaCtrl = TextEditingController();
  final TextEditingController _nuevoModeloCtrl = TextEditingController();
  final TextEditingController _nuevoTrabajadorCtrl = TextEditingController();

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

  // CARGAR TODO DE LA MEMORIA LOCAL
  _cargarDatos() async {
    SharedPreferences prefs = await SharedPreferences.getInstance();
    setState(() {
      _catNombre.text = prefs.getString('cat_nombre') ?? "";
      _catNima.text = prefs.getString('cat_nima') ?? "";
      listaTrabajadores = prefs.getStringList('trabajadores') ?? [];
      
      String? vehiculosJson = prefs.getString('vehiculos_data');
      if (vehiculosJson != null) {
        Map<String, dynamic> decoded = jsonDecode(vehiculosJson);
        datosVehiculos = decoded.map((key, value) => MapEntry(key, List<String>.from(value)));
      } else {
        // Datos por defecto si está vacío
        datosVehiculos = {
          "SEAT": ["IBIZA", "LEON"],
          "RENAULT": ["CLIO", "MEGANE"],
          "FORD": ["FOCUS", "FIESTA"]
        };
      }
    });
  }

  // GUARDAR TODO EN LA MEMORIA LOCAL
  _guardarTodo() async {
    SharedPreferences prefs = await SharedPreferences.getInstance();
    await prefs.setString('cat_nombre', _catNombre.text);
    await prefs.setString('cat_nima', _catNima.text);
    await prefs.setStringList('trabajadores', listaTrabajadores);
    await prefs.setString('vehiculos_data', jsonEncode(datosVehiculos));
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text("Datos guardados correctamente")));
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
          BottomNavigationBarItem(icon: Icon(Icons.car_repair), label: "Nueva Entrada"),
          BottomNavigationBarItem(icon: Icon(Icons.settings), label: "Ajustes / Alta"),
        ],
      ),
    );
  }

  // --- PANTALLA 1: CHECKLIST ---
  Widget _pantallaChecklist() {
    return SingleChildScrollView(
      padding: EdgeInsets.all(16),
      child: Column(
        children: [
          _bloque("IDENTIFICACIÓN", [
            _selector("Trabajador", listaTrabajadores, trabajadorSel, (v) => setState(() => trabajadorSel = v)),
            _selector("Marca", datosVehiculos.keys.toList(), marcaSel, (v) {
              setState(() { marcaSel = v; modeloSel = null; });
            }),
            _selector("Modelo", datosVehiculos[marcaSel] ?? [], modeloSel, (v) => setState(() => modeloSel = v)),
            TextField(decoration: InputDecoration(labelText: "Matrícula / Bastidor")),
          ]),
          _bloque("CHECKLIST (SÍ/NO)", [
            ...checklist.keys.map((k) => SwitchListTile(
              title: Text(k), value: checklist[k]!,
              onChanged: (v) => setState(() => checklist[k] = v),
            )),
          ]),
          _bloque("GASES Y AIRBAGS", [
            if (checklist["Gases AC"] == true)
              TextField(controller: gasController, decoration: InputDecoration(labelText: "Gramos Gas", suffixText: "gr"), keyboardType: TextInputType.number),
            ...['Retirada', 'Detonación', 'Inertización'].map((opt) => RadioListTile(
              title: Text(opt), value: opt, groupValue: airbagSel,
              onChanged: (v) => setState(() => airbagSel = v as String),
            )),
          ]),
          ElevatedButton(onPressed: () {}, child: Text("GRABAR Y FIRMAR"), style: ElevatedButton.styleFrom(minimumSize: Size(double.infinity, 50), backgroundColor: Colors.green, foregroundColor: Colors.white))
        ],
      ),
    );
  }

  // --- PANTALLA 2: AJUSTES (AÑADIR MARCAS, MODELOS Y TRABAJADORES) ---
  Widget _pantallaConfig() {
    return SingleChildScrollView(
      padding: EdgeInsets.all(16),
      child: Column(
        children: [
          _bloque("DATOS CAT", [
            TextField(controller: _catNombre, decoration: InputDecoration(labelText: "Nombre CAT")),
            TextField(controller: _catNima, decoration: InputDecoration(labelText: "NIMA / NIRI")),
          ]),
          _bloque("AÑADIR MARCA NUEVA", [
            _inputNuevo(_nuevaMarcaCtrl, "Nombre Marca", () {
              if (_nuevaMarcaCtrl.text.isNotEmpty) {
                setState(() => datosVehiculos[_nuevaMarcaCtrl.text.toUpperCase()] = []);
                _nuevaMarcaCtrl.clear();
              }
            }),
          ]),
          _bloque("AÑADIR MODELO A ${_marcaSeleccionadaConfig()}", [
            _selector("Marca a la que pertenece", datosVehiculos.keys.toList(), marcaSel, (v) => setState(() => marcaSel = v)),
            _inputNuevo(_nuevoModeloCtrl, "Nombre Modelo", () {
              if (marcaSel != null && _nuevoModeloCtrl.text.isNotEmpty) {
                setState(() => datosVehiculos[marcaSel]!.add(_nuevoModeloCtrl.text.toUpperCase()));
                _nuevoModeloCtrl.clear();
              }
            }),
          ]),
          _bloque("AÑADIR TRABAJADOR", [
            _inputNuevo(_nuevoTrabajadorCtrl, "Nombre Operario", () {
              if (_nuevoTrabajadorCtrl.text.isNotEmpty) {
                setState(() => listaTrabajadores.add(_nuevoTrabajadorCtrl.text.toUpperCase()));
                _nuevoTrabajadorCtrl.clear();
              }
            }),
          ]),
          ElevatedButton(onPressed: _guardarTodo, child: Text("GUARDAR CAMBIOS EN EL MÓVIL"), style: ElevatedButton.styleFrom(minimumSize: Size(double.infinity, 45))),
        ],
      ),
    );
  }

  // --- AUXILIARES ---
  String _marcaSeleccionadaConfig() => marcaSel ?? "(Selecciona una marca arriba)";

  Widget _bloque(String t, List<Widget> c) => Card(margin: EdgeInsets.only(bottom: 16), child: Padding(padding: EdgeInsets.all(12), child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [Text(t, style: TextStyle(fontWeight: FontWeight.bold, color: Colors.blueGrey)), Divider(), ...c])));

  Widget _selector(String l, List<String> i, String? v, Function(String?) on) => DropdownButtonFormField<String>(decoration: InputDecoration(labelText: l), value: v, items: i.map((e) => DropdownMenuItem(value: e, child: Text(e))).toList(), onChanged: on);

  Widget _inputNuevo(TextEditingController ctrl, String label, VoidCallback onAdd) => TextField(controller: ctrl, decoration: InputDecoration(labelText: label, suffixIcon: IconButton(icon: Icon(Icons.add_circle, color: Colors.blueGrey), onPressed: onAdd)));
}
