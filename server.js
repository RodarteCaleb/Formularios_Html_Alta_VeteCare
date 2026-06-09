const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const { exec } = require('child_process');
//servidor
const app = express();
app.use(express.json());
app.use(express.static(__dirname));
app.use(cors());
//Base de datos Conexión
const MONGO_URI = "mongodb+srv://CalebRodarte:Megustamuchopepa1@cluster0.1kvmaod.mongodb.net/vetecare?appName=Cluster0";

mongoose.connect(MONGO_URI)
    .then(() => console.log("¡Conectado exitosamente a MongoDB! 🚀"))
    .catch(err => console.error("Error al conectar a MongoDB:", err));

// ── SCHEMAS ─────────────────────────────────────────────────────────────────

const MascotaSchema = new mongoose.Schema({
    id_paciente: String,
    especie:     String,
    nombre:      String,
    edad:        String,
    genero:      String
}, { timestamps: true });

const PropietarioSchema = new mongoose.Schema({
    id_tutor:          String,
    nombre_propietario: String,
    domicilio:         String,
    contacto:          String,
    paciente_asociado: String
}, { timestamps: true });

const HistorialSchema = new mongoose.Schema({
    folio:         String,
    fecha:         String,
    tratamiento:   String,
    observaciones: String
}, { timestamps: true });

const ConsultaSchema = new mongoose.Schema({
    id_consulta: String,
    motivo:      String,
    diagnostico: String,
    citacion:    String
}, { timestamps: true });

const FinanzasSchema = new mongoose.Schema({
    concepto: String,
    costo:    String,
    estado:   String,
    personal: String
}, { timestamps: true });

const Mascota     = mongoose.model('Mascota',     MascotaSchema);
const Propietario = mongoose.model('Propietario', PropietarioSchema);
const Historial   = mongoose.model('Historial',   HistorialSchema);
const Consulta    = mongoose.model('Consulta',    ConsultaSchema);
const Finanzas    = mongoose.model('Finanzas',    FinanzasSchema);

// ── HELPER: genera rutas CRUD para cualquier modelo ──────────────────────────
function crudRoutes(router, path, Model) {
    // GET all
    router.get(path, async (req, res) => {
        try {
            const docs = await Model.find().sort({ createdAt: -1 });
            res.json(docs);
        } catch (e) { res.status(500).json({ error: e.message }); }
    });

    // POST create
    router.post(path, async (req, res) => {
        try {
            const doc = new Model(req.body);
            await doc.save();
            res.json({ mensaje: "Guardado correctamente", doc });
        } catch (e) { res.status(500).json({ error: e.message }); }
    });

    // PUT update
    router.put(`${path}/:id`, async (req, res) => {
        try {
            const doc = await Model.findByIdAndUpdate(req.params.id, req.body, { new: true });
            if (!doc) return res.status(404).json({ error: "No encontrado" });
            res.json({ mensaje: "Actualizado correctamente", doc });
        } catch (e) { res.status(500).json({ error: e.message }); }
    });

    // DELETE
    router.delete(`${path}/:id`, async (req, res) => {
        try {
            const doc = await Model.findByIdAndDelete(req.params.id);
            if (!doc) return res.status(404).json({ error: "No encontrado" });
            res.json({ mensaje: "Eliminado correctamente" });
        } catch (e) { res.status(500).json({ error: e.message }); }
    });
}

// ── RUTAS ─────────────────────────────────────────────────────────────────────
crudRoutes(app, '/api/pacientes',     Mascota);
crudRoutes(app, '/api/propietarios',  Propietario);
crudRoutes(app, '/api/historial',     Historial);
crudRoutes(app, '/api/consultas',     Consulta);
crudRoutes(app, '/api/finanzas',      Finanzas);

// ── ARRANQUE ──────────────────────────────────────────────────────────────────
const PORT = 5000;
app.listen(PORT, () => {
    console.log(`Servidor Backend corriendo en http://localhost:${PORT}`);
    const url = `http://localhost:${PORT}/VeteCare.html`;
    const cmd = process.platform === 'win32' ? `start ${url}`
              : process.platform === 'darwin' ? `open ${url}`
              : `xdg-open ${url}`;
    exec(cmd);
});
