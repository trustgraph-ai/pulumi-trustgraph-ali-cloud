import * as pulumi from "@pulumi/pulumi";

jest.mock('@pulumi/kubernetes', () => {
    const pulumiSdk = jest.requireActual('@pulumi/pulumi');
    return {
        Provider: class extends pulumiSdk.ProviderResource {
            constructor(name: string, args?: any, opts?: any) {
                super('kubernetes', name, args, opts);
            }
        },
        core: { v1: {
            Namespace: class extends pulumiSdk.CustomResource {
                constructor(name: string, args?: any, opts?: any) {
                    super('kubernetes:core/v1:Namespace', name, args, opts);
                }
            },
            Secret: class extends pulumiSdk.CustomResource {
                constructor(name: string, args?: any, opts?: any) {
                    super('kubernetes:core/v1:Secret', name, args, opts);
                }
            },
            Service: {
                get: (name: string, id: any, opts?: any) => {
                    const res = new (class extends pulumiSdk.CustomResource {
                        public readonly status: any;
                        constructor() {
                            super('kubernetes:core/v1:Service', name, {}, opts);
                            this.status = pulumiSdk.output({
                                loadBalancer: { ingress: [{ ip: "1.2.3.4" }] }
                            });
                        }
                    })();
                    return res;
                },
            },
        }},
        yaml: { v2: { ConfigGroup: class extends pulumiSdk.CustomResource {
            constructor(name: string, args?: any, opts?: any) {
                super('kubernetes:yaml/v2:ConfigGroup', name, args, opts);
            }
        }}},
        helm: { v4: { Chart: class extends pulumiSdk.ComponentResource {
            public readonly resources: any;
            constructor(name: string, args?: any, opts?: any) {
                super('kubernetes:helm.sh/v4:Chart', name, {}, opts);
                resources.push({
                    type: 'kubernetes:helm.sh/v4:Chart',
                    name: name,
                    inputs: args || {},
                });
                this.resources = pulumiSdk.output([]);
                this.registerOutputs({ resources: this.resources });
            }
        }}},
        apiextensions: { CustomResource: class extends pulumiSdk.CustomResource {
            constructor(name: string, args?: any, opts?: any) {
                const apiVersion = args?.apiVersion || '';
                const kind = args?.kind || '';
                const type = apiVersion && kind
                    ? `kubernetes:${apiVersion.replace('/', '.')}:${kind}`
                    : 'kubernetes:apiextensions:CustomResource';
                super(type, name, args, opts);
            }
        }},
    };
});

jest.mock('fs', () => ({
    readFileSync: jest.fn().mockImplementation((path) => {
        if (path.includes('resources.yaml')) {
            return 'apiVersion: v1\nkind: Namespace\nmetadata:\n  name: trustgraph';
        }
        return '';
    }),
    writeFile: jest.fn(),
}));

interface MockResource {
    type: string;
    name: string;
    inputs: any;
}

const resources: MockResource[] = [];

