<script setup lang="ts">
  import { ref } from "vue";

  const timeline = useTimeline();
  const answer = ref<string | undefined>();
  const correct = "the colour of the ink";
  const options = ["the word itself", correct, "the length of the word"];
</script>

<template>
  <div class="space-y-4" data-smile="page-check">
    <h1 class="text-2xl font-semibold">Quick check</h1>
    <p>What should you respond to?</p>
    <URadioGroup v-model="answer" :items="options" data-smile="check-options" />
    <div class="flex justify-between">
      <UButton
        icon="i-lucide-arrow-left"
        label="Back"
        variant="ghost"
        data-smile="prev"
        @click="timeline.goPrev()" />
      <UButton
        icon="i-lucide-arrow-right"
        label="Start the trials"
        trailing
        :disabled="answer !== correct"
        data-smile="next"
        @click="timeline.goNext()" />
    </div>
  </div>
</template>
