const fs = require("fs");

const getFileSize = (filename) => {
  const stats = fs.statSync(filename);
  const fileSizeInMBytes = stats.size / (1024 * 1024);
  return fileSizeInMBytes;
};

const getFileArraySize = (files) => {
  let totalSize = 0;
  for (file of files) {
    const fileSize = getFileSize(file);
    totalSize += fileSize;
  }
  return totalSize;
};

exports.getFileSize = getFileSize;
exports.getFileArraySize = getFileArraySize;
