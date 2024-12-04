const fs = require("fs");
const csv = require("fast-csv");

const csvToArray = (filePath, formatRow = (row) => row, validateRow = (row) => row) =>
  new Promise((resolve, reject) => {
    if (!fs.existsSync(filePath)) {
      throw new Error(`Archivo no encontrado [${filePath}]`);
    }

    const rowsClean = [];
    const rowsErrors = [];

    fs.createReadStream(filePath)
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
        const formattedRow = formatRow(row);

        if (!validateRow(formattedRow)) {
          rowsErrors.push(formattedRow);
          return;
        }

        rowsClean.push(formattedRow);
      })
      .on("error", (error) => reject(error))
      .on("end", () => resolve([rowsClean, rowsErrors]));
  });

module.exports = csvToArray;
