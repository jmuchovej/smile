<script setup lang="ts">
import type { HTMLAttributes } from "vue"
import { PanelLeft } from "lucide-vue-next"
import { Icon } from "#components";
import { cn } from '#smile/internal'
import { Button } from '#smile:app/components/uikit/button'
import { useSidebar } from "./utils"

const props = defineProps<{
  class?: HTMLAttributes["class"]
}>()

const { toggleSidebar } = useSidebar()
</script>

<template>
  <Button data-sidebar="trigger" data-slot="sidebar-trigger" variant="ghost" size="icon"
    :class="cn('h-7 w-7', props.class)" @click="toggleSidebar">
    <Icon name="ph:sidebar-simple" />
    <span class="sr-only">Toggle Sidebar</span>
  </Button>
</template>
