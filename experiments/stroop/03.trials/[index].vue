<script setup lang="ts">
  import { computed } from "vue";

  const route = useRoute();
  const stimuli = useStimuli();
  const timeline = useTimeline();

  const trial = computed(() => stimuli.byTrialId(String(route.params.index)));
  const position = computed(() => stimuli.indexOf(String(route.params.index)) + 1);

  const inkClass: Record<string, string> = {
    red: "text-red-600",
    green: "text-green-600",
    blue: "text-blue-600",
  };
</script>

<template>
  <div class="space-y-6 text-center" data-smile="page-trial">
    <p class="text-sm text-neutral-500" data-smile="trial-position">
      Trial {{ position }} of {{ stimuli.count }}
    </p>
    <p
      v-if="trial"
      class="text-6xl font-bold"
      :class="inkClass[trial.color]"
      data-smile="trial-word">
      {{ trial.word }}
    </p>
    <p v-else data-smile="trial-missing">No stimulus for trial {{ route.params.index }}.</p>
    <p class="text-neutral-600">Press R, G or B for the ink colour.</p>
    <div class="flex justify-between">
      <UButton
        icon="i-lucide-arrow-left"
        label="Back"
        variant="ghost"
        data-smile="prev"
        @click="timeline.goPrev()" />
      <UButton
        icon="i-lucide-arrow-right"
        label="Next"
        trailing
        data-smile="next"
        @click="timeline.goNext()" />
    </div>
  </div>
</template>
