<template>
  <NuxtLayout name="smile-default">
    <div class="container mx-auto px-4 py-8 max-w-4xl">
      <div class="bg-white rounded-lg shadow p-8">
        <h1 class="text-3xl font-bold mb-6">Understanding Check</h1>
        <p class="text-lg mb-8">Let's make sure you understand the Go/No-Go task. Answer these questions correctly to continue:</p>

        <div class="space-y-8">
          <!-- Question 1 -->
          <div class="border rounded-lg p-6">
            <h3 class="text-xl font-semibold mb-4">Question 1</h3>
            <p class="mb-4">When you see a <strong>Go letter</strong> (like "R"), what should you do?</p>
            
            <div class="space-y-2">
              <label class="flex items-center space-x-3">
                <input v-model="answers.q1" type="radio" value="press_spacebar" class="form-radio">
                <span>Press the SPACEBAR as quickly as possible</span>
              </label>
              <label class="flex items-center space-x-3">
                <input v-model="answers.q1" type="radio" value="do_nothing" class="form-radio">
                <span>Don't press anything</span>
              </label>
              <label class="flex items-center space-x-3">
                <input v-model="answers.q1" type="radio" value="press_any_key" class="form-radio">
                <span>Press any key on the keyboard</span>
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
            <p class="mb-4">When you see a <strong>No-Go letter</strong> (like "P"), what should you do?</p>
            
            <div class="space-y-2">
              <label class="flex items-center space-x-3">
                <input v-model="answers.q2" type="radio" value="press_spacebar" class="form-radio">
                <span>Press the SPACEBAR quickly</span>
              </label>
              <label class="flex items-center space-x-3">
                <input v-model="answers.q2" type="radio" value="do_nothing" class="form-radio">
                <span>Don't press anything - resist the urge to respond</span>
              </label>
              <label class="flex items-center space-x-3">
                <input v-model="answers.q2" type="radio" value="wait_then_press" class="form-radio">
                <span>Wait a moment, then press the SPACEBAR</span>
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
            <p class="mb-4">Which type of letter appears more frequently in this task?</p>
            
            <div class="space-y-2">
              <label class="flex items-center space-x-3">
                <input v-model="answers.q3" type="radio" value="go_letters" class="form-radio">
                <span>Go letters (about 75% of trials)</span>
              </label>
              <label class="flex items-center space-x-3">
                <input v-model="answers.q3" type="radio" value="nogo_letters" class="form-radio">
                <span>No-Go letters (about 75% of trials)</span>
              </label>
              <label class="flex items-center space-x-3">
                <input v-model="answers.q3" type="radio" value="equal" class="form-radio">
                <span>They appear equally often (50/50)</span>
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
          <button 
            @click="checkAnswers" 
            class="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Check My Answers
          </button>
        </div>

        <!-- Continue Button (only shown when all correct) -->
        <div v-if="allCorrect" class="mt-6 text-center">
          <p class="text-green-600 font-semibold mb-4">Perfect! You understand the Go/No-Go task. Let's begin!</p>
          <NuxtLink 
            to="/experiments/gonogo/instructions/ready"
            class="px-8 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors inline-block"
          >
            Continue to Task →
          </NuxtLink>
        </div>
      </div>
    </div>
  </NuxtLayout>
</template>

<script setup lang="ts">
import { z } from "zod";

// Define the answer schema
const answerSchema = z.object({
  q1: z.enum(["press_spacebar", "do_nothing", "press_any_key"], {
    required_error: "Please select an answer for Question 1",
  }),
  q2: z.enum(["press_spacebar", "do_nothing", "wait_then_press"], {
    required_error: "Please select an answer for Question 2",
  }),
  q3: z.enum(["go_letters", "nogo_letters", "equal"], {
    required_error: "Please select an answer for Question 3",
  }),
});

// Define correct answers schema
const correctAnswerSchema = z.object({
  q1: z.literal("press_spacebar"),
  q2: z.literal("do_nothing"),
  q3: z.literal("go_letters"),
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
  q1: "press_spacebar",
  q2: "do_nothing",
  q3: "go_letters",
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
      message: "Correct! Press SPACEBAR quickly for Go letters.",
    };
  } else {
    feedback.value.q1 = {
      correct: false,
      message:
        "Not quite. For Go letters, you should press the SPACEBAR as fast as possible.",
    };
  }

  // Check Q2
  if (validatedAnswers.q2 === correctAnswers.q2) {
    feedback.value.q2 = {
      correct: true,
      message: "Exactly right! For No-Go letters, resist the urge to press anything.",
    };
  } else {
    feedback.value.q2 = {
      correct: false,
      message:
        "Incorrect. No-Go letters require you to stop your response - don't press anything!",
    };
  }

  // Check Q3
  if (validatedAnswers.q3 === correctAnswers.q3) {
    feedback.value.q3 = {
      correct: true,
      message:
        "Perfect! Go letters appear about 75% of the time, which makes stopping harder.",
    };
  } else {
    feedback.value.q3 = {
      correct: false,
      message:
        "Try again. Go letters are much more frequent (75%), which makes your brain expect to press the spacebar.",
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