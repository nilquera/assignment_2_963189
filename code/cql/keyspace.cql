CREATE KEYSPACE coredms WITH
    replication = {'class': 'NetworkTopologyStrategy',
                    'europe-north1': 3,
                    'europe-west1': 3};
