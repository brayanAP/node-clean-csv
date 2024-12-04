const secondsToHHMMSS = (seconds) => {
  if (typeof seconds !== "number") {
    return null;
  }

  const hours = Math.floor(seconds / 3600)
    .toString()
    .padStart(2, "0");
  const minutes = Math.floor((seconds % 3600) / 60)
    .toString()
    .padStart(2, "0");
  const remainingSeconds = Math.floor(seconds % 60)
    .toString()
    .padStart(2, "0");

  return `${hours}:${minutes}:${remainingSeconds}`;
};

module.exports = secondsToHHMMSS;
