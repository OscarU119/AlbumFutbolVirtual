const bcrypt = require("bcryptjs");
const { conectarBaseDeDatos, mongoose, Usuario, Jugador, Pregunta, Coleccion } = require("./server");

// URLs directas; las secuencias Unicode evitan que las tildes alteren las llaves.
const imagenes = {
  "Lamine Yamal": "https://i.etsystatic.com/53184385/r/il/5b2560/6979453482/il_fullxfull.6979453482_p29p.jpg",
  "Pedri": "https://i.pinimg.com/736x/e2/ca/01/e2ca01496077c364c6d9e24e2b0bebf0.jpg",
  "Gavi": "https://www.mycrochetchums.com/wp-content/uploads/2026/01/tieu-su-Gavi-1.jpg",
  "Pau Cubars\u00ed": "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRLxffP0y2WU7u2yTZh5dprLdhieOLDR2rGjg&s",
  "Kylian Mbapp\u00e9": "https://m.gettywallpapers.com/wp-content/uploads/2025/06/mbappe-wallpaper-4k-for-pc.webp",
  "Jude Bellingham": "https://madridistareal.com/wp-content/uploads/2025/10/jude-bellingham-seleccion-inglaterra.webp",
  "Federico Valverde": "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQVGVHfLKLErylkFY-VP1pRAGiSJ3vShGjTtg&s",
  "Dani Olmo": "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTgT9_Gc4_Sbrzpp_R2uMHlF5f87Itc96m-dB-mmk7tIv8MCtJHTCPIt2dq&s=10",
  "Nico Williams": "https://upload.wikimedia.org/wikipedia/commons/thumb/c/cf/Nico_Williams_Argentina_v_Spain_19_July_2026-196_%28cropped%29.jpg/960px-Nico_Williams_Argentina_v_Spain_19_July_2026-196_%28cropped%29.jpg?utm_source=en.wikipedia.org&utm_campaign=index&utm_content=thumbnail",
  "Rodri": "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTdeincSn2lB4cuwiR8DtXmeAHwN9gchVEZKzQM1D550FCSDs3u0IEaFFk&s=10",
  "Unai Sim\u00f3n": "https://www.sdpnoticias.com/resizer/v2/LBK5OD3L6NE4TPOTVW757IEOLI.jpg?smart=true&auth=6b2a89b832e3a59594590066863a9bb0813aa1c184cfd85c59915931bfe5b75b&width=672&height=735",
  "Vin\u00edcius J\u00fanior": "https://www.elespectador.com/resizer/v2/5IJ7ITUS3JG7LJAN4OO5PUKPOU.jpg?auth=d445cf9e8ddd899a40813b58e68eb2d085fce0c3a3bd44dea2364cf72e4eea8d&width=910&height=606&smart=true&quality=70",
  "Pau Victor": "https://imgresizer.eurosport.com/unsafe/1200x0/filters:format(jpeg)/origin-imgresizer.eurosport.com/2025/01/26/image-2b8b16f4-e478-4007-8fb5-5796393eaa55-85-2560-1440.jpeg"
};

const imagenRespaldo = "https://images.unsplash.com/photo-1574629810360-7efbbe195018?auto=format&fit=crop&w=640&q=80";
const jugadores = [
  ["Lamine Yamal", "Barcelona", "Extremo", "Legendaria", "Espa\u00f1a", 950],
  ["Pedri", "Barcelona", "Mediocampista", "\u00c9pica", "Espa\u00f1a", 800],
  ["Gavi", "Barcelona", "Mediocampista", "Rara", "Espa\u00f1a", 700],
  ["Pau Cubars\u00ed", "Barcelona", "Defensa", "\u00c9pica", "Espa\u00f1a", 650],
  ["Kylian Mbapp\u00e9", "Real Madrid", "Delantero", "Legendaria", "Francia", 980],
  ["Jude Bellingham", "Real Madrid", "Mediocampista", "\u00c9pica", "Inglaterra", 900],
  ["Vin\u00edcius J\u00fanior", "Real Madrid", "Extremo", "Legendaria", "Brasil", 950],
  ["Federico Valverde", "Real Madrid", "Mediocampista", "Rara", "Uruguay", 820],
  ["Dani Olmo", "Espa\u00f1a", "Mediocampista", "\u00c9pica", "Espa\u00f1a", 750],
  ["Nico Williams", "Espa\u00f1a", "Extremo", "Rara", "Espa\u00f1a", 720],
  ["Rodri", "Espa\u00f1a", "Mediocampista", "Legendaria", "Espa\u00f1a", 920],
  ["Unai Sim\u00f3n", "Espa\u00f1a", "Portero", "Rara", "Espa\u00f1a", 600],
  ["Pau Victor", "Espa\u00f1a", "Delantero", "\u00c9pica", "Espa\u00f1a", 300]
].map(([nombre, equipo, posicion, rareza, pais, valor]) => ({
  nombre, equipo, posicion, rareza, pais, valor,
  imagen: imagenes[nombre] || imagenRespaldo
}));

const preguntas = [
  { pregunta: "\u00bfC\u00f3mo se llama el estadio del FC Barcelona?", respuesta: "Camp Nou", equipo: "Barcelona", dificultad: "f\u00e1cil" },
  { pregunta: "\u00bfQu\u00e9 selecci\u00f3n gan\u00f3 la Eurocopa 2024?", respuesta: "Espa\u00f1a", equipo: "Espa\u00f1a", dificultad: "f\u00e1cil" },
  { pregunta: "\u00bfC\u00f3mo se conoce al Real Madrid?", respuesta: "Merengues", equipo: "Real Madrid", dificultad: "media" },
  { pregunta: "\u00bfDe qu\u00e9 pa\u00eds es Kylian Mbapp\u00e9?", respuesta: "Francia", equipo: "Real Madrid", dificultad: "media" },
  { pregunta: "\u00bfQu\u00e9 colores identifican al Barcelona?", respuesta: "Azulgrana", equipo: "Barcelona", dificultad: "dif\u00edcil" }
];

async function sembrar() {
  await conectarBaseDeDatos();
  await Promise.all([
    Jugador.deleteMany({}),
    Pregunta.deleteMany({}),
    Coleccion.deleteMany({}),
    Usuario.deleteMany({ correo: { $in: ["admin@album.local", "demo@album.local"] } })
  ]);
  const password = await bcrypt.hash("demo123", 12);
  const [admin, demo] = await Usuario.create([
    { nombre: "Administrador", correo: "admin@album.local", password, rol: "admin" },
    { nombre: "Usuario Demo", correo: "demo@album.local", password }
  ]);
  const cartas = await Jugador.insertMany(jugadores);
  await Pregunta.insertMany(preguntas);
  await Coleccion.create([
    { usuarioId: admin._id, cartas: cartas.slice(0, 3).map(carta => carta._id) },
    { usuarioId: demo._id, cartas: cartas.slice(3, 6).map(carta => carta._id) }
  ]);
  console.log("Base de datos inicializada correctamente en la colección 'jugadores'.");
  await mongoose.disconnect();
}

sembrar().catch(async error => {
  console.error("Error al sembrar:", error.message);
  await mongoose.disconnect();
  process.exit(1);
});
