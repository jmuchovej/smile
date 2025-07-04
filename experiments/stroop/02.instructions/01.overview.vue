<script setup lang="ts">
  const timeline = useTimeline();
</script>

<template>
  <div class="space-y-4" data-smile="page-overview">
    <h1 class="text-2xl font-semibold">Instructions</h1>
    <p>
      You will see a word printed in a colour. Ignore the word and report the
      <em>colour of the ink</em> as quickly as you can.
    </p>
    <ul class="list-disc pl-6">
      <li>Press <kbd>R</kbd> for red ink.</li>
      <li>Press <kbd>G</kbd> for green ink.</li>
      <li>Press <kbd>B</kbd> for blue ink.</li>
    </ul>
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
