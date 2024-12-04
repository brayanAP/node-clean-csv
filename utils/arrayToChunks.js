const arrayToChunks = (rows, n = 50) => {
  const chunks = [];
  let i = 0;

  while (i < rows.length) {
    chunks.push(rows.slice(i, (i += n)));
  }

  return chunks;
};

module.exports = arrayToChunks;
