import { publisher } from '.';

export function publish<T>(channel: string, data: T): void {
    try {
        publisher.publish(channel, JSON.stringify(data));
    } catch (err: unknown) {
        console.error(`[Publisher Error] failed to publish data channel: ${channel}`);
        throw new Error(`Failed to publish data channel: ${channel}`);
    }
}
