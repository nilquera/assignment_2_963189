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
const config = require("./tenant.json");

const logger = winston.createLogger({
  level: "info",
  format: winston.format.combine(
    winston.format.timestamp({
      format: "YYYY-MM-DD HH:mm:ss",
    }),
    winston.format.errors({ stack: true }),
    winston.format.splat(),
    winston.format.json()
  ),
  defaultMeta: { service: "batchingestmanager" },
  transports: [
    new winston.transports.File({ filename: "log/error.log", level: "error" }),
    new winston.transports.File({ filename: "log/combined.log" }),
  ],
});

if (process.env.NODE_ENV !== "production") {
  logger.add(
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      ),
    })
  );
}

fs.readdir(config.client_staging_input_directory, function (err, files) {
  if (err) {
    if (err.errno == -2) {
      logger.log({
        level: "error",
        message: "CSVs directory not found",
      });
    } else {
      logger.log({
        level: "error",
        message: "Unknown error when opening CSVs directory",
      });
    }
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
          path.join(`${config.client_staging_input_directory}`, file)
        );

        // Depending on config.profile, maybe not all files can be uploaded
        const filesToUpload = filterUploadable(fullPathFiles);

        runIngestion(filesToUpload);
      }
    } else {
      logger.log({
        level: "warn",
        message: "CSVs directory is empty",
      });
    }
  }
});

const runIngestion = (files) => {
  var dir = path.join(config.client_staging_input_directory, "../.tmp");
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir);
  }

  const log = {
    time: new Date(),
  };

  const appPath = config.clientbatchingestapp_path;
  const startTime = process.hrtime();
  const n = fork(appPath, files);

  n.on("message", (m) => {
    log.status = m.status;
    log.numOfFiles = m.uploadedFiles.length;
    log.ellapsedTime = parseHrtimeToSeconds(process.hrtime(startTime));

    const uploadedMB =
      Math.round(getFileArraySize(m.uploadedFiles) * 1000) / 1000;
    log.dataSize = uploadedMB;

    logger.log({
      level: log.status === "success" ? "info" : "error",
      message: "CSV(s) ingested",
      ...log,
    });

    // Move file to a temp directory
    for (file of m.uploadedFiles) {
      fs.rename(file, path.join(dir, path.basename(file)), (err) => {
        if (err) {
          logger.log({
            level: "error",
            message: "Error when moving CSV to tmp directory",
            error: err,
            file,
          });
        }
      });
      logger.log({
        level: "info",
        message: "CSV moved to tmp directory",
        file,
      });
    }
  });
};
