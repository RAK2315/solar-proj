/**
 * src/lib/highsSolver.ts — HiGHS behind the one call the scheduler makes.
 *
 * The package's one-shot `solve()` returns a solution and a status and nothing
 * else. A solve that stops at a time limit needs two more things to be reported
 * honestly: whether what it holds is a feasible plan at all, and the bound it
 * had proved by then. Both live on a persistent model's info store, so this uses
 * that API and disposes the model before it returns. Garbage collection does not
 * free WebAssembly memory.
 */

import type { Highs } from 'highs';

import type { Solver, SolverResult } from './scheduler';

/** HiGHS's own code for "this primal solution is feasible". */
const FEASIBLE = 2;

export function highsSolver(highs: Highs): Solver {
  const { optimal, timeLimit } = highs.constants.modelStatus;

  return {
    solve(lp: string, timeLimitSeconds: number): SolverResult {
      const model = highs.createModel({ format: 'lp', data: lp });
      try {
        model.options.set('output_flag', false);
        model.options.set('time_limit', timeLimitSeconds);
        const { modelStatus } = model.run();
        if (modelStatus !== optimal && modelStatus !== timeLimit) return { status: 'failed', values: {}, bound: null };

        const values: Record<string, number> = {};
        if (Number(model.info.get('primal_solution_status')) === FEASIBLE) {
          const column = model.getSolution().colValue;
          for (let i = 0; i < column.length; i += 1) values[model.getColName(i)] = column[i];
        }
        const bound = Number(model.info.get('mip_dual_bound'));
        return {
          status: modelStatus === optimal ? 'optimal' : 'limit',
          values,
          bound: Number.isFinite(bound) ? bound : null,
        };
      } finally {
        model.dispose();
      }
    },
  };
}
