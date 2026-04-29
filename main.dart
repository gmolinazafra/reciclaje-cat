import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';

void main() => runApp(MaterialApp(
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        colorScheme: ColorScheme.fromSeed(seedColor: Colors.blueGrey),
        useMaterial3: true,
      ),
      home: AppReciclajeCAT(),
    ));

class AppReciclajeCAT extends StatefulWidget {
  @override
  _AppReciclajeCATState createState() => _AppReciclajeCATState();
}

class _AppReciclajeCATState extends State<AppReciclajeCAT> {
  int _tabActual = 0;

  // --- BASE DE DATOS DE MARCAS Y MODELOS (Extraídos de tus archivos) ---
  final Map<String, List<String>> datosVehiculos = {
    "SEAT": ["IBIZA", "LEON", "ALTEA", "CORDOBA", "ARONA", "ATECA"],
    "RENAULT": ["CLIO", "MEGANE", "SCENIC", "LAGUNA", "KANGOO", "CAPTUR"],
    "PEUGEOT": ["206", "207", "208", "307", "308", "PARTNER", "3008"],
    "CITROEN": ["C3", "C4", "BERLINGO", "XSARA", "C5", "C1"],
    "FORD": ["FOCUS", "FIESTA", "MONDEO", "TRANSIT", "C-MAX", "KUGA"],
    "VOLKSWAGEN": ["GOLF", "POLO", "PASSAT", "TIGUAN", "TOURAN"],
    "OPEL": ["CORSA", "ASTRA", "INSIGNIA", "ZAFIRA", "MOKKA"],
    "AUDI": ["A3", "A4", "A6", "Q3", "Q5"],
    "BMW": ["SERIE 1", "SERIE 3", "SERIE 5", "X1", "X3", "X5"],
    "MERCEDES": ["CLASE A", "CLASE C", "CLASE E", "VITO", "SPRINTER"],
  };

  // --- ESTADOS DE LA APP ---
  String? marcaSeleccionada;
  String? modeloSeleccionado;
  String? trabajadorSeleccionado;
  String? airbagSeleccionado;
  final TextEditingController gasController = TextEditingController();
  
  List<String> listaTrabajadores = [];
  final TextEditingController _nuevoTrabaController = TextEditingController();
  final TextEditingController _catNombre = TextEditingController();
  final TextEditingController _catNima = TextEditingController();

