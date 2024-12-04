require('dotenv').config()
const fs = require("fs");
const path = require("path");
const csv = require("fast-csv");
const OpenAI = require("openai");

const secondsToHHMMSS = require("./utils/secondsToHHMMSS");
const formatPhone = require("./utils/formatPhone");
const formatEmail = require("./utils/formatEmail");
const formatFullName = require("./utils/formatFullName");

const FILE_INPUT = path.resolve(__dirname, "input.csv");
const OUTPUT_DIR = path.resolve(__dirname, "output");
const FILE_OUTPUT_CLEAN = path.resolve(OUTPUT_DIR, "clean.csv");;

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
            Te serán proveídos nombres en español donde no todos tienen coherencia o esten abreviados,
            En caso de no tener coherencia a un nombre mexicano, deberás de colocar todo el nombre en "nombres" y vacio en "apellidoM" y "apellidoP"
            Si est abrevidado, deberás de colocar lo mas cercano a un nombre mexicano en "nombres" y vacio en "apellidoM" y "apellidoP" los apellidos materno y paterno a un asi esten abreviados
            Debes regresarme un array con objetos que contengan el "nombres", "apellidoM" y "apellidoP",
            Debes de responder en formato JSON
    
            Ejemplo de salida:
            { 
                result: [
                    {
                        nombres: 'Mere', // Nombres, puede ser uno o más
                        apellidoM: 'García', // Apellido Materno
                        apellidoP: 'De La Cruz', //  Apellido Paterno
                    }
                ]
            }
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

getRows.then(([rowsClean]) => {
  const chunks = [];
  let i = 0;
  const n = 80;
  while (i < rowsClean.length) {
    chunks.push(rowsClean.slice(i, (i += n)));
  }

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

    console.log(`--- Procesado finalizado en [${secondsToHHMMSS(totalSeconds)}]`);
  };

  processChunks();
});
