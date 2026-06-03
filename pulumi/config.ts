
import * as pulumi from "@pulumi/pulumi";

const cfg = new pulumi.Config();

function get(tag : string) {

    let val = cfg.get(tag);

    if (!val) {
        console.log("ERROR: The '" + tag + "' config is mandatory");
        throw "The '" + tag + "' config is mandatory";
    }

    return val;

}

export const environment = get("environment");

export const region = get("region");
export const zone = get("zone");

export const tags : { [key : string] : string } = {
};

export const tagsSep = Object.entries(tags).map(
    (x : string[]) => (x[0] + "=" + x[1])
).join(",");

export const prefix = "trustgraph-" + environment;

export const nodeType = "ecs.g7.xlarge";
export const nodeCount = 3;
export const diskSize = 40;
