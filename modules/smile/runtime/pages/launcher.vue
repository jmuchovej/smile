<script setup lang="ts">
  /**
   * Development launcher at `/`: lists the configured experiments and links
   * the active one to its index page.
   */
  import { computed } from "vue";

  import { useSmileConfig } from "#smile/runtime/composables/useSmileConfig";
  import { useTimeline } from "#smile/runtime/composables/useTimeline";

  definePageMeta({ layout: "smile" });

  const config = useSmileConfig();
  const timeline = useTimeline();

  const experiments = computed(() =>
    config.availableExperiments.map((id) => ({
      id,
      name: id.split("@")[0] ?? id,
      active: id === config.activeExperiment,
    })),
  );

  const activeName = computed(() => config.experiment?.name ?? null);
</script>

<template>
  <div class="space-y-6" data-smile="launcher">
    <div>
      <h1 class="text-2xl font-semibold">Experiments</h1>
      <p class="text-neutral-500">
        Defined in <code>smile.config.ts</code>. The active experiment is the one built into this
        app.
      </p>
    </div>

    <UAlert
      v-if="experiments.length === 0"
      color="warning"
      variant="subtle"
      title="No experiments configured"
      description="Add a smile.config.ts at the project root that exports defineSmileConfig({ experiments: [...] })."
      data-smile="launcher-empty" />

    <ul v-else class="divide-y divide-neutral-200" data-smile="launcher-list">
      <li
        v-for="experiment in experiments"
        :key="experiment.id"
        class="flex items-center justify-between py-3"
        :data-smile-experiment="experiment.id"
        :data-smile-active="experiment.active ? 'true' : 'false'">
        <div class="flex items-center gap-3">
          <code>{{ experiment.id }}</code>
          <UBadge
            v-if="experiment.active"
            color="primary"
            variant="subtle"
            data-smile="launcher-active">
            active
          </UBadge>
        </div>
        <UButton
          v-if="experiment.active && activeName"
          :to="`/experiment/${activeName}`"
          icon="i-lucide-list"
          label="Open index"
          size="sm"
          data-smile="launcher-open" />
        <span v-else class="text-sm text-neutral-500">
          set <code>activeExperiment</code> or <code>SMILE_EXPERIMENT</code> to build it
        </span>
      </li>
    </ul>

    <p v-if="timeline.length > 0" class="text-sm text-neutral-500" data-smile="launcher-summary">
      {{ timeline.length }} timeline entries in the active experiment.
    </p>
  </div>
</template>