describe("Infrastructure Tests", () => {
    beforeAll(async () => {
        pulumi.runtime.setMocks({
            newResource: function(args: pulumi.runtime.MockResourceArgs): {id: string, state: any} {
                resources.push({
                    type: args.type,
                    name: args.name,
                    inputs: args.inputs,
                });

                const state: any = {
                    ...args.inputs,
                    id: args.name + "_id",
                };

                if (args.type === "alicloud:cs/managedKubernetes:ManagedKubernetes") {
                    state.connections = {
                        apiServerInternet: "https://mock-api.aliyuncs.com",
                        apiServerIntranet: "https://mock-api-intranet.aliyuncs.com",
                    };
                }

                if (args.type === "kubernetes:core/v1:Service") {
                    state.status = { loadBalancer: { ingress: [{ ip: "1.2.3.4" }] } };
                }

                return { id: state.id, state };
            },
            call: function(args: pulumi.runtime.MockCallArgs) {
                if (args.token === "alicloud:cs/getClusterCredential:getClusterCredential") {
                    return {
                        kubeConfig: "mock-kubeconfig-content",
                    };
                }
                return args.inputs;
            },
        });

        pulumi.runtime.setAllConfig({
            "project:environment": "test",
            "project:region": "ap-southeast-1",
            "project:zone": "ap-southeast-1a",
            "project:dashscope-api-key": "mock-api-key",
            "project:domain": "ali1.dev.trustgraph.ai",
            "project:grafana-domain": "grafana.ali1.dev.trustgraph.ai",
            "project:letsencrypt-email": "admin@trustgraph.ai",
        });
    });

    test("should create infrastructure and export values", async () => {
        const infraModule = await import("../index");

        await new Promise(resolve => setTimeout(resolve, 200));

        expect(infraModule.iamToken).toBeDefined();
        expect(infraModule.grafanaPassword).toBeDefined();
        expect(infraModule.gatewayIp).toBeDefined();
        expect(infraModule.apiServerInternet).toBeDefined();
    });

    test("Alicloud resources", () => {
        const provider = resources.find(r => r.type === "pulumi:providers:alicloud");
        expect(provider).toBeDefined();

        const vpc = resources.find(r => r.type === "alicloud:vpc/network:Network");
        expect(vpc).toBeDefined();

        const vswitch = resources.find(r => r.type === "alicloud:vpc/switch:Switch");
        expect(vswitch).toBeDefined();

        const cluster = resources.find(r => r.type === "alicloud:cs/managedKubernetes:ManagedKubernetes");
        expect(cluster).toBeDefined();
        expect(cluster?.inputs.name).toBe("trustgraph-test");
        expect(cluster?.inputs.clusterSpec).toBe("ack.standard");

        const nodePool = resources.find(r => r.type === "alicloud:cs/nodePool:NodePool");
        expect(nodePool).toBeDefined();
        expect(nodePool?.inputs.nodePoolName).toBe("trustgraph-test-pool1");
        expect(nodePool?.inputs.instanceTypes).toEqual(["ecs.g9i.xlarge"]);
    });

    test("Kubernetes secrets", () => {
        const secrets = resources.filter(r => r.type === "kubernetes:core/v1:Secret");
        expect(secrets.length).toBeGreaterThanOrEqual(3);

        const iamSecret = secrets.find(s => s.inputs.metadata?.name === "iam-bootstrap-token");
        expect(iamSecret).toBeDefined();
        expect(iamSecret?.inputs.metadata.namespace).toBe("trustgraph");

        const grafanaSecret = secrets.find(s => s.inputs.metadata?.name === "grafana-secret");
        expect(grafanaSecret).toBeDefined();

        const aiSecret = secrets.find(s => s.inputs.metadata?.name === "openai-credentials");
        expect(aiSecret).toBeDefined();
    });

    test("ConfigGroup for application deployment", () => {
        const configGroup = resources.find(r => r.type === "kubernetes:yaml/v2:ConfigGroup" && r.name === "resources");
        expect(configGroup).toBeDefined();
        expect(configGroup?.inputs.skipAwait).toBe(true);
    });

    test("cert-manager namespace and Helm chart", () => {
        const ns = resources.find(
            r => r.type === "kubernetes:core/v1:Namespace" && r.inputs.metadata?.name === "cert-manager"
        );
        expect(ns).toBeDefined();

        const chart = resources.find(
            r => r.type === "kubernetes:helm.sh/v4:Chart" && r.name === "cert-manager"
        );
        expect(chart).toBeDefined();
        expect(chart?.inputs.chart).toBe("oci://quay.io/jetstack/charts/cert-manager");
        expect(chart?.inputs.version).toBe("v1.17.2");
        expect(chart?.inputs.namespace).toBe("cert-manager");
    });

    test("ClusterIssuer for Let's Encrypt", () => {
        const issuer = resources.find(
            r => r.type === "kubernetes:cert-manager.io.v1:ClusterIssuer"
        );
        expect(issuer).toBeDefined();
        expect(issuer?.inputs.metadata?.name).toBe("letsencrypt-prod");
        expect(issuer?.inputs.spec?.acme?.email).toBe("admin@trustgraph.ai");
        expect(issuer?.inputs.spec?.acme?.server).toContain("letsencrypt");
    });

    test("Nginx Gateway Fabric namespace and Helm chart", () => {
        const ns = resources.find(
            r => r.type === "kubernetes:core/v1:Namespace" && r.inputs.metadata?.name === "nginx-gateway"
        );
        expect(ns).toBeDefined();

        const chart = resources.find(
            r => r.type === "kubernetes:helm.sh/v4:Chart" && r.name === "nginx-gateway-fabric"
        );
        expect(chart).toBeDefined();
        expect(chart?.inputs.chart).toBe("oci://ghcr.io/nginx/charts/nginx-gateway-fabric");
        expect(chart?.inputs.version).toBe("1.6.2");
    });

    test("Gateway with 3 listeners", () => {
        const gateway = resources.find(
            r => r.type === "kubernetes:gateway.networking.k8s.io.v1:Gateway"
        );
        expect(gateway).toBeDefined();
        expect(gateway?.inputs.metadata?.name).toBe("trustgraph-gateway");
        expect(gateway?.inputs.metadata?.namespace).toBe("trustgraph");
        expect(gateway?.inputs.spec?.gatewayClassName).toBe("nginx");

        const listeners = gateway?.inputs.spec?.listeners;
        expect(listeners).toHaveLength(3);

        const http = listeners.find((l: any) => l.name === "http");
        expect(http?.port).toBe(80);

        const httpsUi = listeners.find((l: any) => l.name === "https-ui");
        expect(httpsUi?.port).toBe(443);
        expect(httpsUi?.hostname).toBe("ali1.dev.trustgraph.ai");

        const httpsGrafana = listeners.find((l: any) => l.name === "https-grafana");
        expect(httpsGrafana?.port).toBe(443);
        expect(httpsGrafana?.hostname).toBe("grafana.ali1.dev.trustgraph.ai");
    });

    test("TLS Certificates for UI and Grafana", () => {
        const uiCert = resources.find(
            r => r.type === "kubernetes:cert-manager.io.v1:Certificate" && r.name === "ui-cert"
        );
        expect(uiCert).toBeDefined();
        expect(uiCert?.inputs.spec?.secretName).toBe("ui-tls");
        expect(uiCert?.inputs.spec?.dnsNames).toContain("ali1.dev.trustgraph.ai");

        const grafanaCert = resources.find(
            r => r.type === "kubernetes:cert-manager.io.v1:Certificate" && r.name === "grafana-cert"
        );
        expect(grafanaCert).toBeDefined();
        expect(grafanaCert?.inputs.spec?.secretName).toBe("grafana-tls");
        expect(grafanaCert?.inputs.spec?.dnsNames).toContain("grafana.ali1.dev.trustgraph.ai");
    });

    test("HTTPRoutes for UI and Grafana", () => {
        const uiRoute = resources.find(
            r => r.type === "kubernetes:gateway.networking.k8s.io.v1:HTTPRoute" && r.name === "ui-route"
        );
        expect(uiRoute).toBeDefined();
        expect(uiRoute?.inputs.spec?.hostnames).toContain("ali1.dev.trustgraph.ai");
        expect(uiRoute?.inputs.spec?.rules?.[0]?.backendRefs?.[0]?.name).toBe("trustgraph-ui");
        expect(uiRoute?.inputs.spec?.rules?.[0]?.backendRefs?.[0]?.port).toBe(8888);

        const grafanaRoute = resources.find(
            r => r.type === "kubernetes:gateway.networking.k8s.io.v1:HTTPRoute" && r.name === "grafana-route"
        );
        expect(grafanaRoute).toBeDefined();
        expect(grafanaRoute?.inputs.spec?.hostnames).toContain("grafana.ali1.dev.trustgraph.ai");
        expect(grafanaRoute?.inputs.spec?.rules?.[0]?.backendRefs?.[0]?.name).toBe("grafana");
        expect(grafanaRoute?.inputs.spec?.rules?.[0]?.backendRefs?.[0]?.port).toBe(3000);
    });
});
