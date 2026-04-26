<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{ name: string }>()

const initials = computed(() => {
  const parts = props.name.trim().split(/\s+/)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0]!.charAt(0).toUpperCase()
  return (parts[0]!.charAt(0) + parts[parts.length - 1]!.charAt(0)).toUpperCase()
})
</script>

<template>
  <div
    class="flex items-center justify-center rounded-full bg-brand-100 text-brand-800 dark:bg-brand-800/50 dark:text-brand-300 font-semibold select-none"
    aria-hidden="true"
  >
    {{ initials }}
  </div>
</template>
