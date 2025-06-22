declare module 'express-prometheus-middleware' {
  import { RequestHandler } from 'express';

  interface PrometheusMiddlewareOptions {
    metricsPath?: string;
    collectDefaultMetrics?: boolean;
    requestDurationBuckets?: number[];
    requestLengthBuckets?: number[];
    responseLengthBuckets?: number[];
    normalizePath?: (path: string) => string;
    normalizeMethod?: (method: string) => string;
    normalizeStatusCode?: (statusCode: number) => number;
    customLabels?: string[];
    transformLabels?: (labels: any, req: any, res: any) => any;
  }

  function prometheusMiddleware(options?: PrometheusMiddlewareOptions): RequestHandler;

  export = prometheusMiddleware;
} 