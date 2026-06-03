
import * as pulumi from "@pulumi/pulumi";
import * as alicloud from "@pulumi/alicloud";

import { cluster } from './cluster';
import { alicloudProvider } from './alicloud-provider';

const clusterCreds = cluster.id.apply(id =>
    alicloud.cs.getKubernetesPermission({
    }).then(() => {
        return alicloud.cs.getClusterCredential({
            clusterId: id,
            temporaryDurationMinutes: 480,
        });
    })
);

export const kubeconfig = cluster.connections.apply(
    conn => {
        const apiServerUrl = conn?.apiServerInternet || conn?.apiServerIntranet || "";
        return pulumi.output(clusterCreds).apply(
            creds => {
                const config = {
                    apiVersion: "v1",
                    kind: "Config",
                    "current-context": "context",
                    clusters: [
                        {
                            name: "cluster",
                            cluster: {
                                "certificate-authority-data": creds.certificateAuthority,
                                server: apiServerUrl,
                            },
                        }
                    ],
                    contexts: [
                        {
                            name: "context",
                            context: {
                                cluster: "cluster",
                                user: "user",
                            },
                        }
                    ],
                    users: [
                        {
                            name: "user",
                            user: {
                                "client-certificate-data": creds.clusterCert,
                                "client-key-data": creds.clusterKey,
                            },
                        }
                    ],
                    preferences: {}
                };

                return JSON.stringify(config);
            }
        );
    }
);
