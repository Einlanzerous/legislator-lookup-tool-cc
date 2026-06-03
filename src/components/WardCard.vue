<script setup lang="ts">
import type { RepGroup } from '../types'
import RepresentativeCard from './RepresentativeCard.vue'

defineProps<{ group: RepGroup; ward: string }>()
</script>

<template>
  <section aria-labelledby="ward-heading" class="space-y-3">
    <header class="flex items-end justify-between gap-3">
      <h2
        id="ward-heading"
        class="text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400"
      >
        {{ group.title }}
      </h2>
      <span
        class="stc-chip bg-accent-100 text-accent-800 ring-1 ring-accent-300/60
               dark:bg-accent-800/30 dark:text-accent-300 dark:ring-accent-600/40"
      >
        Most local
      </span>
    </header>

    <div class="flex flex-col sm:flex-row gap-4">
      <!-- The ward number is the primary thing people look up in person, so it
           gets its own prominent box. -->
      <div
        class="flex flex-col items-center justify-center rounded-2xl shadow-card
               px-6 py-5 sm:py-0 sm:w-44 flex-shrink-0
               bg-brand-800 text-white dark:bg-brand-700"
      >
        <span class="text-xs font-semibold uppercase tracking-[0.18em] text-brand-200">
          Ward
        </span>
        <span class="mt-1 text-6xl sm:text-7xl font-bold leading-none tabular-nums">
          {{ ward }}
        </span>
      </div>

      <!-- Ward Alderperson, shown beside the ward number. -->
      <RepresentativeCard :rep="group.reps[0]" class="flex-1" />
    </div>
  </section>
</template>
