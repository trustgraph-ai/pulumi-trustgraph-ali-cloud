
# Deploy TrustGraph in an Alibaba Cloud Kubernetes cluster using Pulumi

## Overview

This is an installation of TrustGraph on Alibaba Cloud using ACK (managed
Kubernetes platform).

The full stack includes:

- A VPC and VSwitch
- An ACK managed Kubernetes cluster
- Node pool containing 3 nodes
- Deploys a complete TrustGraph stack of resources in ACK

Keys and other configuration for the AI components are configured into
TrustGraph using secrets.

## How it works

This uses Pulumi which is a deployment framework, similar to Terraform
but:
- Pulumi has an open source licence
- Pulumi uses general-purposes programming languages, particularly useful
  because you can use test frameworks to test the infrastructure.

Roadmap to deploy is:
- Install Pulumi
- Setup Pulumi
- Configure your environment with Alibaba Cloud credentials
- Modify the local configuration to do what you want
- Deploy
- Use the system

# Deploy

## Deploy Pulumi

```
cd pulumi
```

Then:

```
npm install
```

## Setup Pulumi

You need to tell Pulumi which state to use.  You can store this in an OSS
bucket, but for experimentation, you can just use local state:

```
pulumi login --local
```

Pulumi operates in stacks, each stack is a separate deployment.  The
git repo contains the configuration for a single stack `ali`, so you
could:

```
pulumi stack init ali
```

and it will use the configuration in `Pulumi.ali.yaml`.

## Configure your environment with Alibaba Cloud credentials

Set the following environment variables:

```
export ALICLOUD_ACCESS_KEY=<your-access-key>
export ALICLOUD_SECRET_KEY=<your-secret-key>
```

Or use the Alibaba Cloud CLI:

```
aliyun configure
```

## DashScope API Key

An API key is needed for the AI model (Qwen via DashScope).  To create one:
- Go to the Alibaba Cloud console
- Navigate to Model Studio
- Click **API Key**
- Click **Create API Key**

Then set the key in Pulumi config (encrypted):

```
pulumi config set --secret trustgraph-ack:dashscope-api-key YOUR_API_KEY
```

## Modify the local configuration to do what you want

You can edit:
- settings in `Pulumi.STACKNAME.yaml` e.g. Pulumi.ali.yaml
- change `resources.yaml` with whatever you want to deploy.
  The resources.yaml file was created using the TrustGraph config portal,
  so you can re-generate your own.

The `Pulumi.STACKNAME.yaml` configuration file contains settings for:

```
  trustgraph-ack:environment: dev
  trustgraph-ack:region: cn-hangzhou
  trustgraph-ack:zone: cn-hangzhou-h
```

## Deploy

```
pulumi up
```

Just say yes.

If everything works:
- A file `kube.cfg` will also be created which provides access
  to the Kubernetes cluster.

To connect to the Kubernetes cluster...

```
kubectl --kubeconfig kube.cfg -n trustgraph get pods
```

If something goes wrong while deploying, retry before giving up.
`pulumi up` is a retryable command and will continue from
where it left off.

## Use the system

To get access to TrustGraph using the `kube.cfg` file, set up some
port-forwarding.  You'll need multiple terminal windows to run each of
these commands:

```
kubectl --kubeconfig kube.cfg -n trustgraph port-forward service/api-gateway 8088:8088
kubectl --kubeconfig kube.cfg -n trustgraph port-forward service/workbench-ui 8888:8888
kubectl --kubeconfig kube.cfg -n trustgraph port-forward service/grafana 3000:3000
```

This will allow you to access Grafana and the Workbench UI from your local
browser using `http://localhost:3000` and `http://localhost:8888`
respectively.

The IAM bootstrap token and Grafana admin password are auto-generated
by Pulumi.  After deployment, retrieve them with:
```
pulumi stack output iamToken --show-secrets
pulumi stack output grafanaPassword --show-secrets
```

Login to Grafana with username `admin` and the password from the command
above.

To use the TrustGraph API with authentication:
```
export TRUSTGRAPH_TOKEN=$(pulumi stack output iamToken --show-secrets)
```

## Destroy

```
pulumi destroy
```

Just say yes.

## How the config was built

```
./update-config ack-k8s 2.5.11
```
