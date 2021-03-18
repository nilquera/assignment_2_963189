const fs = require("fs").promises;
const parse = require("csv-parse/lib/sync");
const Lock = require("./lock");
const cassandra = require("cassandra-driver");
const executeConcurrent = cassandra.concurrent.executeConcurrent;
require("dotenv").config();

const files = process.argv.slice(2);

const client = new cassandra.Client({
  contactPoints: [process.env.COREDMS_NODE1, process.env.COREDMS_NODE2],
  localDataCenter: process.env.COREDMS_LOCAL_DATACENTER,
  keyspace: "coredms",
});

let uploadedFiles = [];
(async () => {
  const concurrencyLevel =
    process.env.INGESTION_CONCURRENCY_LEVEL > 2048
      ? 2048
      : process.env.INGESTION_CONCURRENCY_LEVEL;

  for (file of files) {
    const content = await fs.readFile(file);
    const records = parse(content, {
      columns: process.env.CSV_COLUMNS ? true : false,
      delimiter: process.env.CSV_SEPARATOR,
    });

    const values = records.map((record) => {
      const date = new Date(Number(record.time));
      return [
        record["dev-id"],
        date.getMonth().toString(),
        Number(record.time),
        Number(record.acceleration),
        Number(record.acceleration_x),
        Number(record.acceleration_y),
        Number(record.acceleration_z),
        Number(record.battery),
        Number(record.humidity),
        Number(record.pressure),
        Number(record.temperature),
      ];
    });

    console.log("[Info] Rows read from file: ", values.length);

    const query =
      "INSERT INTO metrics (dev_id, month, ts, acceleration, acceleration_x, acceleration_y, acceleration_z, battery, humidity, pressure, temperature) VALUES (?,?,?,?,?,?,?,?,?,?,?)";

    try {
      const result = await executeConcurrent(client, query, values, {
        concurrencyLevel,
      });
      uploadedFiles.push(file);
    } catch (err) {
      console.log(err);
    }
  }

  if (uploadedFiles.length !== 0) {
    process.send({
      status: "success",
      uploadedFiles,
    });
  } else {
    process.send({
      status: "error",
      uploadedFiles,
    });
  }

  client.shutdown();
})();
