
import * as fs from 'fs';
import * as pulumi from '@pulumi/pulumi';

import { cluster } from './cluster';
import { kubeconfig } from './kubeconfig';
import { appDeploy, iamBootstrapToken, grafanaAdminPassword } from './app';

// --------------------------------------------------------------------------

// Write the kubeconfig to a file
kubeconfig.apply(
    (key : string) => {
        fs.writeFile(
            "kube.cfg",
            key,
            err => {
                if (err) {
                    console.log(err);
                    throw(err);
                } else {
                    console.log("Wrote kube.cfg.");
                }
            }
        );
    }
);

export const iamToken = pulumi.interpolate`tg_${iamBootstrapToken.result}`;

export const grafanaPassword = grafanaAdminPassword.result;

// --------------------------------------------------------------------------

// Have to reference these things here so that they get deployed
const keep = [
    cluster,
    appDeploy,
];
