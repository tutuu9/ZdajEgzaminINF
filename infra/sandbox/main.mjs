// Entry point: the job specification selects fixed criteria checks or a learner-initiated run.
import { task } from './runtime.mjs';

await import(task.mode === 'run' ? './run.mjs' : './check.mjs');
