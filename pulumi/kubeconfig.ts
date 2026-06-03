
import * as alicloud from "@pulumi/alicloud";

import { cluster } from './cluster';

export const kubeconfig = alicloud.cs.getClusterCredentialOutput({
    clusterId: cluster.id,
    temporaryDurationMinutes: 480,
}).kubeConfig;
