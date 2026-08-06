require("dotenv").config();
const path = require("path");
const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const app = express();
const PORT = process.env.PORT || 3000;
const MONGODB_URI = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/AlbumFutbolVirtual";

// Catálogo que usa la vista del álbum para mostrar la nacionalidad y su bandera.
// Se mantiene local para no depender de un servicio externo al abrir una carta.
const nacionalidades = {
  espana: { pais: "España", bandera: "https://flagcdn.com/w40/es.png" },
  spain: { pais: "España", bandera: "https://flagcdn.com/w40/es.png" },
  brasil: { pais: "Brasil", bandera: "https://flagcdn.com/w40/br.png" },
  brazil: { pais: "Brasil", bandera: "https://flagcdn.com/w40/br.png" },
  uruguay: { pais: "Uruguay", bandera: "https://flagcdn.com/w40/uy.png" },
  argentina: { pais: "Argentina", bandera: "https://flagcdn.com/w40/ar.png" },
  francia: { pais: "Francia", bandera: "https://flagcdn.com/w40/fr.png" },
  france: { pais: "Francia", bandera: "https://flagcdn.com/w40/fr.png" },
  portugal: { pais: "Portugal", bandera: "https://flagcdn.com/w40/pt.png" },
  alemania: { pais: "Alemania", bandera: "https://flagcdn.com/w40/de.png" },
  germany: { pais: "Alemania", bandera: "https://flagcdn.com/w40/de.png" },
  inglaterra: { pais: "Inglaterra", bandera: "https://flagcdn.com/w40/gb-eng.png" },
  england: { pais: "Inglaterra", bandera: "https://flagcdn.com/w40/gb-eng.png" }
};

function normalizarTexto(valor = "") {
  return String(valor)
    .trim()
    .toLocaleLowerCase("es")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/ñ/g, "n");
}

function escaparRegex(valor) {
  return valor.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function regexNormalizado(valor) {
  const equivalencias = { a: "aáàäâ", e: "eéèëê", i: "iíìïî", o: "oóòöô", u: "uúùüû", n: "nñ" };
  return [...normalizarTexto(valor)].map(caracter => equivalencias[caracter] ? `[${equivalencias[caracter]}]` : escaparRegex(caracter)).join("");
}

const usuarioSchema = new mongoose.Schema({
  nombre: { type: String, required: true, trim: true, minlength: 2, maxlength: 80 },
  correo: { type: String, required: true, unique: true, trim: true, lowercase: true },
  password: { type: String, required: true, minlength: 6, select: false },
  foto: { type: String, default: "usuario.png" },
  monedas: { type: Number, default: 500, min: 0 },
  sobres: { type: Number, default: 3, min: 0 },
  nivel: { type: Number, default: 1, min: 1 },
  experiencia: { type: Number, default: 0, min: 0 },
  rol: { type: String, default: "usuario", enum: ["usuario", "admin"] },
  activo: { type: Boolean, default: true },
  fechaRegistro: { type: Date, default: Date.now }
});

const jugadorSchema = new mongoose.Schema({
  nombre: { type: String, required: true, trim: true },
  equipo: { type: String, required: true, trim: true },
  posicion: { type: String, required: true, trim: true },
  rareza: { type: String, required: true, trim: true },
  imagen: { type: String, required: true, trim: true },
  valor: { type: Number, required: true, min: 0 },
  pais: { type: String, required: true, trim: true }
});

const preguntaSchema = new mongoose.Schema({
  pregunta: { type: String, required: true, trim: true },
  respuesta: { type: String, required: true, trim: true },
  equipo: { type: String, required: true, trim: true },
  dificultad: { type: String, required: true, enum: ["fácil", "media", "difícil"] },
  activa: { type: Boolean, default: true }
});

const coleccionSchema = new mongoose.Schema({
  usuarioId: { type: mongoose.Schema.Types.ObjectId, ref: "Usuario", required: true, unique: true },
  cartas: [{ type: mongoose.Schema.Types.ObjectId, ref: "Jugador" }]
});

const Usuario = mongoose.models.Usuario || mongoose.model("Usuario", usuarioSchema, "usuarios");
const Jugador = mongoose.models.Jugador || mongoose.model("Jugador", jugadorSchema, "jugadores");
const Pregunta = mongoose.models.Pregunta || mongoose.model("Pregunta", preguntaSchema, "preguntas");
const Coleccion = mongoose.models.Coleccion || mongoose.model("Coleccion", coleccionSchema, "colecciones");

function usuarioPublico(usuario) {
  const datos = usuario.toObject ? usuario.toObject() : usuario;
  delete datos.password;
  return datos;
}

async function conectarBaseDeDatos() {
  if (mongoose.connection.readyState === 1) return mongoose.connection;
  return mongoose.connect(MONGODB_URI);
}

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname)));

