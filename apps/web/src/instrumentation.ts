import { logger } from '$server/logger';

export const register = (): void => {
  logger.info('Server instrumentation registered', {
    action: 'SERVER_START',
  });
};

export const onRequestError = async (
  error: unknown,
  request: Readonly<{ method: string; path: string }>,
  context: Readonly<{ routePath: string; routeType: string }>,
): Promise<void> => {
  logger.error('Unhandled request error', {
    action: 'UNHANDLED_REQUEST_ERROR',
    error,
    metadata: {
      routePath: context.routePath,
      routeType: context.routeType,
    },
    method: request.method,
    path: request.path,
  });
};
