import { addServerPlugin, addTemplate, useNuxt } from "@nuxt/kit";
import type pl from "nodejs-polars";
import type { NuxtTemplate } from "nuxt/schema";
import { dirname, relative } from "pathe";
import { camelCase } from "scule";
import type { ZodObject } from "zod";
import { useLogger } from "../runtime/internal";
import type { ResolvedStimuli, ResolvedStimuliSource } from "./core/stimuli";
import {
  blockSchema,
  participantSchema,
  sessionSchema,
  trialSchema,
} from "./database/schemas";
import {
  getCreateIndexQueries,
  getCreateTableQuery,
  getDropTableIfExistsQuery,
} from "./database/sql";
import type { DFRecord, SmileColumn, SmileTable } from "./database/types";
import { getValidatedTable } from "./database/zod";
import { indentLines } from "./utils/misc";
import { defineBuildStep, useSmile } from "./utils/runner";

export const databaseTemplates = {
  schema: "smile/database/schema.ts",
  database: "smile/database/index.ts",
  tsSeed: "smile/database/sql/seed.ts",
  tsTables: "smile/database/sql/tables.ts",
  sqlTables: "smile/database/tables.sql",
};

export default defineBuildStep({
  name: "database",
  async setup({ runtimeResolve }) {
    const logger = useLogger("database");
    const nuxt = useNuxt();

    nuxt.options.alias["#smile:db"] = addTemplate(databaseTemplate()).dst;

    const tables: Record<string, SmileTable> = {
      participants: getValidatedTable(`participants`, participantSchema),
      sessions: getValidatedTable(`sessions`, sessionSchema),
      blocks: getValidatedTable(`blocks`, blockSchema),
      trials: getValidatedTable(`trials`, trialSchema),
    };
    logger.debug(`Added all of Smile's "meta" tables!`);

    const { experiments } = useSmile();

    for (const experiment of Object.values(experiments)) {
      tables[experiment.tableName] = getValidatedTable(
        experiment.tableName,
        experiment.schema
      );
      logger.success(`Adding the ${experiment.tableName} table!`);
      const { stimuli } = experiment;
      tables[stimuli.tableName] = getValidatedTable(stimuli.tableName, stimuli.schema);
      logger.success(`Adding the ${stimuli.tableName} table!`);
    }

    addTemplate(schemaTemplate(tables));
    addTemplate(sqlTablesTemplate(tables));
    addTemplate(tsTablesTemplate(tables));
    addTemplate(tsSeedTemplate(tables));

    addServerPlugin(runtimeResolve("./server/plugins/database.ts"));
  },
});

function schemaTemplate(tables: Record<string, SmileTable>): NuxtTemplate {
  return {
    filename: databaseTemplates.schema,
    write: true,
    options: {
      experimentTables: tables,
    },
    getContents: ({ options }) => {
      const { experimentTables } = options;
      const tables = Object.values(experimentTables).map((table) => ({
        tsName: camelCase(table.name.replace(/@/g, "-")),
        sqlName: table.name,
        name: table.name.replace(/^_(\w+)-/, ""),
        type: table.name.match(/^_(?<type>\w+)-/)?.groups?.type,
        columns: Object.entries(table.columns).map(([name, column]) => ({
          name,
          definition: generateColumnDefinition(column),
        })),
      }));

      return [
        `import { sqliteTable, text, integer, customType } from 'drizzle-orm/sqlite-core';`,
        ``,
        `// Custom types`,
        `const dateType = customType<{ data: Date; driverData: string }>({`,
        `  dataType() { return 'text'; },`,
        `  toDriver(value: Date) { return value.toISOString(); },`,
        `  fromDriver(value: string) { return new Date(value); }`,
        `});`,
        ``,
        `const jsonType = customType<{ data: unknown; driverData: string }>({`,
        `  dataType() { return 'text'; },`,
        `  toDriver(value: unknown) { return JSON.stringify(value); },`,
        `  fromDriver(value: string) { return JSON.parse(value); }`,
        `});`,
        ``,
        ...tables.map(({ tsName, sqlName, columns }) =>
          [
            `export const ${tsName} = sqliteTable("${sqlName}", {`,
            ...columns.map(({ name, definition }) => `  ${name}: ${definition},`),
            `});`,
            ``,
          ].join("\n")
        ),
        ``,
        `export const experiments = {`,
        ...tables
          .filter(({ type }) => type === "experiment")
          .map(({ name, tsName }) => `  "${name}": ${tsName},`),
        `};`,
        ``,
        `export const stimuli = {`,
        ...tables
          .filter(({ type }) => type === "stimuli")
          .map(({ name, tsName }) => `  "${name}": ${tsName},`),
        `};`,
      ].join("\n");
    },
  } satisfies NuxtTemplate;
}

