export interface ServerConfig {
  loggerLevel?: string;
  prettyPrint?: boolean;
  logger?: {
    level?: string;
  };
  // CORS configuration options
  corsAllowLocalhost?: boolean;
  corsUseOrigin?: boolean;
  corsAllowedOrigins?: string[];
  // Server binding options
  port?: number;
  host?: string;
}

export interface LaunchConfig {
  port?: number;
  host?: string;
  /**
   * Additional metadata to log on successful startup
   */
  metadata?: {
    appsLoaded?: string[];
    [key: string]: unknown;
  };
}
