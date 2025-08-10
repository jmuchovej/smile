import { z } from "zod";

/**
 * Shared timeline types used across build-time and runtime
 */

export const TimelineParametersSchema = z.object({
  stimuli: z.string().describe("Which stimuli set to use for this dynamic section?"),

  trialID: z.string().describe("Column name for trial ID"),
  blockID: z.string().optional().describe("Column name for block ID"),
  conditionID: z.string().optional().describe("Column name for condition ID"),
});

export type TimelineParameters = z.infer<typeof TimelineParametersSchema>;

export const BaseTimelineStepSchema = z.object({
  id: z
    .string()
    .describe(`Unique hierarchical identifier (e.g., "01.02" or "02.00005.01")`),
  filetype: z.enum(["vue", "mdx"]).describe("File type for the timeline step"),
  filepath: z
    .string()
    .describe(
      "Relative filepath for the timeline step (from the project's `rootDir`)."
    ),
  route: z.string().describe("Route for the timeline step"),
});

export const DefinedStaticTimelineStepSchema = z.object({
  ...BaseTimelineStepSchema.shape,
  kind: z.literal("static").describe("Kind of timeline step"),
});

export const DefinedDynamicTimelineStepSchema = z.object({
  ...BaseTimelineStepSchema.shape,
  kind: z.literal("dynamic").describe("Kind of timeline step"),
});

export const DefinedTimelineStepSchema = z.discriminatedUnion("kind", [
  DefinedStaticTimelineStepSchema,
  DefinedDynamicTimelineStepSchema,
]);

export const ResolvedStaticTimelineStepSchema = z.object({
  ...DefinedStaticTimelineStepSchema.shape,
});

export const ResolvedDynamicTimelineStepSchema = z
  .object({
    ...DefinedDynamicTimelineStepSchema.shape,
    values: z
      .object({
        trialID: z.string().describe("ID of the trial to use"),
        blockID: z.string().optional().describe("ID of the block to use"),
        conditionID: z.string().optional().describe("ID of the condition to use"),
      })
      .describe("Replacement values for this dynamic timeline step"),
    order: z.number().describe("1-based index in randomized trial order"),
  })
  .transform((step) => {
    // Create purely numeric ID: only numeric hierarchy + smileID
    // Original: "02.blockID.trialID.01" -> "02.S00003.01"
    const smileID = `S${step.order.toString().padStart(5, "0")}`;

    const incomingID = step.id;
    const outgoingID = incomingID
      .replace(/\[blockID\]/, "")
      .replace(/\[conditionID\]/, "")
      .replace(/\[trialID\]/, smileID)
      .replace(/\.+/g, ".");
    if (/\[\w+\]/.test(outgoingID)) {
      throw new Error(`Encountered unknown variable slug! ${incomingID}`);
    }

    return {
      ...step,
      id: outgoingID,
      route: step.template
        .replace(/\[trialID\]/, step.values.trialID)
        .replace(/\[blockID\]/, step.values.blockID || "")
        .replace(/\[conditionID\]/, step.values.conditionID || ""),
    };
  });

export const ResolvedTimelineStepSchema = z.discriminatedUnion("kind", [
  ResolvedStaticTimelineStepSchema,
  ResolvedDynamicTimelineStepSchema,
]);

// Export inferred types
export type DefinedTimelineStep = z.infer<typeof DefinedTimelineStepSchema>;
export type ResolvedTimelineStep = z.infer<typeof ResolvedTimelineStepSchema>;

// Type guards using Zod validation
export function isStaticStep(
  step: ResolvedTimelineStep
): step is Extract<ResolvedTimelineStep, { kind: "static" }> {
  return step.kind === "static";
}

export function isDynamicStep(
  step: ResolvedTimelineStep
): step is Extract<ResolvedTimelineStep, { kind: "dynamic" }> {
  return step.kind === "dynamic";
}

// Validation functions
export function parseTimelineStep(data: unknown): ResolvedTimelineStep {
  return ResolvedTimelineStepSchema.parse(data);
}

export function validateTimelineSteps(data: unknown[]): ResolvedTimelineStep[] {
  return data.map((step) => ResolvedTimelineStepSchema.parse(step));
}

export function parseDefinedTimeline(data: unknown): DefinedTimeline {
  return DefinedTimelineSchema.parse(data);
}

export const DefinedTimelineSchema = z.object({
  experiment: z.string(),
  steps: z.array(DefinedTimelineStepSchema),
});

export type DefinedTimeline = z.infer<typeof DefinedTimelineSchema>;

const ResolvedTimelineSchema = z.object({
  experiment: z.string(),
  steps: z.array(ResolvedTimelineStepSchema),
});
export type ResolvedTimeline = z.infer<typeof ResolvedTimelineSchema>;

// ===== RUNTIME STATE TYPES =====
export interface TimelineRuntimeState {
  currentStepId: string;
  currentStepIndex: number;
  visitedSteps: Set<string>;
  completedSteps: Set<string>;
  skippedSteps: Set<string>;
  participantData: Record<string, any>;
  canGoNext: boolean;
  canGoPrevious: boolean;
  isComplete: boolean;
  randomSeed?: string;
  randomizedOrder?: Map<string, number>;
}

export interface NavigationResult {
  success: boolean;
  stepId?: string;
  path?: string;
  reason?: "blocked" | "conditional" | "end_of_timeline" | "invalid_step";
}