function generateColumnDefinition(column: SmileColumn): string {
  let def = "";
  switch (column.type) {
    case "text":
      def = `text()`;
      break;
    case "number":
      def = `integer()`;
      break;
    case "boolean":
      def = `integer({ mode: "boolean" })`;
      break;
    case "date":
      def = `dateType()`;
      break;
    case "json":
      def = `jsonType()`;
      break;
  }

  const { primaryKey, unique, optional } = column.constraints;
  if (primaryKey) def = `${def}.primaryKey()`;
  if (unique && !primaryKey) def = `${def}.unique()`;
  if (!optional) def = `${def}.notNull()`;

  return def;
}

function databaseTemplate(): NuxtTemplate {
  return {
    filename: databaseTemplates.database,
    write: true,
    getContents: () => {
      const basepath = dirname(databaseTemplates.database);
      return [
        `// Generated runtime database exports`,
        `// This file is auto-generated during build - do not edit manually`,
        `export {`,
        `  and,`,
        `  asc,`,
        `  avg,`,
        `  avgDistinct,`,
        `  between,`,
        `  count,`,
        `  countDistinct,`,
        `  desc,`,
        `  eq,`,
        `  exists,`,
        `  gt,`,
        `  gte,`,
        `  ilike,`,
        `  inArray,`,
        `  isNotNull,`,
        `  isNull,`,
        `  like,`,
        `  lt,`,
        `  lte,`,
        `  max,`,
        `  min,`,
        `  ne,`,
        `  not,`,
        `  notBetween,`,
        `  notExists,`,
        `  notIlike,`,
        `  notInArray,`,
        `  or,`,
        `  sql,`,
        `  sum,`,
        `  sumDistinct,`,
        `} from "drizzle-orm";`,
        ``,
        `// Re-export schema tables`,
        `export * from "./${relative(basepath, databaseTemplates.schema)}";`,
        `export * as schemas from "./${relative(basepath, databaseTemplates.schema)}";`,
        `export { tablesSQL } from "./${relative(basepath, databaseTemplates.tsTables)}";`,
        `export { seeds } from "./${relative(basepath, databaseTemplates.tsSeed)}";`,
        ``,
      ].join("\n");
    },
  } satisfies NuxtTemplate;
}

function tsSeedTemplate(tables: Record<string, SmileTable>): NuxtTemplate {
  const { experiments } = useSmile();
  return {
    filename: databaseTemplates.tsSeed,
    write: true,
    options: {
      experimentTables: tables,
      experiments: experiments,
    },
    getContents: async ({ options }) => {
      const { experimentTables, experiments } = options;
      const stimuli = Object.fromEntries(
        Object.values(experiments).map(({ stimuli }) => [stimuli.tableName, stimuli])
      );
      const stimuliTables = Object.values(experimentTables).filter(({ name }) =>
        Object.keys(stimuli).includes(name)
      );
      const seedRecords = Object.fromEntries(
        await Promise.all(
          stimuliTables.map(async (t) => [
            camelCase(t.name),
            await exportStimuliSeeds(stimuli[t.name]!),
          ])
        )
      );

      return [
        `// Generated seed file for stimuli`,
        `import {`,
        ...Object.keys(seedRecords).map((n) => `  ${n},`),
        `} from "../schema";`,
        ``,
        `export const seeds = {`,
        ...Object.entries(seedRecords).map(([name, seed]) => {
          const json = seed.map((s) =>
            JSON.stringify(s, null, 2)
              .split("\n")
              .map((l) => ` ${l}`)
              .join("\n")
          );
          return [
            `  ${name}: {`,
            `    table: ${name},`,
            `    seed: [`,
            indentLines(`${json}`, 4) + `,`,
            `    ],`,
            `  },`,
          ].join("\n");
        }),
        `};`,
      ].join("\n");
    },
  } satisfies NuxtTemplate;
}