app.post("/api/auth/registro", async (req, res) => {
  try {
    const nombre = String(req.body.nombre || "").trim();
    const correo = String(req.body.correo || req.body.email || "").trim().toLowerCase();
    const password = String(req.body.password || "");
    if (nombre.length < 2 || !/^\S+@\S+\.\S+$/.test(correo) || password.length < 6) {
      return res.status(400).json({ error: "Nombre, correo válido y contraseña de al menos 6 caracteres son obligatorios." });
    }
    if (await Usuario.exists({ correo })) return res.status(409).json({ error: "Este correo ya está registrado." });
    const passwordHash = await bcrypt.hash(password, 12);
    const usuario = await Usuario.create({ nombre, correo, password: passwordHash });
    await Coleccion.create({ usuarioId: usuario._id, cartas: [] });
    return res.status(201).json({ mensaje: "Cuenta creada correctamente.", usuario: usuarioPublico(usuario) });
  } catch (error) {
    return res.status(500).json({ error: "No fue posible crear la cuenta." });
  }
});

app.post("/api/auth/login", async (req, res) => {
  try {
    const correo = String(req.body.correo || req.body.email || "").trim().toLowerCase();
    const password = String(req.body.password || "");
    if (!correo || !password) return res.status(400).json({ error: "Correo y contraseña son obligatorios." });
    const usuario = await Usuario.findOne({ correo }).select("+password");
    if (!usuario || !usuario.activo || !(await bcrypt.compare(password, usuario.password))) {
      return res.status(401).json({ error: "Correo o contraseña incorrectos." });
    }
    return res.json({ mensaje: "Sesión iniciada correctamente.", usuario: usuarioPublico(usuario) });
  } catch (error) {
    return res.status(500).json({ error: "No fue posible iniciar sesión." });
  }
});

app.get("/api/nacionalidad/:pais", (req, res) => {
  const nacionalidad = nacionalidades[normalizarTexto(req.params.pais)];
  if (!nacionalidad) return res.status(404).json({ error: "Nacionalidad no encontrada" });
  return res.json(nacionalidad);
});

app.get("/api/estado", (_req, res) => res.json({ estado: "ok", mensaje: "API local de nacionalidades activa" }));

app.get("/api/jugadores/:equipo", async (req, res) => {
  try {
    const equipo = normalizarTexto(req.params.equipo);
    if (!equipo) return res.status(400).json({ error: "Indica un equipo." });
    const jugadores = await Jugador.find({ equipo: { $regex: new RegExp(`^${regexNormalizado(equipo)}$`, "i") } }).lean();
    const resultado = jugadores.filter(jugador => normalizarTexto(jugador.equipo) === equipo);
    return res.json(resultado);
  } catch (error) {
    return res.status(500).json({ error: "No fue posible obtener los jugadores." });
  }
});

app.get("/api/preguntas", async (_req, res) => {
  try {
    return res.json(await Pregunta.find({ activa: true }).lean());
  } catch (error) {
    return res.status(500).json({ error: "No fue posible obtener las preguntas." });
  }
});

app.get("/api/health", (_req, res) => res.json({ estado: "ok", baseDeDatos: mongoose.connection.readyState === 1 }));
app.get("/", (_req, res) => res.sendFile(path.join(__dirname, "login.html")));

if (require.main === module) {
  conectarBaseDeDatos()
    .then(() => app.listen(PORT, () => console.log(`Álbum disponible en http://localhost:${PORT}`)))
    .catch(error => {
  console.error("ERROR COMPLETO:");
  console.error(error);
  process.exit(1);
});
}

module.exports = { app, conectarBaseDeDatos, mongoose, Usuario, Jugador, Pregunta, Coleccion, normalizarTexto };
