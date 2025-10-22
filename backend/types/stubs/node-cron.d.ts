export interface ScheduledTask {
  start(): void;
  stop(): void;
  destroy(): void;
}

export type TaskFunction = () => void | Promise<void>;

export interface ScheduleOptions {
  timezone?: string;
}

export declare function schedule(expression: string, task: TaskFunction, options?: ScheduleOptions): ScheduledTask;
export declare function validate(expression: string): boolean;
export declare function getTasks(): Map<string, ScheduledTask>;
export declare function getTask(id: string): ScheduledTask | undefined;

declare const nodeCron: {
  schedule: typeof schedule;
  validate: typeof validate;
  getTasks: typeof getTasks;
  getTask: typeof getTask;
};

export default nodeCron;
