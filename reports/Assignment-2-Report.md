# This your assignment report

It is a free form. you can add:

* your designs
* your answers to questions in the assignment
* your test results
* etc.

The best way is to have your report written in the form of point-to-point answering the assignment.


# Ingestion with batch

**1. The ingestion will be applied to files of data as data sources. Design a set of constraints for files that mysimbdp will support for ingestion. Design a set of constraints for the tenant service profile w.r.t. ingestion (e.g., number of files, data sizes). Explain why you as a platform provider decide such constraints. Implement these constraints into simple configuration files and provide examples (e.g., JSON or YAML). (1 point)**

First of all, I will use tortoise's data from korkeasaari zoo as I did in the first assignment. I will also try to follow up with the same technologies (i.e. Cassandra and NodeJS) as the first assignment.

The constraints for files are pretty much the same as in the first assignment. The files have to be CSVs and they can contain the following parameters: dev_id, month, ts, acceleration, acceleration_x, acceleration_y, acceleration_z, battery, humidity, pressure, temperature. However, if a tenant has his own agreement and a dedicated database, he can ask for specific parameters.

In my case, CSVs ingestion is performed row by row. So limiting the number of files or the file size makes no sense. Basically, I will define three different tenant service profiles in order to control the amount of data a tenant can upload to mysimbdp. They will be profile S, profile M and profile L. To achieve this, we will need an authorization mechanism that recognizes a user and his/her profile, being able to limit his/her data bandwidth.

The korkeasaari zoo data only contains aproximately 390MiB of data for a year and a half (half of the CSVs are empty). Of course, this is for a single ruuvitag (monitoring device). A single ruuvitag CSV contains data for a whole day, with a new row every 5 seconds. These files don't weight more than 1.8MiB. So, in a real world scenario, each ruuvitag would produce ~1.8MiB per day. I believe we can assume this for every existing ruuvitag device. The main difference between tenants will be the amount of ruuvitags (or any other similar device) they have.

I will allow three modes of batch ingestion: daily, weekly and monthly. Tenants will be able to decide which of them they use. Daily mode uploads the produced file every day at the same hour. Weekly does it once per week and monthly once per month.

The different service profiles will be:
- profile S: intended for a maximum number of 10 ruuvitags. The maximum estimated data production is of 18 MiB per day. This profile will have a bandwidth constraint of **20 MiB** per day, 140 MiB per week or 600 MiB per month.
- profile M: intended for a maximum number of 50 ruuvitags. The maximum estimated data production is of 90 MiB per day. This profile will have a bandwidth constraint of **90 MiB** per day, 630 MiB per week or 2,700 MiB per month.
- profile L: intended for a maximum number of 100 ruuvitags. The maximum estimated data production is of 180 MiB per day. This profile will have a bandwidth constraint of **180 MiB** per day, 1,260 MiB per week or 5,400 MiB per month.

**2. Each tenant will put its files to be ingested into a directory, client-staging-input-directory within mysimbdp. Each tenant provides ingestion programs/pipelines, clientbatchingestapp, which will take the tenant's files as input, in client-staging-input-directory, and ingest the files into the final sink mysimbdp-coredms. Any clientbatchingestapp must perform at least one type of data wrangling. As a tenant, explain the design of clientbatchingestapp and provide one implementation. Note that clientbatchingestapp follows the guideline of mysimbdp given in the next Point 3. (1 point)**

