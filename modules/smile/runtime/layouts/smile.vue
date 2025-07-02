<script setup lang="ts">
  /**
   * The shell every experiment page renders inside.
   *
   * Shows which experiment is running and where the participant is in the
   * timeline, and reserves a status region for later capabilities (consent
   * state, data-save indicators, developer chrome). The page itself is the
   * body.
   */
  import { computed } from "vue";

  import { useRoute } from "#app";
  // Nuxt copies layouts into a virtual template, so relative imports would
  // not resolve from there; go through the module alias instead.
  import { useSmileConfig } from "#smile/runtime/composables/useSmileConfig";
  import { useTimeline } from "#smile/runtime/composables/useTimeline";

  const route = useRoute();
  const config = useSmileConfig();
  const timeline = useTimeline();

  const experimentName = computed(() => {
    const fromRoute = route.meta.smileExperiment;
    if (typeof fromRoute === "string" && fromRoute.length > 0) return fromRoute;
    return config.experiment?.name ?? config.activeExperiment ?? "smile";
  });

  // Position in the timeline when the route is part of it; otherwise the
  // route name, so framework pages still show where they are.
  const position = computed(() => {
    const index = timeline.index.value;
    if (index >= 0) return `${index + 1} / ${timeline.length}`;
    return String(route.name ?? "");
  });

  const smileId = computed(() => timeline.current.value?.smileId ?? null);
</script>

<template>
  <UDashboardGroup>
    <UDashboardPanel id="smile-shell">
      <template #header>
        <UDashboardNavbar :title="experimentName" :toggle="false" data-smile="navbar">
          <template #right>
            <div class="flex items-center gap-2" data-smile="status">
              <UBadge v-if="smileId" color="neutral" variant="outline" data-smile="smile-id">
                {{ smileId }}
              </UBadge>
              <UBadge color="neutral" variant="subtle" data-smile="position">
                {{ position }}
              </UBadge>
            </div>
          </template>
        </UDashboardNavbar>
      </template>

      <template #body>
        <div class="mx-auto w-full max-w-4xl" data-smile="page">
          <slot />
        </div>
      </template>
    </UDashboardPanel>
  </UDashboardGroup>
</template>
