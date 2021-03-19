# This is a deployment/installation guide

This file contains a description to install and run the programs needed for Assignment 1.

# Requirements

The following packages are required to use the code in this Assignment:
- npm v7.0.3
- node v15.0.1
- docker-compose v1.27.4
- Docker v19.03.8

Also, this project was developed in an Ubuntu 18.04.4 LTS machine. However, it could be easily reproduced in other operative systems.

# Installation

## Cassandra cluster

You should create a cluster of cassandra nodes with docker. This will let you inspect the database. Follow the next steps from inside [code/cassandra](../code/cassandra) to create the cluster:

1) Run `docker-compose up -d cas1` to start the first server.
2) Check the cassandra logs (`docker logs -f cas1`) until the cassandra node is ready.
3) Run `docker-compose up -d cas3` to start the third server.
4) Again check logs to see the bootstrap process. You can also wait doing `docker exec -it cas3 nodetool status` until both cas1 and cas3 are shown.
4) Run the same booting command for cas2 and (if you have enough computing resources) cas3. Similarly, wait between the two nodes to ensure bootstrap consistency.
5) Finally, create the keyspace and the database. Use files inside [code/cql](../code/cql):
```
docker exec -i cas1 cqlsh -t < keyspace.cql
docker exec -i cas1 cqlsh -t < table.cql
```

## Batch ingestion

As a tenant, you will need to install two apps in order to run batch ingestion: batchingestmanager and clientbatchingestapp. 

### Mysimbdp-batchingestmanager
Batchingestmanager, which manages all the process, is provided by us and it can be installed following the next steps:

1) Go to [code/batchingestmanager](../code/batchingestmanager)] and run `npm install` to install the node modules.
2) Create a tenant.json configuration file and place it at the root of the batchingestmanager folder ([code/batchingestmanager](../code/batchingestmanager)]). The configuration parameters are explained in the [Configuration section](#configuration)
3) Run `npm run install`, which will install a cronjob in the system that runs batchingestmanager once a day.

Tips:
- Remember to place CSVs inside client-staging-input-directory
- You can run the batchingestmanager manually by typing `npm start`.

### Clientbatchingestapp

We provide a clientbatchingestapp example ready to be used, but we encourage tenants to write their own scripts. 

Any clientbatchingestapp must follow the next requirements:

- Clientbatchingestapp must be a NodeJS application.
- Clientbatchingestapp must only upload the list of CSVs given as arguments. They must be obtained from `process.argv.slice(2)`, which returns a list of CSVs. The CSVs will be given in full path format.
- It must read the given CSVs and try to insert their rows into mysimbdp-coredms.
- The app must give mysimbdp-batchingestmanager a list with the successfully uploaded CSVs. An IPC channel is stablished between mysimbdp-batchingestmanager and clientbatchingestapp. The clientbatchingestapp must send messages to the manager by using `process.send()` function.
- The message(s) must be a list of strings, each of them being the full path of a successfully uploaded CSV. For example:
```javascript
["/opt/mysimbdp/client-staging-input-directory/one.csv", "/opt/mysimbdp/client-staging-input-directory/two.csv", "/opt/mysimbdp/client-staging-input-directory/three.csv"]
```

With relation to the provided clientbatchingest, you can install it following the next steps:
1) Go to [code/clientbatchingestapp](../code/clientbatchingestapp)] and run `npm install` to install the node modules.
2) Create a config.json configuration file and place it at the root of the clientbatchingestapp folder ([code/clientbatchingestapp](../code/clientbatchingestapp)]). The configuration parameters are explained in the [Configuration section](#configuration)
3) You shouldn't run this app directly. However, you can test it works by running `npm start`.

### Configuration

A tenant configuration file is needed to run batchingestmanager successfully. The next json schema represents the needed fields of the configuration file, which must be named tenant.json and placed in the root folder of batchingestmanager.

```json
{
    "$schema": "https://json-schema.org/draft/2020-12/schema",
    "$id": "https://github.com/nilquera/assignment_2_963189/tree/master/code/clientbatchingestapp/configuration-schema.json",
    "title": "Configuration",
    "description": "Configuration for clientbatchingestapp",
    "type": "object",
    "properties": {
        "tenant_id": {
            "description": "id of the tenant using the clientbatchingestapp",
            "type": "integer"
        },
        "profile": {
            "description": "profile of the tenant. Small, Medium or Large",
            "type": "string",
            "enum": ["s", "m", "l"]
        },
        "clientbatchingestapp_path": {
            "description": "full path of the clientbatchingestapp folder which contains the script responsible of uploading files into mysimbdp.",
            "type": "string",
        },
        "client_staging_input_directory" : {
            "description": "full path of the directory where CSVs are dropped by ruuvitags",
            "type": "string"
        },
        "ingest_hour": {
            "description": "hour to run the ingestion process",
            "type": "integer",
            "maximum": 24,
            "minimum": 0
        },
        "ingest_minute": {
            "description": "minute to run the ingestion process",
            "type": "integer",
            "maximum": 59,
            "minimum": 0
        }
    }
}

```
An example configuration could be the following one.
```json
{
    "tenant_id": 12345,
    "profile": "s",
    "clientbatchingestapp_path": "/opt/mysimbdp/clientbatchingestapp",
    "client_staging_input_directory": "/opt/mysimbdp/client_staging_input_directory",
    "ingest_hour": 12,
    "ingest_minute": 0
}
```

Regarding the clientbatchingestapp, the following json is an example of configuration. You should create your own file at the root of the clientbatchingestapp directory named config.json.

```json
{
    "csv_separator": ",",
    "csv_rootdir": "../../data/",
    "csv_columns": 1,
    "csv_watch_interval": 1,
    "coredms_node1": "172.22.0.2",
    "coredms_node2": "172.22.0.3",
    "coredms_local_datacenter": "europe-north1",
    "ingestion_concurrency_level": 5
}
```
