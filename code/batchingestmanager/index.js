/** batchingestmanager
 *
 * This program manages the batch ingestion of CSV files in mysimbdp.
 *
 * Don't run this program directly. You should follow the installation procedure (scripts/install.sh).
 * Cron will be responsible of running this program in the scheduled times.
 *
 * When executed, this program does the following:
 * 1) Check the client-staging-input-directory to see if it is empty.
 * 2) If the directory contains CSV files, take as many files as possible without surpassing the profile's MB threshold.
 * 3) With the ready-to-upload files, run the tenant's ingest task (clientbatchingestapp).
 * 4) The ingest task will return the files successfully uploaded. Move those files to a temporary directory.
 * 5) Record logs about ingestion time, data size, number of files, etc.
 */
const fs = require("fs");
const path = require("path");
const winston = require("winston");
const filterUploadable = require("./helpers/filterUploadable");
const parseHrtimeToSeconds = require("./helpers/parseHrtimeToSeconds");
const { getFileArraySize } = require("./helpers/getFileSize");
const { fork } = require("child_process");
require("dotenv").config();

const logger = winston.createLogger({
  level: "info",
  format: winston.format.json(),
  defaultMeta: { service: "batchingestmanager" },
  transports: [
    new winston.transports.File({ filename: "error.log", level: "error" }),
    new winston.transports.File({ filename: "combined.log" }),
  ],
});

fs.readdir(process.env.CLIENT_STAGING_INPUT_DIRECTORY, function (err, files) {
  if (err) {
    if (err.errno == -2) {
      console.error("Directory not found");
    } else console.error("Unknown error when reading the directory");
  } else {
    if (files.length) {
      let csvsFound = false;
      for (file of files) {
        if (path.extname(file) === ".csv") {
          csvsFound = true;
          break;
        }
      }
      if (csvsFound) {
        const fullPathFiles = files.map((file) =>
          path.join(`${process.env.CLIENT_STAGING_INPUT_DIRECTORY}`, file)
        );

        // Depending on process.env.PROFILE, maybe not all files can be uploaded
        const filesToUpload = filterUploadable(fullPathFiles);

        runIngestion(filesToUpload);
      }
    } else {
      console.log("Directory empty");
    }
  }
});

const runIngestion = (files) => {
  var dir = path.join(process.env.CLIENT_STAGING_INPUT_DIRECTORY, "../.tmp");
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir);
  }

  const log = {
    time: new Date(),
  };

  const appPath = process.env.CLIENTBATCHINGESTAPP_PATH;
  const startTime = process.hrtime();
  const n = fork(appPath, files);

  n.on("message", (m) => {
    log.status = m.status;
    log.numOfFiles = m.uploadedFiles.length;
    log.ellapsedTime = parseHrtimeToSeconds(process.hrtime(startTime));

    const uploadedMB =
      Math.round(getFileArraySize(m.uploadedFiles) * 1000) / 1000;
    log.dataSize = uploadedMB;

    console.log(log);

    console.log("[Info] Uploaded MB: ", uploadedMB);

    // Move file to a temp directory
    for (file of m.uploadedFiles) {
      fs.rename(file, path.join(dir, path.basename(file)), (err) => {
        if (err) console.error(err);
      });
    }
  });
};
