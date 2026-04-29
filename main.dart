import 'package:flutter/material.dart';

void main() => runApp(MaterialApp(home: HomeCAT()));

class HomeCAT extends StatefulWidget {
  @override
  _HomeCATState createState() => _HomeCATState();
}

class _HomeCATState extends State<HomeCAT> {
  // 1. Datos iniciales (Luego los pasaremos a una base de datos)
  String? marcaSeleccionada;
  String? modeloSeleccionado;
  String? trabajadorSeleccionado;

  final List<String> trabajadores = ["Juan Pérez", "Andrés García", "María López"];
  final List<String> marcas = ["Seat", "Renault", "Peugeot"];
  final Map<String, List<String>> modelos = {
    "Seat": ["Ibiza", "León", "Arona"],
    "Renault": ["Clio", "Megane", "Captur"],
    "Peugeot": ["208", "3008", "5008"],
  };

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text("CAT Reciclaje - Nueva Entrada"), backgroundColor: Colors.green),
      body: SingleChildScrollView(
        padding: EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text("DATOS DEL VEHÍCULO", style: TextStyle(fontWeight: FontWeight.bold, fontSize: 18)),
            SizedBox(height: 10),
            
            // DESPLEGABLE DE MARCAS
            DropdownButtonFormField<String>(
              decoration: InputDecoration(labelText: "Selecciona Marca"),
              value: marcaSeleccionada,
              items: marcas.map((m) => DropdownMenuItem(value: m, child: Text(m))).toList(),
              onChanged: (val) => setState(() { marcaSeleccionada = val; modeloSeleccionado = null; }),
            ),

            // DESPLEGABLE DE MODELOS (Se activa según la marca)
            DropdownButtonFormField<String>(
              decoration: InputDecoration(labelText: "Selecciona Modelo"),
              value: modeloSeleccionado,
              items: (modelos[marcaSeleccionada] ?? []).map((m) => DropdownMenuItem(value: m, child: Text(m))).toList(),
              onChanged: (val) => setState(() => modeloSeleccionado = val),
            ),

            SizedBox(height: 20),
            Text("OPERARIO", style: TextStyle(fontWeight: FontWeight.bold)),
            DropdownButtonFormField<String>(
              decoration: InputDecoration(labelText: "Selecciona Trabajador"),
              value: trabajadorSeleccionado,
              items: trabajadores.map((t) => DropdownMenuItem(value: t, child: Text(t))).toList(),
              onChanged: (val) => setState(() => trabajadorSeleccionado = val),
            ),
            
            SizedBox(height: 30),
            Center(
              child: ElevatedButton(
                style: ElevatedButton.styleFrom(backgroundColor: Colors.green, padding: EdgeInsets.symmetric(horizontal: 40, vertical: 15)),
                onPressed: () {
                  // Aquí conectaremos con la pantalla de Checklist (Sí/No)
                  print("Iniciando checklist para $marcaSeleccionada $modeloSeleccionado");
                }, 
                child: Text("EMPEZAR DESCONTAMINACIÓN", style: TextStyle(color: Colors.white)),
              ),
            )
          ],
        ),
      ),
    );
  }
}
