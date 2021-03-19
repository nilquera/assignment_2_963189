const path = require("path");
const { exec } = require("child_process");

const BASE_DIR = path.resolve(__dirname, "..");
const INDEX = path.resolve(BASE_DIR, "index.js");

const CRONJOB = `50 0 \\* \\* \\* cd \\"${BASE_DIR}\\" \\&\\& node \\"${INDEX}\\"`;
const command = `crontab -l | { cat; echo ${CRONJOB}; } | crontab -`;

exec(command, (err, stdout, stderr) => {});
