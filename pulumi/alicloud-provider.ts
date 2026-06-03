
import * as alicloud from "@pulumi/alicloud";

import { region } from './config';

export const alicloudProvider = new alicloud.Provider(
    "alicloud-provider",
    {
        region: region,
    }
);
