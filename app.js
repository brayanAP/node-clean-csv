require('dotenv').config()
const fs = require("fs");
const path = require("path");
const csv = require("fast-csv");
const OpenAI = require("openai");

const secondsToHHMMSS = require("./utils/secondsToHHMMSS");
const formatPhone = require("./utils/formatPhone");
const formatEmail = require("./utils/formatEmail");
const formatFullName = require("./utils/formatFullName");
const arrayToChunks = require("./utils/arrayToChunks");

const FILE_INPUT = path.resolve(__dirname, "input.csv");
const OUTPUT_DIR = path.resolve(__dirname, "output");
const FILE_OUTPUT_CLEAN = path.resolve(OUTPUT_DIR, "clean.csv");;
const FILE_OUTPUT_ERRORS = path.resolve(OUTPUT_DIR, "errors.csv");

const getRows = new Promise((resolve) => {
  if (!fs.existsSync(FILE_INPUT)) {
    console.error(`Archivo no encontrado: ${FILE_INPUT}`);
    process.exit(1);
  }

  const rowsClean = [];
  const rowsErrors = [];

  fs.createReadStream(FILE_INPUT)
    .pipe(
      csv.parse({
        headers: (headers) => {
          const headerCount = {};
          return headers.map((header) => {
            if (headerCount[header]) {
              headerCount[header]++;
              return `${header}_${headerCount[header]}`;
            } else {
              headerCount[header] = 1;
              return header;
            }
          });
        },
      })
    )
    .on("data", (row) => {
      const phone = formatPhone(row["Móvil"], row["Teléfono alternativo"]);
      const email = formatEmail(row["Correo"]);
      const fullname = formatFullName(row["Contacto"]);

      if (fullname.toLowerCase().includes("prueba") || email.toLowerCase().includes("prueba") || phone.toLowerCase().includes("prueba")) {
        rowsErrors.push(row);
        return;
      }

      if (phone === "UNKNOWN" && email === "UNKNOWN") {
        rowsErrors.push(row);
        return;
      }

      row["Contacto"] = fullname;
      row["Móvil"] = phone;
      row["Correo"] = email;

      rowsClean.push(row);
    })
    .on("end", () => resolve([rowsClean, rowsErrors]))
    .on("error", () => resolve([rowsClean, rowsErrors]));
});

const openai = new OpenAI({
  apiKey: process.env.OPEN_AI_KEY,
});

const convertWithOpenai = async (data) => {
  const completion = await openai.chat.completions.create({
    messages: [
      {
        role: "system",
        content: `
Recibirás una lista de nombres en español, los cuales pueden estar incompletos, abreviados o carecer de coherencia como nombres típicos mexicanos. Sigue las siguientes reglas para procesarlos:
  1. Si el nombre no tiene coherencia con un nombre mexicano:
  1.1. Coloca todo el contenido en el campo "Nombres".
  1.2.	Deja los campos "ApellidoM" (apellido materno) y "ApellidoP" (apellido paterno) vacíos.
  2.	Si el nombre está abreviado:
  2.1.	Reconstruye el nombre lo más cercano posible a un nombre mexicano y colócalo en el campo "Nombres".
  2.2	Si los apellidos (materno y paterno) están abreviados, colócalos en los campos "ApellidoM" y "ApellidoP" según corresponda. Si no hay apellidos, déjalos vacíos.
  3.	Devuélveme un arreglo (array) de objetos con los campos "nombres", "ApellidoM", y "ApellidoP" en el siguiente formato JSON:

Ejemplo de salida:

{
    "result": [
        {
            "Nombres": "Mere", // Uno o más nombres
            "ApellidoM": "García", // Apellido Materno (puede estar vacío)
            "ApellidoP": "De La Cruz" // Apellido Paterno (puede estar vacío)
        }
    ]
}

Asegúrate de respetar el formato JSON en la respuesta.
`,
      },
      {
        role: "user",
        content: data.map((row) => `${row["Contacto"]}`).join("\n"),
      },
    ],
    model: "gpt-4o-mini",
    temperature: 0.3,
    response_format: {
      type: "json_object",
    },
  });

  const jsonResp = JSON.parse(completion.choices.at(0)?.message?.content || "[]");

  return jsonResp;
};

getRows.then(([rowsClean, rowsErrors]) => {
  const chunks = arrayToChunks(rowsClean);

  const rowsCleanWithOpenai = [];

  const processChunks = async () => {
    console.clear();
    console.log(`- Procesando [${chunks.length} chunks] [${rowsClean.length} registros]`);

    let currentChunk = 0;
    let totalSeconds = 0;

    for (const chunk of chunks) {
      const start = new Date();

      const chunkWithOpenai = await convertWithOpenai(chunk);

      const chunkWithOpenaiWithOriginal = chunk.map((row, index) => {
        return {
          ...row,
          ...chunkWithOpenai.result[index],
        };
      });

      rowsCleanWithOpenai.push(...chunkWithOpenaiWithOriginal);

      const end = new Date();

      currentChunk++;

      const seconds = (end.getTime() - start.getTime()) / 1000;
      totalSeconds += seconds;

      console.log(`-- Procesado [${currentChunk}/${chunks.length} chunks] [${rowsCleanWithOpenai.length}/${rowsClean.length} registros] [${seconds} segundos]`);
    }

    const csvClean = csv.format({ headers: true });

    if (!fs.existsSync(OUTPUT_DIR)) {
      fs.mkdirSync(OUTPUT_DIR);
    } else {
      fs.rmSync(OUTPUT_DIR, { recursive: true });
      fs.mkdirSync(OUTPUT_DIR);
    }

    csvClean.pipe(fs.createWriteStream(FILE_OUTPUT_CLEAN));

    rowsCleanWithOpenai.forEach((row) => {
      csvClean.write(row);
    });

    csvClean.end();

    console.log(`--- CSV limpio guardado en [${FILE_OUTPUT_CLEAN}]`);

    const csvErrors = csv.format({ headers: true });

    csvErrors.pipe(fs.createWriteStream(FILE_OUTPUT_ERRORS));

    rowsErrors.forEach((row) => {
      csvErrors.write(row);
    }
      
      );

    csvErrors.end();

    console.log(`--- CSV de errores guardado en [${FILE_OUTPUT_ERRORS}]`);

    console.log(`--- Procesado finalizado en [${secondsToHHMMSS(totalSeconds)}]`);
  };

  processChunks();
});
