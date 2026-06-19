import * as pulumi from "@pulumi/pulumi";

pulumi.runtime.setMocks({
    newResource: function(args: pulumi.runtime.MockResourceArgs): {id: string, state: any} {
        return {
            id: args.inputs.name + "_id",
            state: args.inputs,
        };
    },
    call: function(args: pulumi.runtime.MockCallArgs) {
        return args.inputs;
    },
});

describe("Configuration Loading", () => {
    beforeEach(() => {
        pulumi.runtime.setAllConfig({
            "project:environment": "test",
            "project:region": "ap-southeast-1",
            "project:zone": "ap-southeast-1a",
            "project:domain": "ali1.dev.trustgraph.ai",
            "project:grafana-domain": "grafana.ali1.dev.trustgraph.ai",
            "project:letsencrypt-email": "admin@trustgraph.ai",
        });
    });

    afterEach(() => {
        jest.resetModules();
    });

    test("should load required configuration values", async () => {
        const config = await import("../config");

        expect(config.environment).toBe("test");
        expect(config.region).toBe("ap-southeast-1");
        expect(config.zone).toBe("ap-southeast-1a");
    });

    test("should load gateway configuration values", async () => {
        const config = await import("../config");

        expect(config.domain).toBe("ali1.dev.trustgraph.ai");
        expect(config.grafanaDomain).toBe("grafana.ali1.dev.trustgraph.ai");
        expect(config.letsencryptEmail).toBe("admin@trustgraph.ai");
    });

    test("should generate correct prefix based on environment", async () => {
        const config = await import("../config");

        expect(config.prefix).toBe("trustgraph-test");
    });

    test("should have correct node configuration", async () => {
        const config = await import("../config");

        expect(config.nodeType).toBe("ecs.g9i.xlarge");
        expect(config.nodeCount).toBe(3);
        expect(config.diskSize).toBe(40);
    });

    test("should handle missing environment configuration", async () => {
        pulumi.runtime.setAllConfig({
            "project:region": "ap-southeast-1",
            "project:zone": "ap-southeast-1a",
            "project:domain": "ali1.dev.trustgraph.ai",
            "project:grafana-domain": "grafana.ali1.dev.trustgraph.ai",
            "project:letsencrypt-email": "admin@trustgraph.ai",
        });

        await expect(import("../config")).rejects.toThrow();
    });

    test("should handle missing region configuration", async () => {
        pulumi.runtime.setAllConfig({
            "project:environment": "test",
            "project:zone": "ap-southeast-1a",
            "project:domain": "ali1.dev.trustgraph.ai",
            "project:grafana-domain": "grafana.ali1.dev.trustgraph.ai",
            "project:letsencrypt-email": "admin@trustgraph.ai",
        });

        await expect(import("../config")).rejects.toThrow();
    });

    test("should handle missing zone configuration", async () => {
        pulumi.runtime.setAllConfig({
            "project:environment": "test",
            "project:region": "ap-southeast-1",
            "project:domain": "ali1.dev.trustgraph.ai",
            "project:grafana-domain": "grafana.ali1.dev.trustgraph.ai",
            "project:letsencrypt-email": "admin@trustgraph.ai",
        });

        await expect(import("../config")).rejects.toThrow();
    });

    test("should handle missing domain configuration", async () => {
        pulumi.runtime.setAllConfig({
            "project:environment": "test",
            "project:region": "ap-southeast-1",
            "project:zone": "ap-southeast-1a",
            "project:grafana-domain": "grafana.ali1.dev.trustgraph.ai",
            "project:letsencrypt-email": "admin@trustgraph.ai",
        });

        await expect(import("../config")).rejects.toThrow();
    });

    test("should handle missing grafana-domain configuration", async () => {
        pulumi.runtime.setAllConfig({
            "project:environment": "test",
            "project:region": "ap-southeast-1",
            "project:zone": "ap-southeast-1a",
            "project:domain": "ali1.dev.trustgraph.ai",
            "project:letsencrypt-email": "admin@trustgraph.ai",
        });

        await expect(import("../config")).rejects.toThrow();
    });

    test("should handle missing letsencrypt-email configuration", async () => {
        pulumi.runtime.setAllConfig({
            "project:environment": "test",
            "project:region": "ap-southeast-1",
            "project:zone": "ap-southeast-1a",
            "project:domain": "ali1.dev.trustgraph.ai",
            "project:grafana-domain": "grafana.ali1.dev.trustgraph.ai",
        });

        await expect(import("../config")).rejects.toThrow();
    });
});
