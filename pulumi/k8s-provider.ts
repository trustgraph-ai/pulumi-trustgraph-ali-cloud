
import * as k8s from "@pulumi/kubernetes";

import { kubeconfig } from './kubeconfig';

// Create a Kubernetes provider using the cluster's kubeconfig
export const k8sProvider = new k8s.Provider(
    "k8sProvider",
    {
        kubeconfig: kubeconfig,
    }
);

