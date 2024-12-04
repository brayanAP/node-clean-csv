const formatEmail = (email) => {
  if (email === "UNKNOWN" || email === "-" || email === "" || email.startsWith("desconocido")) {
    return "UNKNOWN";
  }

  return email.replace(/\s/g, "");
};

module.exports = formatEmail;
