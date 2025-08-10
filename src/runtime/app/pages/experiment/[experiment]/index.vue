<script setup lang="ts">
import { ref, computed } from "vue";
import { useRoute, useAppConfig } from "#app";
import type { ExperimentTimeline } from "#smile/types/app-config";
import {
  UIButton
} from "#components";

// Get experiment name from route
const route = useRoute();

const { experiment } = route.params;

// Get experiment data
const config = useAppConfig().smile;
const timeline = computed(() => config.timelines?.[experiment] as ExperimentTimeline | undefined);
</script>

<template>
  <NuxtLayout name="smile-default">
    <div class="container mx-auto px-4 py-8 max-w-4xl">
      <!-- Header -->
      <h1 class="text-3xl font-bold text-gray-900 mb-2">
        Experiment: <span class="font-mono">{{ experiment }}</span>
      </h1>

      <!-- Navigation -->
      <div class="mt-6 flex justify-between">
        <UIButton variant="ghost" color="gray" to="/s/config">
          <Icon name="ph:arrow-left-bold" />
          Back to Config
        </UIButton>

        <div class="flex gap-x-4">
          <UIButton color="secondary" icon="i-ph-steps-bold" :to="`/experiment/${experiment}/timeline`">
            <Icon name="ph:steps-bold" />
            View Timeline
          </UIButton>

          <UIButton :to="`/experiment/${experiment}`">
            Start Experiment
            <Icon name="ph:play-circle-bold" />
          </UIButton>
        </div>
      </div>
    </div>
  </NuxtLayout>
</template>

<style scoped>
/* Custom styles for the timeline visualization */
.font-mono {
  font-family: 'SF Mono', Monaco, 'Inconsolata', 'Roboto Mono', 'Source Code Pro', monospace;
}
</style>
