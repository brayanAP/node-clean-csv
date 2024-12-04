const formatPhone = (phone, alternativePhone) => {
  const phoneUnCleaned = alternativePhone?.length > 10 ? alternativePhone : phone;

  if (phoneUnCleaned === "UNKNOWN") {
    return "UNKNOWN";
  }

  let phoneClean = phoneUnCleaned.replace(/[^\d+]/g, "");

  if (phoneClean.length > 12 && !phoneClean.startsWith("+") && !phoneClean.startsWith("52")) {
    return "UNKNOWN";
  }

  phoneClean = `+52${phoneClean.slice(-10)}`;

  if (phoneClean.length !== 13) {
    return "UNKNOWN";
  }

  return phoneClean;
};

module.exports = formatPhone;
