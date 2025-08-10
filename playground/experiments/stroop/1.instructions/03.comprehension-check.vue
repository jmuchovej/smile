<script setup lang="ts">
import { z } from "zod";

// Define the answer schema
const answerSchema = z.object({
  q1: z.enum(["R", "G", "B"], {
    required_error: "Please select an answer for Question 1",
  }),
  q2: z.enum(["word", "color", "both"], {
    required_error: "Please select an answer for Question 2",
  }),
  q3: z.enum(["speed", "accuracy", "both"], {
    required_error: "Please select an answer for Question 3",
  }),
});

// Define correct answers schema
const correctAnswerSchema = z.object({
  q1: z.literal("R"),
  q2: z.literal("color"),
  q3: z.literal("both"),
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
  q1: "R",
  q2: "color",
  q3: "both",
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
      message: "Correct! You focus on the color, not the word.",
    };
  } else {
    feedback.value.q1 = {
      correct: false,
      message:
        "Not quite. Remember, you should respond to the COLOR of the text, which is red in this case.",
    };
  }

  // Check Q2
  if (validatedAnswers.q2 === correctAnswers.q2) {
    feedback.value.q2 = {
      correct: true,
      message: "Exactly right! Your task is to identify the color of the text.",
    };
  } else {
    feedback.value.q2 = {
      correct: false,
      message:
        "Incorrect. Your job is to look at the COLOR of the text and press the matching key.",
    };
  }

  // Check Q3
  if (validatedAnswers.q3 === correctAnswers.q3) {
    feedback.value.q3 = {
      correct: true,
      message: "Perfect! Try to be both fast and accuracy.",
    };
  } else {
    feedback.value.q3 = {
      correct: false,
      message:
        "Try again. You want to balance both speed and accuracy - be as fast as you can while staying correct.",
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
  <NuxtLayout name="smile-default">
    <div class="container mx-auto px-4 py-8 max-w-4xl">
      <div class="bg-white rounded-lg shadow p-8">
        <h1 class="text-3xl font-bold mb-6">Understanding Check</h1>
        <p class="text-lg mb-8">Let's make sure you understand the task. Answer these questions correctly to continue:
        </p>

        <div class="space-y-8">
          <!-- Question 1 -->
          <div class="border rounded-lg p-6">
            <h3 class="text-xl font-semibold mb-4">Question 1</h3>
            <p class="mb-4">If you see the word "GREEN" written in <span
                style="color: red; font-weight: bold;">red</span>, what key should you press?</p>

            <div class="space-y-2">
              <label class="flex items-center space-x-3">
                <input v-model="answers.q1" type="radio" value="R" class="form-radio">
                <span>R (for red)</span>
              </label>
              <label class="flex items-center space-x-3">
                <input v-model="answers.q1" type="radio" value="G" class="form-radio">
                <span>G (for green)</span>
              </label>
              <label class="flex items-center space-x-3">
                <input v-model="answers.q1" type="radio" value="B" class="form-radio">
                <span>B (for blue)</span>
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
            <p class="mb-4">Your task is to:</p>

            <div class="space-y-2">
              <label class="flex items-center space-x-3">
                <input v-model="answers.q2" type="radio" value="word" class="form-radio">
                <span>Read the word and press the key that matches the word</span>
              </label>
              <label class="flex items-center space-x-3">
                <input v-model="answers.q2" type="radio" value="color" class="form-radio">
                <span>Look at the color of the text and press the key that matches the color</span>
              </label>
              <label class="flex items-center space-x-3">
                <input v-model="answers.q2" type="radio" value="both" class="form-radio">
                <span>Press a key only when the word and color match</span>
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
            <p class="mb-4">What should you prioritize during the task?</p>

            <div class="space-y-2">
              <label class="flex items-center space-x-3">
                <input v-model="answers.q3" type="radio" value="speed" class="form-radio">
                <span>Speed only - respond as fast as possible</span>
              </label>
              <label class="flex items-center space-x-3">
                <input v-model="answers.q3" type="radio" value="accuracy" class="form-radio">
                <span>Accuracy only - take your time to be correct</span>
              </label>
              <label class="flex items-center space-x-3">
                <input v-model="answers.q3" type="radio" value="both" class="form-radio">
                <span>Both speed and accuracy - be as fast as possible while staying accurate</span>
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
          <p class="text-green-600 font-semibold mb-4">Great! You understand the task. Let's move on.</p>
          <NuxtLink to="/experiments/stroop/instructions/ready"
            class="px-8 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors inline-block">
            Continue to Task →
          </NuxtLink>
        </div>
      </div>
    </div>
  </NuxtLayout>
</template>
