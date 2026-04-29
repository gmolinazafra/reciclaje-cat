import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:signature/signature.dart';
import 'dart:convert';
import 'dart:typed_data';
import 'package:pdf/pdf.dart';
import 'package:pdf/widgets.dart' as pw;
import 'package:printing/printing.dart';

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

  String? marcaSel;
  String? modeloSel;
  String? trabajadorSel;
  String? airbagSel;
  final TextEditingController gasController = TextEditingController();
  final TextEditingController _catNombre = TextEditingController();
  final TextEditingController _catNima = TextEditingController();
  final TextEditingController _catCif = TextEditingController();
  final TextEditingController _matriculaCtrl = TextEditingController();

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

  // --- LÓGICA PARA GENERAR Y COMPARTIR PDF ---
  Future<void> _generarPDF(Uint8List firmaImage) async {
    final pdf = pw.Document();

    pdf.addPage(
      pw.Page(
        build: (pw.Context context) => pw.Column(
          crossAxisAlignment: pw.CrossAxisAlignment.start,
          children: [
            pw.Header(level: 0, child: pw.Text("ACTA DE DESCONTAMINACION - ${_catNombre.text}")),
            pw.Text("DATOS DEL CAT: ${_catNombre.text} | CIF: ${_catCif.text} | NIMA: ${_catNima.text}"),
            pw.Divider(),
            pw.Text("VEHICULO: $marcaSel $modeloSel | MATRICULA/VIN: ${_matriculaCtrl.text}"),
            pw.Text("OPERARIO: $trabajadorSel"),
            pw.SizedBox(height: 10),
            pw.Text("RESULTADO CHECKLIST:", style: pw.TextStyle(fontWeight: pw.FontWeight.bold)),
            ...checklist.entries.map((e) => pw.Text("- ${e.key}: ${e.value ? 'SI' : 'NO'}")).toList(),
            if (checklist["Gases AC"] == true) pw.Text("GRAMOS GAS AC: ${gasController.text} gr"),
            pw.Text("ESTADO AIRBAGS: ${airbagSel ?? 'No especificado'}"),
            pw.SizedBox(height: 20),
            pw.Text("DECLARACION LEGAL:", style: pw.TextStyle(fontWeight: pw.FontWeight.bold)),
            pw.Text("El trabajador $trabajadorSel declara bajo su responsabilidad que ha realizado los trabajos segun normativa."),
            pw.SizedBox(height: 10),
            pw.Image(pw.MemoryImage(firmaImage), width: 150),
            pw.Text("Firma del operario"),
          ],
        ),
      ),
    );

    // Abre el menú de compartir (WhatsApp, Drive, Email, etc.)
    await Printing.sharePdf(bytes: await pdf.save(), filename: 'Descontaminacion_${_matriculaCtrl.text}.pdf');
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
            TextField(controller: _matriculaCtrl, decoration: InputDecoration(labelText: "Matrícula / Bastidor")),
          ]),
          _bloque("ESTADO DE DESCONTAMINACIÓN", [
            ...checklist.keys.map((k) => SwitchListTile(title: Text(k), value: checklist[k]!, onChanged: (v) => setState(() => checklist[k] = v))),
            if (checklist["Gases AC"] == true)
              TextField(controller: gasController, decoration: InputDecoration(labelText: "Gramos Gas", suffixText: "gr"), keyboardType: TextInputType.number),
          ]),
          _bloque("GESTIÓN AIRBAGS", [
            ...['Retirada', 'Detonación', 'Inertización'].map((opt) => RadioListTile(title: Text(opt), value: opt, groupValue: airbagSel, onChanged: (v) => setState(() => airbagSel = v as String))),
          ]),
          ElevatedButton(
            onPressed: () => _abrirFirmaLegala(),
            child: Text("PROCEDER A LA FIRMA"),
            style: ElevatedButton.styleFrom(minimumSize: Size(double.infinity, 50), backgroundColor: Colors.orange[800], foregroundColor: Colors.white),
          ),
        ],
      ),
    );
  }

  void _abrirFirmaLegala() {
    if (trabajadorSel == null || _matriculaCtrl.text.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text("Rellene trabajador y matrícula")));
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
            Text("RESPONSABILIDAD LEGAL", style: TextStyle(fontWeight: pw.FontWeight.bold, color: Colors.red)),
            Text("Yo, $trabajadorSel, declaro que he realizado los trabajos de descontaminación indicados."),
            SizedBox(height: 10),
            Container(
              decoration: BoxDecoration(border: Border.all(color: Colors.grey)),
              child: Signature(controller: _signatureController, height: 200, backgroundColor: Colors.white),
            ),
            ElevatedButton(
              onPressed: () async {
                final signature = await _signatureController.toPngBytes();
                if (signature != null) {
                  Navigator.pop(context);
                  _generarPDF(signature);
                }
              }, 
              child: Text("GENERAR Y ENVIAR PDF")
            ),
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
          _bloque("AÑADIR MARCA/MODELO", [
             TextField(onSubmitted: (v) => setState(() => datosVehiculos[v.toUpperCase()] = []), decoration: InputDecoration(labelText: "Nueva Marca + Enter")),
          ]),
          ElevatedButton(onPressed: _guardarTodo, child: Text("GUARDAR AJUSTES")),
        ],
      ),
    );
  }

  Widget _bloque(String t, List<Widget> c) => Card(margin: EdgeInsets.only(bottom: 16), child: Padding(padding: EdgeInsets.all(12), child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [Text(t, style: TextStyle(fontWeight: FontWeight.bold)), Divider(), ...c])));
  Widget _selector(String l, List<String> i, String? v, Function(String?) on) => DropdownButtonFormField<String>(decoration: InputDecoration(labelText: l), value: v, items: i.map((e) => DropdownMenuItem(value: e, child: Text(e))).toList(), onChanged: on);
}
