// Deliberately separate from editorial counts. No tracker is loaded or invoked.
export interface TrafficAnalyticsProvider {
  readSummary(): Promise<{
    period: string;
    visitors: number;
    pageviews: number;
  }>;
}
export const analyticsConnection: TrafficAnalyticsProvider | null = null;
