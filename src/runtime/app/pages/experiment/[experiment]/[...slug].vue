<script setup lang="ts">
import { computed, defineAsyncComponent } from "vue";
import { useRoute, useAppConfig, useFetch } from "#imports";
import MdxRenderer from "#smile:app/components/MdxRenderer.vue"

const route = useRoute()
const config = useAppConfig().smile

// Handle both Vue components and MDX content
const isVueComponent = computed(() => route.meta?.type === 'vue')
const isMdxContent = computed(() => route.meta?.type === 'mdx')

// Dynamic Vue component loader (only for Vue files)
const dynamicComponent = computed(() => {
  if (!isVueComponent.value) return null
  return defineAsyncComponent(() =>
    import(/* @vite-ignore */route.meta.filepath)
  )
})

// MDX content loader (only for MDX files)
const { data: mdxResponse } = await useFetch(() => {
  if (!isMdxContent.value) return null
  return `/api/smile/mdx-content/${route.meta.filepath}`
})

// Extract the actual content from the response
const mdxContent = computed(() => {
  if (!mdxResponse.value) return null
  if (mdxResponse.value.error) {
    console.error('MDX Error:', mdxResponse.value)
    return null
  }
  return mdxResponse.value
})
</script>

<template>
  <!-- Vue component rendering -->
  <component v-if="isVueComponent && dynamicComponent" :is="dynamicComponent" :smile="config"
    :frontmatter="route.meta.frontmatter" :timeline-step="route.meta.timelineStep" />

  <!-- MDX content rendering -->
  <MdxRenderer v-else-if="isMdxContent && mdxContent" :value="mdxContent" :data="{
    smile: config,
    frontmatter: route.meta.frontmatter,
    timelineStep: route.meta.timelineStep
  }" />

  <!-- Fallback for unknown content types -->
  <div v-else class="p-4 text-center text-gray-500">
    <p>Unable to render content for this route.</p>
    <pre class="mt-2 text-xs">{{ route.meta }}</pre>
  </div>
</template>
