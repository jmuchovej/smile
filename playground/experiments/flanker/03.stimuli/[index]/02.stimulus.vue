<script setup lang="ts">
import type { FlankerStimulus } from "#smile:experiments";

interface Props {
  stimulus: FlankerStimulus;
  duration?: number;
}

const props = withDefaults(defineProps<Props>(), {
  duration: 2000,
});

const emit = defineEmits<{
  response: [data: {
    response: "left" | "right" | "none";
    reactionTime: number;
    timestamp: number;
  }];
  complete: [];
}>();

// Response tracking
const stimulusStartTime = ref(0);
const responseGiven = ref(false);

// Compute arrow pattern based on stimulus data
const arrowPattern = computed(() => {
  const { target, flankers } = props.stimulus;
  return [flankers, flankers, target, flankers, flankers];
});

// Start timing when mounted
onMounted(() => {
  stimulusStartTime.value = Date.now();
  
  // Auto-advance after duration if no response
  setTimeout(() => {
    if (!responseGiven.value) {
      handleTimeout();
    }
  }, props.duration);
  
  window.addEventListener("keydown", handleKeyResponse);
});

onUnmounted(() => {
  window.removeEventListener("keydown", handleKeyResponse);
});

// Handle keyboard responses
function handleKeyResponse(event: KeyboardEvent) {
  if (responseGiven.value) return;

  if (event.key.toLowerCase() === "a") {
    event.preventDefault();
    recordResponse("left");
  } else if (event.key.toLowerCase() === "l") {
    event.preventDefault();
    recordResponse("right");
  }
}

// Record and process response
function recordResponse(response: "left" | "right" | "none") {
  if (responseGiven.value) return;

  responseGiven.value = true;
  const reactionTime = Date.now() - stimulusStartTime.value;

  // Emit response data
  emit("response", {
    response,
    reactionTime,
    timestamp: Date.now(),
  });

  // Complete immediately after response
  emit("complete");
}

// Handle timeout (no response)
function handleTimeout() {
  if (responseGiven.value) return;
  recordResponse("none");
}
</script>

<template>
  <div class="stimulus-container">
    <div class="arrow-display">
      <template v-for="(direction, index) in arrowPattern" :key="index">
        <Icon
          :name="`fa6-solid:arrow-${direction === 'left' ? 'left' : direction === 'right' ? 'right' : 'right'}`"
          :class="[
            'arrow-icon',
            index === 2 ? 'center-arrow' : 'flanker-arrow',
            direction === 'neutral' ? 'neutral-arrow' : ''
          ]"
          :style="direction === 'neutral' ? 'opacity: 0.3' : ''"
        />
      </template>
    </div>
  </div>
</template>

<style scoped>
.stimulus-container {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 400px;
  background: #f8fafc;
  border-radius: 12px;
  padding: 2rem;
}

.arrow-display {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  user-select: none;
}

.arrow-icon {
  font-size: 4rem;
  color: #374151;
}

.center-arrow {
  color: #dc2626;
  font-size: 4.5rem;
  filter: drop-shadow(0 2px 4px rgba(220, 38, 38, 0.3));
}

.flanker-arrow {
  color: #6b7280;
}

.neutral-arrow {
  color: #9ca3af;
}
</style>