  // Checklist de residuos (Sí/No)
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
    _cargarPreferencias();
  }

  // Carga trabajadores y datos CAT desde la memoria del móvil
  _cargarPreferencias() async {
    SharedPreferences prefs = await SharedPreferences.getInstance();
    setState(() {
      listaTrabajadores = prefs.getStringList('trabajadores') ?? [];
      _catNombre.text = prefs.getString('cat_nombre') ?? "";
      _catNima.text = prefs.getString('cat_nima') ?? "";
    });
  }

  _guardarConfiguracion() async {
    SharedPreferences prefs = await SharedPreferences.getInstance();
    await prefs.setStringList('trabajadores', listaTrabajadores);
    await prefs.setString('cat_nombre', _catNombre.text);
    await prefs.setString('cat_nima', _catNima.text);
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text("Configuración Guardada")));
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text("CAT CONTROL PRO"),
        backgroundColor: Colors.blueGrey[900],
        foregroundColor: Colors.white,
      ),
      body: _tabActual == 0 ? _pantallaChecklist() : _pantallaConfig(),
      bottomNavigationBar: BottomNavigationBar(
        currentIndex: _tabActual,
        onTap: (index) => setState(() => _tabActual = index),
        items: [
          BottomNavigationBarItem(icon: Icon(Icons.car_repair), label: "Nueva Entrada"),
          BottomNavigationBarItem(icon: Icon(Icons.admin_panel_settings), label: "Ajustes CAT"),
        ],
      ),
    );
  }

  Widget _pantallaChecklist() {
    return SingleChildScrollView(
      padding: EdgeInsets.all(16),
      child: Column(
        children: [
          _bloque("IDENTIFICACIÓN", [
            _selector("Trabajador", listaTrabajadores, trabajadorSeleccionado, (v) => setState(() => trabajadorSeleccionado = v)),
            _selector("Marca", datosVehiculos.keys.toList(), marcaSeleccionada, (v) => setState(() { 
              marcaSeleccionada = v; 
              modeloSeleccionado = null; 
            })),
            _selector("Modelo", datosVehiculos[marcaSeleccionada] ?? [], modeloSeleccionado, (v) => setState(() => modeloSeleccionado = v)),
            TextField(decoration: InputDecoration(labelText: "Matrícula / Bastidor")),
          ]),
          
          _bloque("RESIDUOS (SÍ/NO)", [
            ...checklist.keys.map((key) => SwitchListTile(
              title: Text(key),
              value: checklist[key]!,
              onChanged: (v) => setState(() => checklist[key] = v),
            )),
          ]),

          _bloque("DETALLES ESPECÍFICOS", [
            if (checklist["Gases AC"] == true)
              TextField(
                controller: gasController,
                decoration: InputDecoration(labelText: "Cantidad de Gas (gramos)", suffixText: "gr"),
                keyboardType: TextInputType.number,
              ),
            SizedBox(height: 15),
            Text("Gestión de Airbags:", style: TextStyle(fontWeight: FontWeight.bold)),
            _radioAirbag("Retirada"),
            _radioAirbag("Detonación"),
            _radioAirbag("Inertización (Batería)"),
          ]),

          SizedBox(height: 20),
          ElevatedButton.icon(
            style: ElevatedButton.styleFrom(minimumSize: Size(double.infinity, 55), backgroundColor: Colors.green, foregroundColor: Colors.white),
            onPressed: () => _finalizar(),
            icon: Icon(Icons.save),
            label: Text("GRABAR Y FIRMAR"),
          )
        ],
      ),
    );
  }

  Widget _pantallaConfig() {
    return Padding(
      padding: EdgeInsets.all(16),
      child: Column(
        children: [
          _bloque("DATOS DEL CENTRO", [
            TextField(controller: _catNombre, decoration: InputDecoration(labelText: "Nombre del CAT")),
            TextField(controller: _catNima, decoration: InputDecoration(labelText: "NIMA / NIRI")),
          ]),
          _bloque("PERSONAL", [
            TextField(
              controller: _nuevoTrabaController,
              decoration: InputDecoration(
                labelText: "Nombre del Trabajador",
                suffixIcon: IconButton(icon: Icon(Icons.add_box), onPressed: () {
                  if (_nuevoTrabaController.text.isNotEmpty) {
                    setState(() => listaTrabajadores.add(_nuevoTrabaController.text.toUpperCase()));
                    _nuevoTrabaController.clear();
                  }
                }),
              ),
            ),
            ...listaTrabajadores.map((t) => ListTile(
              title: Text(t),
              trailing: IconButton(icon: Icon(Icons.delete, color: Colors.red), onPressed: () => setState(() => listaTrabajadores.remove(t))),
            )),
          ]),
          ElevatedButton(onPressed: _guardarConfiguracion, child: Text("GUARDAR TODO EN EL MÓVIL")),
        ],
      ),
    );
  }

  // --- WIDGETS AUXILIARES ---
  Widget _bloque(String titulo, List<Widget> children) {
    return Card(
      elevation: 2,
      margin: EdgeInsets.only(bottom: 16),
      child: Padding(
        padding: EdgeInsets.all(12),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text(titulo, style: TextStyle(color: Colors.blueGrey[800], fontWeight: FontWeight.bold)),
          Divider(),
          ...children
        ]),
      ),
    );
  }

  Widget _selector(String label, List<String> items, String? val, Function(String?) onCh) {
    return DropdownButtonFormField<String>(
      decoration: InputDecoration(labelText: label),
      value: val,
      items: items.map((i) => DropdownMenuItem(value: i, child: Text(i))).toList(),
      onChanged: onCh,
    );
  }

  Widget _radioAirbag(String label) {
    return RadioListTile(
      title: Text(label), value: label, groupValue: airbagSeleccionado,
      onChanged: (v) => setState(() => airbagSeleccionado = v as String),
    );
  }

  void _finalizar() {
    if (trabajadorSeleccionado == null || marcaSeleccionada == null) {
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text("Error: Rellena trabajador y vehículo")));
      return;
    }
    // Aquí abriríamos la pantalla de firma
    showModalBottomSheet(context: context, builder: (c) => Container(
      height: 300, child: Column(children: [
        Padding(padding: EdgeInsets.all(20), child: Text("FIRMA DEL TRABAJADOR: $trabajadorSeleccionado")),
        Expanded(child: Container(color: Colors.grey[200], child: Center(child: Text("PANEL DE FIRMA TÁCTIL")))),
        ElevatedButton(onPressed: () => Navigator.pop(context), child: Text("GUARDAR PDF"))
      ]),
    ));
  }
}
