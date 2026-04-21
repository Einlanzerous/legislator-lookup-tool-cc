<script setup lang="ts">
import { AlertTriangle } from 'lucide-vue-next'

defineProps<{ message: string; hint?: string }>()
</script>

<template>
  <div
    role="alert"
    class="flex gap-3 rounded-xl border border-alert/20 bg-alert/5 p-4 text-sm text-alert-700"
  >
    <AlertTriangle class="h-5 w-5 flex-shrink-0 mt-0.5" aria-hidden="true" />
    <div class="space-y-1">
      <p class="font-medium">{{ message }}</p>
      <p v-if="hint" class="text-alert-700/80">{{ hint }}</p>
    </div>
  </div>
</template>
