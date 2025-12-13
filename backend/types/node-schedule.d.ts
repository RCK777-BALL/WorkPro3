declare module 'node-schedule' {
  export type JobCallback = () => void | Promise<void>;

  export function scheduleJob(
    name: string,
    rule: string | Date,
    callback: JobCallback,
  ): unknown;
}
