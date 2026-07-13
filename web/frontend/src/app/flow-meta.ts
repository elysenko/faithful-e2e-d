import { Route } from '@angular/router';

/**
 * Declarative user-flow metadata for the colossus flow-graph extractor.
 *
 * Attach a `data.flow` to each route in your statically-exported `export const routes: Routes`.
 * The extractor (platform/flowgraph-static) reads this DIRECTLY from the AST — a pure
 * projection of declared metadata, zero heuristics — and only falls back to scanning
 * routerLinks/navigate() for routes that omit `flow` (those edges are marked
 * `metadata.inferred` so declared ground truth stays distinct from guesses).
 *
 * Authoring rules (enforced by CI lint — see docs/flow-graph-model-v2.md):
 *  - Author ONLY in a statically-exported `export const routes: Routes` in a `*.routes.ts`
 *    file. Computed/spread/function-returned route arrays can't be statically evaluated.
 *  - All fields MUST be string / string[] / boolean LITERALS (no ResolveFn, no computed
 *    values) — the extractor evaluates them from the AST, not at runtime.
 *  - `flowId` is a kebab-case id unique within the app; `edgesTo` targets must resolve to
 *    another route's `flowId` (no dangling ids).
 *  - Angular `data` is NOT inherited by child routes — repeat/merge `flow` on children.
 */
export interface FlowMeta {
  /** kebab-case stable id for this node, unique in the app. */
  flowId: string;
  /** Canonical node label (usually the route path or screen name). */
  node: string;
  /** flowIds this screen can navigate to (the user-flow edges out of this node). */
  edgesTo?: string[];
  /** Marks an entry/landing node (graph source). */
  entry?: boolean;
  /** Marks a terminal node (graph sink). */
  terminal?: boolean;
  /** Show in the persistent nav bar (drives BOTH runtime navbar and the global-nav layer). */
  showInNavbar?: boolean;
  /** Human label for nav/breadcrumb (single source of truth for nav + graph). */
  label?: string;
  /** Optional role scope for the global-nav layer, e.g. 'all' | 'admin' | 'firm'. */
  scope?: string;
}

/** A Route carrying flow metadata. Use in place of `Route` in `export const routes`. */
export interface FlowRoute extends Route {
  data?: { flow?: FlowMeta } & Record<string, unknown>;
  children?: FlowRoute[];
}
