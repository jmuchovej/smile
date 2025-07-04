<script setup lang="ts">
  const config = useSmileConfig();
  const timeline = useTimeline();
</script>

<template>
  <div class="space-y-4" data-smile="page-welcome">
    <h1 class="text-2xl font-semibold">Welcome</h1>
    <p>
      Thank you for taking part. This session takes about
      <strong data-smile="duration">{{ config.extra("duration") }}</strong> and pays
      <strong data-smile="compensation">{{ config.extra("compensation") }}</strong
      >.
    </p>
    <div class="flex justify-end">
      <UButton
        icon="i-lucide-arrow-right"
        label="Begin"
        trailing
        data-smile="next"
        @click="timeline.goNext()" />
    </div>
  </div>
</template>
