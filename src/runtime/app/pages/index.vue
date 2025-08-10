<script setup lang="ts">
import { definePageMeta } from "#imports";
import {
  Icon,
  UICard, UICardHeader, UICardTitle, UICardDescription, UICardContent,
  UIButton
} from "#components";

definePageMeta({
  layout: "smile-fullscreen",
})

const platforms = [
  {
    title: "Prolific",
    description: "[Prolific](https://prolific.co) is a platform for online experiments",
    buttons: [
      { id: "prolific-tester", color: "is-blue", icon: "lucide:dices", text: "Prolific User", url: "<PROLIFIC URL>" },
    ],
  },
  {
    title: "CloudResearch",
    description: "[CloudResearch](https://cloudresearch.com) is a platform that recruits from several sources, including Mechanical Turk but includes some screening for bots and server farms",
    buttons: [
      { id: "cloudresearch-tester", color: "is-pink", icon: "lucide:dices", text: "CR User", url: "<CLOUDRESEARCH URL>" },
    ],
  },
  {
    title: "Mechanical Turk",
    description: "[Amazon Mechanical Turk](https://mturk.com) is the original wild-west 🤠 of online crowd labor markets.",
    buttons: [
      { id: "mturk-preview", color: "is-light-yellow", icon: "lucide:dices", text: "AMT Preview Mode", url: "<MTURK-PREVIEW URL>" },
      { id: "mturk-tester", color: "is-yellow", icon: "lucide:dices", text: "AMT User", url: "<MTURK URL>" },
    ],
  },
  {
    title: "Citizen Science",
    description: "This is a stand-in for a possible future platform run by NYUCCL.",
    buttons: [
      { id: "citsci-tester", color: "is-green", icon: "lucide:dices", text: "CitSci User", url: "<CITSCI URL>" },
    ],
  },
  {
    title: "Anonymous Web User",
    description: "This mimicks a user who wasn't referred by any recruitment service.",
    buttons: [
      { id: "anonymous-tester", color: "is-purple", icon: "lucide:dices", text: "Anonymous User", url: "<ANONYMOUS URL>" },
    ],
  },
]
</script>

<template>
  <div class="px-4 md:px-8 lg:px-12 py-10 bg-background text-foreground global-color-mode">
    <div class="mb-8">
      <h1 class="text-3xl font-bold mb-4">Welcome to Smile Developer 🧑‍💻 Mode</h1>
      <p class="text-lg mb-6">
        You can use this to test your experiment(s), read the docs, QA your data, and recruit participants through
        multiple platforms.
      </p>
    </div>

    <hr class="my-4" />

    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      <UICard class="flex flex-col" v-for="platform in platforms" :key="platform.title">
        <UICardHeader>
          <UICardTitle> {{ platform.title }}</UICardTitle>
          <UICardDescription> {{ platform.description }} </UICardDescription>
        </UICardHeader>
        <UICardContent class="flex justify-end flex-1 space-y-2 flex-1 flex-col items-end">
          <UIButton v-for="button in platform.buttons" :key="button.id" as-child variant="default" size="xs"
            :class="button.color" :id="button.id">
            <a :href="button.url">
              <Icon :name="button.icon" />
              <span>{{ button.text }}</span>
              <Icon name="lucide:arrow-right" />
            </a>
          </UIButton>
        </UICardContent>
      </UICard>
    </div>
  </div>
</template>

<style scoped>
@reference "tailwindcss";

#prolific-tester {
  background-color: oklch(0.4382 0.2797 265.19);
  /* background-color: oklch(0.6973 0.2821 325.18); */
  /* background-color: oklch(0.3412 0.1057 272.55); */
}

#cloudresearch-tester {
  background-color: oklch(0.5341 0.1093 44.91);
}

#mturk-tester {
  background-color: oklch(0.7066 0.1483 67.91);
  /* background-color: oklch(0.5937 0.0995 86.86); */
}

#citsci-tester {
  @apply bg-emerald-500;
}

#anonymous-tester {
  @apply bg-indigo-500;
}
</style>
