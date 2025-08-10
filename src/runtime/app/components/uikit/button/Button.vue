<script setup lang="ts">
import type { PrimitiveProps } from "reka-ui";
import type { HTMLAttributes } from "vue";
import { computed } from "vue";
import type { ButtonVariants } from ".";
import type { RouteLocationRaw } from "vue-router";
import { Primitive } from "reka-ui";
import { cn } from '#smile/internal';
import { buttonVariants } from ".";

interface Props extends PrimitiveProps {
  variant?: ButtonVariants["variant"]
  size?: ButtonVariants["size"]
  class?: HTMLAttributes["class"]
  to?: RouteLocationRaw
  href?: Props["to"]
}

const props = withDefaults(defineProps<Props>(), {
  as: "button",
})

const to = computed(() => props.to ?? props.href)
</script>

<template>
  <NuxtLink :to="to" :class="{ 'cursor-pointer': to !== undefined }">
    <Primitive data-slot="button" :as="as" :as-child="asChild"
      :class="cn(buttonVariants({ variant, size }), props.class)">
      <slot />
    </Primitive>
  </NuxtLink>
</template>
