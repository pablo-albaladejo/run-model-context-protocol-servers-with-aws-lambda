import { Tracer } from "@aws-lambda-powertools/tracer";
import { logger } from "./powertools-middleware";

const tracer = new Tracer({
  serviceName: "mcp-demo-api",
});

// Tracing decorators for database operations
export const traceDatabaseOperation = (operation: string, table: string) => {
  return function (
    target: any,
    propertyName: string,
    descriptor: PropertyDescriptor
  ) {
    const method = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const segment = tracer.getSegment();
      const subsegment = segment?.addNewSubsegment(`database.${operation}`);

      if (subsegment) {
        subsegment.addAnnotation("table", table);
        subsegment.addAnnotation("operation", operation);
        subsegment.addMetadata("args", args);
      }

      try {
        const result = await method.apply(this, args);

        if (subsegment) {
          subsegment.addMetadata("result", result);
        }

        logger.info("Database operation completed", {
          operation,
          table,
          correlationId: logger.getCorrelationId(),
        });

        return result;
      } catch (error) {
        if (subsegment) {
          subsegment.addError(error as Error);
        }

        logger.error("Database operation failed", {
          operation,
          table,
          error: error instanceof Error ? error.message : String(error),
          correlationId: logger.getCorrelationId(),
        });

        throw error;
      } finally {
        subsegment?.close();
      }
    };

    return descriptor;
  };
};

// Tracing decorators for MCP service operations
export const traceMCPServiceCall = (service: string, method: string) => {
  return function (
    target: any,
    propertyName: string,
    descriptor: PropertyDescriptor
  ) {
    const methodFunction = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const segment = tracer.getSegment();
      const subsegment = segment?.addNewSubsegment(`mcp.${service}.${method}`);

      if (subsegment) {
        subsegment.addAnnotation("service", service);
        subsegment.addAnnotation("method", method);
        subsegment.addMetadata("args", args);
      }

      try {
        const result = await methodFunction.apply(this, args);

        if (subsegment) {
          subsegment.addMetadata("result", result);
        }

        logger.info("MCP service call completed", {
          service,
          method,
          correlationId: logger.getCorrelationId(),
        });

        return result;
      } catch (error) {
        if (subsegment) {
          subsegment.addError(error as Error);
        }

        logger.error("MCP service call failed", {
          service,
          method,
          error: error instanceof Error ? error.message : String(error),
          correlationId: logger.getCorrelationId(),
        });

        throw error;
      } finally {
        subsegment?.close();
      }
    };

    return descriptor;
  };
};

// Tracing for HTTP requests
export const traceHttpRequest = (url: string, method: string) => {
  return function (
    target: any,
    propertyName: string,
    descriptor: PropertyDescriptor
  ) {
    const methodFunction = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const segment = tracer.getSegment();
      const subsegment = segment?.addNewSubsegment(
        `http.${method.toLowerCase()}`
      );

      if (subsegment) {
        subsegment.addAnnotation("url", url);
        subsegment.addAnnotation("method", method);
        subsegment.addMetadata("args", args);
      }

      try {
        const result = await methodFunction.apply(this, args);

        if (subsegment) {
          subsegment.addMetadata("result", result);
        }

        logger.info("HTTP request completed", {
          url,
          method,
          correlationId: logger.getCorrelationId(),
        });

        return result;
      } catch (error) {
        if (subsegment) {
          subsegment.addError(error as Error);
        }

        logger.error("HTTP request failed", {
          url,
          method,
          error: error instanceof Error ? error.message : String(error),
          correlationId: logger.getCorrelationId(),
        });

        throw error;
      } finally {
        subsegment?.close();
      }
    };

    return descriptor;
  };
};

// Tracing for Lambda function invocations
export const traceLambdaInvocation = (functionName: string) => {
  return function (
    target: any,
    propertyName: string,
    descriptor: PropertyDescriptor
  ) {
    const methodFunction = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const segment = tracer.getSegment();
      const subsegment = segment?.addNewSubsegment(`lambda.${functionName}`);

      if (subsegment) {
        subsegment.addAnnotation("functionName", functionName);
        subsegment.addMetadata("args", args);
      }

      try {
        const result = await methodFunction.apply(this, args);

        if (subsegment) {
          subsegment.addMetadata("result", result);
        }

        logger.info("Lambda invocation completed", {
          functionName,
          correlationId: logger.getCorrelationId(),
        });

        return result;
      } catch (error) {
        if (subsegment) {
          subsegment.addError(error as Error);
        }

        logger.error("Lambda invocation failed", {
          functionName,
          error: error instanceof Error ? error.message : String(error),
          correlationId: logger.getCorrelationId(),
        });

        throw error;
      } finally {
        subsegment?.close();
      }
    };

    return descriptor;
  };
};

// Utility function to capture custom traces
export const captureTrace = (name: string, fn: () => Promise<any>) => {
  return async () => {
    const segment = tracer.getSegment();
    const subsegment = segment?.addNewSubsegment(name);

    try {
      const result = await fn();

      if (subsegment) {
        subsegment.addMetadata("result", result);
      }

      return result;
    } catch (error) {
      if (subsegment) {
        subsegment.addError(error as Error);
      }
      throw error;
    } finally {
      subsegment?.close();
    }
  };
};

// Export tracer instance for direct use
export { tracer };
