const { getFileSize } = require("./getFileSize");
const config = require("../tenant.json");

module.exports = (files) => {
  const profile = config.profile;
  let maxSize;
  switch (profile) {
    case "s":
      maxSize = 20;
      break;
    case "m":
      maxSize = 90;
      break;
    case "l":
      maxSize = 180;
    default:
      maxSize = 20;
      break;
  }

  let filesToUpload = [];
  let size = 0;

  for (file of files) {
    const fileSize = getFileSize(file);
    if (size + fileSize > maxSize) break;
    else {
      size += fileSize;
      filesToUpload.push(file);
    }
  }

  return filesToUpload;
};
