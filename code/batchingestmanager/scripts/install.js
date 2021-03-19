const path = require("path");
const { exec } = require("child_process");

let config;

try {
  config = require("../tenant.json");
} catch (err) {
  console.error("Create a tenant.json configuration file before installing.");
  return 1;
}

const BASE_DIR = path.resolve(__dirname, "..");
const INDEX = path.resolve(BASE_DIR, "index.js");

const CRONJOB = `${config.ingest_minute} ${config.ingest_hour} \\* \\* \\* cd \\"${BASE_DIR}\\" \\&\\& node \\"${INDEX}\\"`;
const command = `crontab -l | { cat; echo ${CRONJOB}; } | crontab -`;

exec(command);
