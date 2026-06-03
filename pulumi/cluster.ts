
import * as alicloud from "@pulumi/alicloud";

import { alicloudProvider } from './alicloud-provider';
import { prefix, zone, region } from './config';
import { nodeType, nodeCount, diskSize } from './config';

const vpc = new alicloud.vpc.Network(
    "vpc",
    {
        vpcName: prefix + "-vpc",
        cidrBlock: "10.0.0.0/8",
    },
    { provider: alicloudProvider }
);

const vswitch = new alicloud.vpc.Switch(
    "vswitch",
    {
        vswitchName: prefix + "-vswitch",
        vpcId: vpc.id,
        cidrBlock: "10.1.0.0/16",
        zoneId: zone,
    },
    { provider: alicloudProvider }
);

export const cluster = new alicloud.cs.ManagedKubernetes(
    "cluster",
    {
        name: prefix,
        vswitchIds: [vswitch.id],
        podCidr: "192.168.0.0/16",
        serviceCidr: "172.16.0.0/16",
        newNatGateway: true,
        clusterSpec: "ack.standard",
        deletionProtection: false,
    },
    {
        provider: alicloudProvider,
    }
);

export const nodePool = new alicloud.cs.NodePool(
    "node-pool",
    {
        nodePoolName: prefix + "-pool1",
        clusterId: cluster.id,
        vswitchIds: [vswitch.id],
        instanceTypes: [nodeType],
        desiredSize: nodeCount.toString(),
        systemDiskCategory: "cloud_essd",
        systemDiskSize: diskSize,
    },
    {
        provider: alicloudProvider,
    }
);
