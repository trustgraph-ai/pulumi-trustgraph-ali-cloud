import * as pulumi from "@pulumi/pulumi";

process.env.PULUMI_TEST_MODE = "true";

pulumi.runtime.setConfig("project:name", "trustgraph-ack");

jest.setTimeout(10000);

process.setMaxListeners(20);
