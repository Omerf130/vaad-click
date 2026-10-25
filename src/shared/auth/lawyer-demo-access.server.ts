import "server-only";

import {
  parseLawyerDemoAccessConfig,
  type LawyerDemoAccessConfig,
} from "@/shared/auth/lawyer-demo-access";

export function getLawyerDemoAccessConfig(): LawyerDemoAccessConfig {
  return parseLawyerDemoAccessConfig(process.env);
}
