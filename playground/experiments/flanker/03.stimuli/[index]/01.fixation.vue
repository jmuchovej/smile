<script setup lang="ts">
interface Props {
  duration?: number;
}

const props = withDefaults(defineProps<Props>(), {
  duration: 500,
});

const emit = defineEmits<{
  complete: [];
}>();

onMounted(() => {
  setTimeout(() => {
    emit('complete');
  }, props.duration);
});
</script>

<template>
  <div class="fixation-container">
    <div class="fixation-cross">+</div>
  </div>
</template>

<style scoped>
.fixation-container {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 400px;
  background: #f8fafc;
  border-radius: 12px;
  padding: 2rem;
}

.fixation-cross {
  font-size: 4rem;
  font-weight: bold;
  color: #374151;
}
</style>