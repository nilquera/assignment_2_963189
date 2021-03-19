const fs = require("fs").promises;
const parse = require("csv-parse/lib/sync");
const Lock = require("./lock");
const cassandra = require("cassandra-driver");
const executeConcurrent = cassandra.concurrent.executeConcurrent;
const config = require("./config.json");

const files = process.argv.slice(2);

const client = new cassandra.Client({
  contactPoints: [config.coredms_node1, config.coredms_node2],
  localDataCenter: config.coredms_local_datacenter,
  keyspace: "coredms",
});

let uploadedFiles = [];
(async () => {
  const concurrencyLevel =
    config.ingestion_concurrency_level > 2048
      ? 2048
      : config.ingestion_concurrency_level;

  for (file of files) {
    const content = await fs.readFile(file);
    const records = parse(content, {
      columns: config.csv_columns ? true : false,
      delimiter: config.csv_separator,
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
