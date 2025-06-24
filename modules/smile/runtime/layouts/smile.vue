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

  import { useRoute, useRuntimeConfig } from "#app";

  const route = useRoute();
  const runtimeConfig = useRuntimeConfig();

  interface SmilePublicConfig {
    activeExperiment?: string | null;
  }

  const smileConfig = computed(() => (runtimeConfig.public.smile ?? {}) as SmilePublicConfig);

  const experimentName = computed(() => {
    const fromRoute = route.meta.smileExperiment;
    if (typeof fromRoute === "string" && fromRoute.length > 0) return fromRoute;
    return smileConfig.value.activeExperiment ?? "smile";
  });

  // Timeline position is provided by the timeline capability; until a page
  // carries that metadata the shell shows the route name.
  const position = computed(() => {
    const index = route.meta.smileIndex;
    const length = route.meta.smileLength;
    if (typeof index === "number" && typeof length === "number") {
      return `${index + 1} / ${length}`;
    }
    return String(route.name ?? "");
  });
</script>

<template>
  <UDashboardGroup>
    <UDashboardPanel id="smile-shell">
      <template #header>
        <UDashboardNavbar :title="experimentName" :toggle="false" data-smile="navbar">
          <template #right>
            <div class="flex items-center gap-2" data-smile="status">
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
