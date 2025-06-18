export interface MCPService {
  processMessage(message: string): Promise<string>;
  getWeatherAlerts(location: string): Promise<string>;
  getTimeInfo(timezone: string): Promise<string>;
}
