<script setup lang="ts">
import type { FlankerStimulus } from "#smile:experiments";

interface Props {
  stimulus: FlankerStimulus;
  response: "left" | "right" | "none";
  reactionTime: number;
  duration?: number;
}

const props = withDefaults(defineProps<Props>(), {
  duration: 800,
});

const emit = defineEmits<{
  complete: [];
}>();

// Calculate feedback based on response
const feedback = computed(() => {
  const correct = props.response === props.stimulus.correct;
  
  let message = "";
  if (correct) {
    const direction = props.response === "left" ? "left" : "right";
    message = `Correct! The center arrow pointed ${direction} (${props.reactionTime}ms).`;
  } else if (props.response === "none") {
    message = "Too slow! Please respond faster to the center arrow.";
  } else {
    const expectedDirection = props.stimulus.correct === "left" ? "left" : "right";
    const actualDirection = props.response === "left" ? "left" : "right";
    message = `The center arrow pointed ${expectedDirection}, not ${actualDirection}. Focus on the middle arrow only!`;
  }

  return { correct, message };
});

onMounted(() => {
  setTimeout(() => {
    emit('complete');
  }, props.duration);
});
</script>

<template>
  <div class="feedback-container">
    <div class="feedback" :class="feedback.correct ? 'correct' : 'incorrect'">
      <div class="feedback-text">
        {{ feedback.correct ? ' Correct!' : ' Incorrect' }}
      </div>
      <div class="feedback-details">
        {{ feedback.message }}
      </div>
    </div>
  </div>
</template>

<style scoped>
.feedback-container {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 400px;
  background: #f8fafc;
  border-radius: 12px;
  padding: 2rem;
}

.feedback {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  padding: 1.5rem;
  border-radius: 0.5rem;
  min-width: 300px;
  text-align: center;
}

.feedback.correct {
  background: #dcfce7;
  color: #166534;
  border: 2px solid #16a34a;
}

.feedback.incorrect {
  background: #fef2f2;
  color: #dc2626;
  border: 2px solid #dc2626;
}

.feedback-text {
  font-size: 1.5rem;
  font-weight: bold;
}

.feedback-details {
  font-size: 1rem;
  opacity: 0.8;
}
</style>