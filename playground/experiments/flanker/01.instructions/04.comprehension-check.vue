<script setup lang="ts">
import { z } from "zod";
import { ref, computed } from "vue";

// Define the answer schema
const answerSchema = z.object({
  q1: z.enum(["left", "right", "both"], {
    required_error: "Please select an answer for Question 1",
  }),
  q2: z.enum(["all_arrows", "center_arrow", "flanker_arrows"], {
    required_error: "Please select an answer for Question 2",
  }),
  q3: z.enum(["congruent", "incongruent", "neutral"], {
    required_error: "Please select an answer for Question 3",
  }),
});

// Define correct answers schema
const correctAnswerSchema = z.object({
  q1: z.literal("right"),
  q2: z.literal("center_arrow"),
  q3: z.literal("incongruent"),
});

type AnswerData = z.infer<typeof answerSchema>;
type CorrectAnswers = z.infer<typeof correctAnswerSchema>;

const answers = ref<Partial<AnswerData>>({
  q1: undefined,
  q2: undefined,
  q3: undefined,
});

const feedback = ref({
  q1: null as { correct: boolean; message: string } | null,
  q2: null as { correct: boolean; message: string } | null,
  q3: null as { correct: boolean; message: string } | null,
});

const validationErrors = ref<Partial<Record<keyof AnswerData, string>>>({});

const correctAnswers: CorrectAnswers = {
  q1: "right",
  q2: "center_arrow",
  q3: "incongruent",
};

const allAnswered = computed(() => {
  const result = answerSchema.safeParse(answers.value);
  return result.success;
});

const allCorrect = computed(() => {
  return (
    feedback.value.q1?.correct &&
    feedback.value.q2?.correct &&
    feedback.value.q3?.correct
  );
});

function validateAnswers(): boolean {
  const result = answerSchema.safeParse(answers.value);

  if (!result.success) {
    // Clear previous errors
    validationErrors.value = {};

    // Set validation errors
    result.error.errors.forEach((error) => {
      const field = error.path[0] as keyof AnswerData;
      validationErrors.value[field] = error.message;
    });
    return false;
  }

  // Clear validation errors if all valid
  validationErrors.value = {};
  return true;
}

function checkAnswers() {
  // First validate that all answers are provided
  if (!validateAnswers()) {
    return;
  }

  // Parse the validated answers
  const validatedAnswers = answerSchema.parse(answers.value);

  // Check Q1
  if (validatedAnswers.q1 === correctAnswers.q1) {
    feedback.value.q1 = {
      correct: true,
      message: "Correct! Focus on the center arrow, which points right.",
    };
  } else {
    feedback.value.q1 = {
      correct: false,
      message:
        "Not quite. In the Flanker task, you always respond to the CENTER arrow's direction, regardless of the flankers.",
    };
  }

  // Check Q2
  if (validatedAnswers.q2 === correctAnswers.q2) {
    feedback.value.q2 = {
      correct: true,
      message:
        "Exactly right! The center arrow is your only target - ignore the distracting flankers.",
    };
  } else {
    feedback.value.q2 = {
      correct: false,
      message:
        "Remember, the flanking arrows are distractors. You should focus only on the center arrow.",
    };
  }

  // Check Q3
  if (validatedAnswers.q3 === correctAnswers.q3) {
    feedback.value.q3 = {
      correct: true,
      message:
        "Perfect! Incongruent trials are harder because the flankers create conflicting information.",
    };
  } else {
    feedback.value.q3 = {
      correct: false,
      message:
        "Try again. Incongruent trials are the most challenging because the flankers point in the opposite direction from the center arrow.",
    };
  }
}

// Clear validation errors when user changes answers
watch(
  answers,
  () => {
    validationErrors.value = {};
  },
  { deep: true }
);
</script>

