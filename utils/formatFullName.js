const formatFullName = (name) => {
  let cleanName = name.toLowerCase().trim();

  cleanName = cleanName.replace(/desconocido/g, "").trim();

  if (cleanName === "") {
    return "UNKNOWN";
  }

  cleanName = cleanName.replace(/x+/g, "");
  cleanName = cleanName.replace(/-/g, "");
  cleanName = cleanName.replace(/\w\S*/g, (w) => w.replace(/^\w/, (c) => c.toUpperCase())).trim();

  return cleanName;
};

module.exports = formatFullName;
