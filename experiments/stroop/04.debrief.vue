<script setup lang="ts">
  const config = useSmileConfig();
  const timeline = useTimeline();
  const purpose = config.extra<{ purpose: string }>("consent")?.purpose;
</script>

<template>
  <div class="space-y-4" data-smile="page-debrief">
    <h1 class="text-2xl font-semibold">Thank you</h1>
    <p>
      That is the end of the task. The words and ink colours sometimes disagreed on purpose: the
      slowdown on those trials is the Stroop effect.
    </p>
    <p data-smile="purpose">{{ purpose }}</p>
    <div class="flex justify-between">
      <UButton
        icon="i-lucide-arrow-left"
        label="Back"
        variant="ghost"
        data-smile="prev"
        @click="timeline.goPrev()" />
      <UButton label="Finish" :disabled="!timeline.hasNext.value" data-smile="next" />
    </div>
  </div>
</template>