<template>
  <div class="container mx-auto px-4 py-8 max-w-4xl">
    <div class="bg-white rounded-lg shadow p-8">
      <h1 class="text-3xl font-bold mb-6">Understanding Check</h1>
      <p class="text-lg mb-8">Let's make sure you understand the Flanker task. Answer these questions correctly to
        continue:</p>

      <div class="space-y-8">
        <!-- Question 1 -->
        <div class="border rounded-lg p-6">
          <h3 class="text-xl font-semibold mb-4">Question 1</h3>
          <p class="mb-4">For this arrow pattern: <span style="font-size: 32px; font-family: monospace;">← ← → ←
              ←</span>, which key should you press?</p>

          <div class="space-y-2">
            <label class="flex items-center space-x-3">
              <input v-model="answers.q1" type="radio" value="left" class="form-radio">
              <span>LEFT ARROW (because most arrows point left)</span>
            </label>
            <label class="flex items-center space-x-3">
              <input v-model="answers.q1" type="radio" value="right" class="form-radio">
              <span>RIGHT ARROW (because the center arrow points right)</span>
            </label>
            <label class="flex items-center space-x-3">
              <input v-model="answers.q1" type="radio" value="both" class="form-radio">
              <span>Press both keys because the arrows are mixed</span>
            </label>
          </div>

          <!-- Validation Error -->
          <div v-if="validationErrors.q1" class="mt-3 p-3 rounded bg-yellow-100 text-yellow-800">
            {{ validationErrors.q1 }}
          </div>

          <!-- Feedback -->
          <div v-if="feedback.q1" class="mt-3 p-3 rounded"
            :class="feedback.q1.correct ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'">
            {{ feedback.q1.message }}
          </div>
        </div>

        <!-- Question 2 -->
        <div class="border rounded-lg p-6">
          <h3 class="text-xl font-semibold mb-4">Question 2</h3>
          <p class="mb-4">What should you focus on during the task?</p>

          <div class="space-y-2">
            <label class="flex items-center space-x-3">
              <input v-model="answers.q2" type="radio" value="all_arrows" class="form-radio">
              <span>All the arrows to get the full picture</span>
            </label>
            <label class="flex items-center space-x-3">
              <input v-model="answers.q2" type="radio" value="center_arrow" class="form-radio">
              <span>Only the center arrow, ignoring the flankers</span>
            </label>
            <label class="flex items-center space-x-3">
              <input v-model="answers.q2" type="radio" value="flanker_arrows" class="form-radio">
              <span>The flanking arrows since there are more of them</span>
            </label>
          </div>

          <!-- Validation Error -->
          <div v-if="validationErrors.q2" class="mt-3 p-3 rounded bg-yellow-100 text-yellow-800">
            {{ validationErrors.q2 }}
          </div>

          <!-- Feedback -->
          <div v-if="feedback.q2" class="mt-3 p-3 rounded"
            :class="feedback.q2.correct ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'">
            {{ feedback.q2.message }}
          </div>
        </div>

        <!-- Question 3 -->
        <div class="border rounded-lg p-6">
          <h3 class="text-xl font-semibold mb-4">Question 3</h3>
          <p class="mb-4">Which type of trial is typically hardest?</p>

          <div class="space-y-2">
            <label class="flex items-center space-x-3">
              <input v-model="answers.q3" type="radio" value="congruent" class="form-radio">
              <span>Congruent trials (all arrows point the same way): → → → → →</span>
            </label>
            <label class="flex items-center space-x-3">
              <input v-model="answers.q3" type="radio" value="incongruent" class="form-radio">
              <span>Incongruent trials (center differs from flankers): → → ← → →</span>
            </label>
            <label class="flex items-center space-x-3">
              <input v-model="answers.q3" type="radio" value="neutral" class="form-radio">
              <span>Neutral trials (flankers are dashes): — — → — —</span>
            </label>
          </div>

          <!-- Validation Error -->
          <div v-if="validationErrors.q3" class="mt-3 p-3 rounded bg-yellow-100 text-yellow-800">
            {{ validationErrors.q3 }}
          </div>

          <!-- Feedback -->
          <div v-if="feedback.q3" class="mt-3 p-3 rounded"
            :class="feedback.q3.correct ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'">
            {{ feedback.q3.message }}
          </div>
        </div>
      </div>

      <!-- Check Answers Button -->
      <div class="mt-8 text-center">
        <button @click="checkAnswers"
          class="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
          Check My Answers
        </button>
      </div>

      <!-- Continue Button (only shown when all correct) -->
      <div v-if="allCorrect" class="mt-6 text-center">
        <p class="text-green-600 font-semibold mb-4">Perfect! You understand the Flanker task. Let's begin!</p>
        <NuxtLink to="/experiments/flanker/instructions/ready"
          class="px-8 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors inline-block">
          Continue to Task →
        </NuxtLink>
      </div>
    </div>
  </div>
</template>
