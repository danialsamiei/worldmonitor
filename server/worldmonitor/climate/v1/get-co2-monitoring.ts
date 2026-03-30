import type {
  ClimateServiceHandler,
  ServerContext,
  GetCo2MonitoringRequest,
  GetCo2MonitoringResponse,
} from '../../../../src/generated/server/worldmonitor/climate/v1/service_server';

import { getCachedJson } from '../../../_shared/redis';

const SEED_CACHE_KEY = 'climate:co2-monitoring:v1';

export const getCo2Monitoring: ClimateServiceHandler['getCo2Monitoring'] = async (
  _ctx: ServerContext,
  _req: GetCo2MonitoringRequest,
): Promise<GetCo2MonitoringResponse> => {
  try {
    const cached = await getCachedJson(SEED_CACHE_KEY, true);
    return (cached as GetCo2MonitoringResponse | null) ?? {};
  } catch {
    return {};
  }
};
