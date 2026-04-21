<script setup lang="ts">
import type { RepGroup } from '../types'
import RepresentativeCard from './RepresentativeCard.vue'

defineProps<{ group: RepGroup; highlight?: boolean }>()
</script>

<template>
  <section :aria-labelledby="`group-${group.category}`">
    <header class="flex items-end justify-between gap-3 mb-3">
      <div>
        <h2
          :id="`group-${group.category}`"
          class="text-sm font-semibold uppercase tracking-wide text-slate-500"
        >
          {{ group.title }}
        </h2>
        <p v-if="group.subtitle" class="text-lg font-semibold text-brand-800 mt-0.5">
          {{ group.subtitle }}
        </p>
      </div>
      <span
        v-if="highlight"
        class="stc-chip bg-accent-100 text-accent-800 ring-1 ring-accent-300/60"
      >
        Most local
      </span>
    </header>

    <div
      class="grid gap-4"
      :class="group.reps.length > 1 ? 'sm:grid-cols-2' : ''"
    >
      <RepresentativeCard v-for="rep in group.reps" :key="rep.id" :rep="rep" />
    </div>
  </section>
</template>
