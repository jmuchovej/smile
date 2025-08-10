import { z } from "zod";

// Core column types that Smile supports
export const ColumnTypeSchema = z.enum(["text", "number", "boolean", "date", "json"]);

export const ColumnConstraintsSchema = z.object({
  primaryKey: z.boolean().optional(),
  unique: z.boolean().optional(),
  index: z.boolean().optional(),
  optional: z.boolean().optional(),
  trialID: z.boolean().optional(),
  blockID: z.boolean().optional(),
  conditionID: z.boolean().optional(),
});

export const ColumnSchema = z.object({
  type: ColumnTypeSchema,
  constraints: ColumnConstraintsSchema,
});

export const CompositeKeysSchema = z.object({
  primary: z.array(z.string()).optional(),
});

export const IndexSchema = z.object({
  name: z.string(),
  columns: z.array(z.string()).min(1),
  unique: z.boolean().optional(),
});

const IndexesSchema = z.array(IndexSchema);

// Intermediate table representation
export const BaseTableSchema = z
  .object({
    type: z.literal("base-table"),
    name: z.string().min(1),
    columns: z
      .record(z.string(), ColumnSchema)
      .refine((cols) => Object.keys(cols).length > 0, {
        message: "Tables must have at least one column",
      }),
    compositeKeys: CompositeKeysSchema,
    indexes: IndexesSchema,
  })
  .refine(
    (table) => {
      const indexes = table.indexes.map((idx) => idx.name);
      return indexes.length === new Set(indexes).size;
    },
    { message: "Found duplicate indexes!" }
  )
  .refine(
    (table) => {
      return table.indexes.every((index) =>
        index.columns.every((column) => column in table.columns)
      );
    },
    { message: "Index references non-existent columns..." }
  );

export const StimuliTableSchema = z
  .object({
    ...BaseTableSchema.omit({ type: true }).shape,
    type: z.literal("stimuli-table"),
    parameters: z.object({
      trialID: z.string(),
      blockID: z.string().optional(),
      conditionD: z.string().optional(),
    }),
  })
  .transform((table) => {
    const { columns } = table;
    let trialID: string | undefined,
      blockID: string | undefined,
      conditionID: string | undefined;

    for (const [name, field] of Object.entries(columns)) {
      if (field.constraints.trialID && !trialID) {
        trialID = name;
      }
      if (field.constraints.blockID && !blockID) {
        blockID = name;
      }
      if (field.constraints.conditionID && !conditionID) {
        conditionID = name;
      }
    }

    return {
      ...table,
      parameters: {
        trialID,
        blockID,
        conditionID,
      },
    };
  })
  .refine(
    (table) => {
      const { columns } = table;
      Object.values(columns).reduce(
        (acc, column) => acc + ((column.constraints.trialID ?? 0) as number),
        0
      ) === 1;
    },
    { message: "You must have **exactly** one `trialID`!" }
  )
  .refine(
    (table) => {
      Object.values(table.columns).reduce(
        (acc, column) => acc + ((column.constraints.blockID ?? 0) as number),
        0
      ) <= 1;
    },
    { message: "You may not have more than one `blockID`!" }
  )
  .refine(
    (table) => {
      Object.values(table.columns).reduce(
        (acc, column) => acc + ((column.constraints.conditionID ?? 0) as number),
        0
      ) <= 1;
    },
    { message: "You may not have more than one `conditionID`!" }
  );

export const TableSchema = z.discriminatedUnion("type", [
  BaseTableSchema,
  StimuliTableSchema,
]);

export type SmileColumnType = z.infer<typeof ColumnTypeSchema>;
export type SmileColumnConstraints = z.infer<typeof ColumnConstraintsSchema>;
export type SmileColumn = z.infer<typeof ColumnSchema>;
export type SmileCompositeKey = z.infer<typeof CompositeKeysSchema>;
export type SmileIndex = z.infer<typeof IndexSchema>;
export type SmileBaseTable = z.infer<typeof BaseTableSchema>;
export type SmileStimuliTable = z.infer<typeof StimuliTableSchema>;
export type SmileTable = z.infer<typeof TableSchema>;

export type DFRecord = {
  [x: string]: string | number | bigint | boolean | null;
};
