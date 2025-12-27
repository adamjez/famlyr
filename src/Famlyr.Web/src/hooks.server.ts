import { createLogger } from "$lib/logger";

const logger = createLogger('hooks.server');
export async function handle({ event, resolve }) {
    logger.info(`Handling request for ${event.url.pathname}`);
    return resolve(event);
}