async function exportStimuliSeeds(stimuli: ResolvedStimuli): Promise<DFRecord[]> {
  const logger = useLogger("database", "templates", "seed");
  const { name, schema, sources } = stimuli;
  logger.debug(`Generating seed exports for stimuli=\`${name}\`!`);
  let records: DFRecord[] = [];
  try {
    records = (
      await Promise.all(sources.map(async (s) => await exportDataFrame(s, schema)))
    ).flat();
  } catch (error) {
    logger.error(`  Failed to generate seed exports: ${error.message}`);
  }

  return records;
}

async function exportDataFrame(
  source: ResolvedStimuliSource,
  schema: ZodObject
): Promise<DFRecord[]> {
  const logger = useLogger("database", "templates", "export");
  let df: pl.DataFrame;
  try {
    df = await source.load();
  } catch (error) {
    logger.error(`  Failed to load ${source.basename}: ${error.message}`);
    return [];
  }

  let records: DFRecord[] = [];
  try {
    // Convert DataFrame to JavaScript objects & validate against schema
    records = df.toRecords().map((record) => schema.parse(record) as DFRecord);
  } catch (error) {
    logger.error(
      `  Failed to validate ${source.basename} against schema! ${error.message}`
    );
    return records;
  }

  return records;
}

export function tsTablesTemplate(tables: Record<string, SmileTable>): NuxtTemplate {
  return {
    filename: databaseTemplates.tsTables,
    write: true,
    options: {
      experimentTables: tables,
    },
    getContents: async ({ options }) => {
      const { experimentTables } = options;

      const asSQL = Object.values(experimentTables).flatMap((table) => [
        `--- SQL commands for the "${table.name}" table`,
        `--- Drop ${table.name}`,
        getDropTableIfExistsQuery(table),
        ``,
        `--- Recreate ${table.name}`,
        getCreateTableQuery(table),
        ``,
        `--- Create indexes on ${table.name}`,
        ...getCreateIndexQueries(table),
        ``,
      ]);

      const forTSExport = asSQL
        .filter((q) => !q.startsWith(`---`) && q.length !== 0)
        .map((sql) => `\`${sql}\``);

      return [
        `// Generated SQL as virtual export`,
        `export const tablesSQL = [`,
        indentLines(forTSExport.join(",\n"), 2),
        `];`,
      ].join("\n");
    },
  } satisfies NuxtTemplate;
}

export function sqlTablesTemplate(tables: Record<string, SmileTable>): NuxtTemplate {
  return {
    filename: databaseTemplates.sqlTables,
    write: true,
    options: {
      experimentTables: tables,
    },
    getContents: async ({ options }) => {
      const { experimentTables } = options;

      return Object.values(experimentTables)
        .flatMap((table) => [
          `--- SQL commands for the "${table.name}" table`,
          `--- Drop ${table.name}`,
          getDropTableIfExistsQuery(table),
          ``,
          `--- Recreate ${table.name}`,
          getCreateTableQuery(table),
          ``,
          `--- Create indexes on ${table.name}`,
          ...getCreateIndexQueries(table),
          ``,
        ])
        .join("\n");
    },
  } satisfies NuxtTemplate;
}
