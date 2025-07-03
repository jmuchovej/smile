<script setup lang="ts">
  /**
   * Development index at `/experiment/{name}`: the active experiment's
   * timeline in presentation order, with SmileIDs and links.
   */
  import { computed } from "vue";

  import { useRoute } from "#app";
  import { useSmileConfig } from "#smile/runtime/composables/useSmileConfig";
  import { useTimeline } from "#smile/runtime/composables/useTimeline";

  definePageMeta({ layout: "smile" });

  const route = useRoute();
  const config = useSmileConfig();
  const timeline = useTimeline();

  const requested = computed(() => String(route.params.name ?? ""));
  const isActive = computed(() => requested.value === timeline.experimentName);

  const rows = computed(() =>
    timeline.entries.map((entry) => ({
      ...entry,
      position: entry.index + 1,
      kind: entry.isDynamic ? "dynamic" : "page",
    })),
  );
</script>

<template>
  <div class="space-y-6" data-smile="experiment-index">
    <div>
      <h1 class="text-2xl font-semibold">
        <code>{{ requested }}</code>
        <span v-if="config.activeExperiment" class="text-neutral-500"
          >({{ config.activeExperiment }})</span
        >
      </h1>
      <p class="text-neutral-500">Timeline entries in presentation order.</p>
    </div>

    <UAlert
      v-if="!isActive"
      color="warning"
      variant="subtle"
      title="Not the active experiment"
      :description="`Only the active experiment (${timeline.experimentName ?? 'none'}) is scanned into routes.`"
      data-smile="index-inactive" />

    <ol v-else class="divide-y divide-neutral-200" data-smile="index-list">
      <li
        v-for="row in rows"
        :key="row.index"
        class="flex items-center justify-between gap-4 py-2"
        :data-smile-index="row.index"
        :data-smile-smile-id="row.smileId"
        :data-smile-kind="row.kind">
        <div class="flex items-center gap-3">
          <span class="w-8 text-right text-neutral-500 tabular-nums">{{ row.position }}</span>
          <UBadge color="neutral" variant="outline">{{ row.smileId }}</UBadge>
          <NuxtLink
            :to="row.path"
            class="font-mono text-sm hover:underline"
            data-smile="index-link">
            {{ row.path }}
          </NuxtLink>
        </div>
        <div class="flex items-center gap-2">
          <UBadge v-if="row.isDynamic" color="info" variant="subtle" data-smile="index-dynamic">
            trial {{ row.trialId }}
          </UBadge>
          <UBadge
            v-if="row.unorderedGroup"
            color="warning"
            variant="subtle"
            data-smile="index-unordered">
            unordered group {{ row.unorderedGroup }}
          </UBadge>
          <span class="text-xs text-neutral-500">{{ row.page }}</span>
        </div>
      </li>
    </ol>
  </div>
</template>
