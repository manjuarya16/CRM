import { ILead, ILeadPipeline } from "@/interface";

export interface IRottenInfo {
  isRotten: boolean;
  daysIdle: number;
  rottenDaysThreshold: number;
}

/**
 * Calculates whether a lead is rotten (stale) based on the pipeline's rotten_days configuration
 * and the lead's last update timestamp.
 */
export function getRottenInfo(lead: ILead, pipeline?: ILeadPipeline): IRottenInfo {
  const rottenDaysThreshold = Number(pipeline?.rotten_days ?? 30);
  
  // If lead is closed/lost or rotten_days is 0/disabled, it's not rotten
  if (lead.status === false || rottenDaysThreshold <= 0) {
    return { isRotten: false, daysIdle: 0, rottenDaysThreshold };
  }

  const lastUpdateStr = lead.updated_at || lead.created_at;
  if (!lastUpdateStr) {
    return { isRotten: false, daysIdle: 0, rottenDaysThreshold };
  }

  const lastUpdateDate = new Date(lastUpdateStr);
  if (isNaN(lastUpdateDate.getTime())) {
    return { isRotten: false, daysIdle: 0, rottenDaysThreshold };
  }

  const now = new Date();
  const diffTime = Math.max(0, now.getTime() - lastUpdateDate.getTime());
  const daysIdle = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  const isRotten = daysIdle >= rottenDaysThreshold;

  return { isRotten, daysIdle, rottenDaysThreshold };
}