First, we assume that client-staging-input-directory will have different sources. However, all the data stored in this folder will be treated in the same way. If a tenant is interested in having multiple batch processes with different configurations, he will have to configure it himself, creating a folder and configuration for each type. The configuration of the whole management and ingestion process will be stored in a json file following the next schema (it is a JSON schema based on the official guidelines [https://json-schema.org/](https://json-schema.org/)):

```json
{
    "$schema": "https://json-schema.org/draft/2020-12/schema",
    "$id": "https://github.com/nilquera/assignment_2_963189/tree/master/code/clientbatchingestapp/configuration-schema.json",
    "title": "Configuration",
    "description": "Configuration for clientbatchingestapp",
    "type": "object",
    "properties": {
        "tenantId": {
            "description": "id of the tenant using the clientbatchingestapp",
            "type": "integer"
        },
        "clientbatchingestappPath": {
            "description": "full path of the clientbatchingestapp responsible of uploading files into mysimbdp.",
            "type": "string",
        },
        "profile": {
            "description": "profile of the tenant. Small, Medium or Large",
            "type": "string",
            "enum": ["s", "m", "l"]
        },
        "uploadDate": {
            "description": "the date when the tenant would like to upload the data, represented following the RFC 3339 standard. E.g: 2021-11-13T20:20:39+00:00. If the uploadFrequency is daily, uploads will be repeated every day at the same time; Similarly for weekly and monthly updates."
        },
        "uploadFrequency": {
            "description": "the frequency of the data upload. Can be daily, weekly or monthly.",
            "type": "string",
            "enum": ["d", "w", "m"]
        }
    }
}

```
An example configuration could be the following one. Basically, it means that the tenant will upload, once per month, a maximum of 2,700 MiB. It will be uploaded the 26th of every month at 20:39.
```json
{
    "tenantId": 1,
    "clientbatchingestappPath": "/home/username/clientbatchingestapp",
    "profile": "m",
    "uploadTime": "2021-1-26T20:20:39+00:00",
    "uploadFrequency": "m"
}
```

As we can see, the tenant can define the profile of his services, which will limit the clientbatchingestapp to a certain bandwidth. However, the mysimbdp database will ensure that the tenant identified by "tenantId" doesn't surpass his limit. When running the clientbatchingestapp for the first time, the tenant will have to identify himself providing a username and a password. An API will provide a JWT in a successful authentication, which will be sent with every upload request to the mysimbdp.

**3. As mysimbdp provider, design and implement a component mysimbdp-rr that invokes tenant's clientbatchingestapp to perform the ingestion when files are available in client-staging-input-directory. mysimbdp imposes the model that clientbatchingestapp has to follow. Explain how mysimbdp-rr schedules the execution of clientbatchingestapp for tenants. (1 point)**

rr will be a simple program managed by cron, a linux software utility to schedule jobs. Previously, an install script will need to be run. It will check the json configuration file and create a cron job in order to run rr periodically. This way, rr doesn't need to care about the configuration of the tenant. It simply performs the following tasks every time it is run:
1. Check the client-staging-input-directory to see if it is empty
2. If there are files, run the given ingest task (clientbatchingestapp)
3. If no files are found, stop.

**4. Explain your design for the multi-tenancy model in mysimbdp: which parts of mysimbdp will be shared for all tenants, which parts will be dedicated for individual tenants so that you as a platform provider can add and remove tenants based on the principle of pay-per-use. Develop test programs (clientbatchingestapp), test data, and test profiles for tenants according your choice of provisioning models. Show the performance of ingestion tests, including failures and exceptions, for at least 2 different tenants in your test environment and constraints. (1 point)**

In my previous assignment, mysimbdp-coredms had de metrics table where all data is stored. In this assignment, I will create a common database for basic users and allow specific users to request their own databases. They can even decide the size of their storage (with some limitations) and the partitioning and replication strategies. Of course, this would be subject to the extra costs. We would need to create tenant plans based on how much storage, partitioning and replication they want.

Also, there will be a small database dedicated to tenant management. An API in mysimbdp-daas will allow tenants to authenticate first. Any further communication between the tenant and mysimbdb-coredms (to upload files) will request a valid authorization token. 

**5. Implement and provide logging features for capturing successful/failed ingestion as well as metrics about ingestion time, data size, etc., for files which have been ingested into mysimbdp. Logging information must be stored in separate files, databases or a monitoring system for analytics of ingestion. Provide and show simple statistical data extracted from logs for individual tenants and for the whole platform with your tests. (1 point)**

The mysimbdp-batchingestmanager will log most of the data. Every time it runs, it will record the logs related to the ingestion process.

# Near-realtime ingestion

**1. Tenants will put their data into messages and send the messages to a messaging system, mysimbdp-messagingsystem (provisioned by mysimbdp) and tenants will develop ingestion programs, clientstreamingestapp, which read data from the messaging system and ingest data into mysimbdp-coredms. For near-realtime ingestion, explain your design for the multi-tenancy model in mysimbdp: which parts of the mysimbdp will be shared for all tenants, which parts will be dedicated for individual tenants so that mysimbdp can add and remove tenants based on the principle of pay-per-use. Design and explain a set of constraints for the tenant service profile w.r.t. data ingestion. (1 point)**

2. Design and implement a component mysimbdp-streamingestmanager, which invokes on-demand clientstreamingestapp (e.g., start, stop). mysimbdp imposes the model that clientstreamingestapp has to follow, explain the model. (1 point)

3. Develop test ingestion programs (clientstreamingestapp), test data, and test profiles for tenants. Show the performance of ingestion tests, including failures and exceptions, for at least 2 different tenants in your test environment. (1 point)

4. clientstreamingestapp decides to report the its processing rate, including average ingestion time, total ingestion data size, and number of messages to mysimbdp-streamingestmonitor within a pre-defined period of time. Design the report format and explain possible components, flows and the mechanism for reporting. (1 point)

5. Implement the feature in mysimbdp-streamingestmonitor to receive the report from clientstreamingestapp. Based on the report from clientstreamingestapp and the tenant profile, when the performance is below a threshold, e.g., average ingestion time is too low, or too many messages have to be processed, mysimbdp-streamingestmonitor decides to inform mysimbdp-streamingestmanager about the situation (e.g., mysimbdp-streamingestmanager may create more instances of clientstreamingestapp for the tenant or remove existing instances). Implementation the integration between mysimbdp- streamingestmonitor and mysimbdp-streamingestmanager. (1 point)

# Integration and Extension

**1. Produce an integrated architecture for the logging and monitoring of both batch and near-realtime ingestion features (Part 1, Point 5 and Part 2, Points 4-5) so that you as a platform provider could know the amount of data ingested and existing errors/performance for individual tenants. (1 point)

2. In the stream ingestion pipeline, assume that your tenant has to ingest the same data but to different sinks, e.g., mybdp-coredms for storage and a new mybdp-streamdataprocessing component, what features/solutions you can provide and recommend to your tenants? (1 point)

3. The tenant wants to protect the data during the ingestion using some encryption mechanisms, e.g., clientbatchingestapp and clientstreamingestapp have to deal with encrypted data. Which features/solutions you recommend the tenants and which services you might support them for this goal? (1 point)

4. In the case of batch ingestion, we want to (i) detect the quality of data to allow ingestion only for data with a pre-defined quality of data condition and (ii) store metadata, including detected quality, into the platform, how you, as a platform provider, and your tenants can work together? (1 point)

5. If a tenant has multiple clientbatchingestapp and clientstreamingestapp, each is suitable for a type of data and has different workloads (e.g., different CPUs, memory consumption and execution time), how would you extend your design and implementation in Parts 1 & 2 (only explain the concept/design) to support this requirement? (1 point)


