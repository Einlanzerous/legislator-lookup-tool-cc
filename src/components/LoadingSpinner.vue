<script setup lang="ts">
defineProps<{ label?: string }>()
</script>

<template>
  <div class="flex items-center gap-3 text-slate-600" role="status" aria-live="polite">
    <svg
      class="h-5 w-5 animate-spin text-brand-600"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
      <path
        class="opacity-80"
        fill="currentColor"
        d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
      />
    </svg>
    <span class="text-sm">{{ label ?? 'Looking up your representatives…' }}</span>
  </div>
</template>
