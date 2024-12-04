const arrayToChunks = (rows, n = 50) => {
  if (!Array.isArray(rows)) {
    return [];
  }

  const chunks = [];
  let i = 0;

  while (i < rows.length) {
    chunks.push(rows.slice(i, (i += n)));
  }

  return chunks;
};

module.exports = arrayToChunks;
