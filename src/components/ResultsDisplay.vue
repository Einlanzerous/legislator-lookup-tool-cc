<script setup lang="ts">
import { computed } from 'vue'
import { MapPin } from 'lucide-vue-next'
import type { LookupResult } from '../types'
import RepresentativeGroup from './RepresentativeGroup.vue'
import WardCard from './WardCard.vue'

const props = defineProps<{ result: LookupResult }>()

const aldermanGroup = computed(() =>
  props.result.groups.find((g) => g.category === 'alderman')
)
const otherGroups = computed(() =>
  props.result.groups.filter((g) => g.category !== 'alderman')
)
</script>

<template>
  <div class="space-y-6">
    <div class="flex items-start gap-2 text-slate-600 dark:text-slate-400 text-sm">
      <MapPin class="h-4 w-4 mt-0.5 flex-shrink-0 text-brand-600 dark:text-brand-400" aria-hidden="true" />
      <p>
        Results for
        <span class="font-medium text-slate-900 dark:text-slate-100">{{ result.normalizedAddress }}</span>
      </p>
    </div>

    <div v-if="result.groups.length === 0" class="stc-card p-6 text-slate-600 dark:text-slate-400 text-sm">
      We couldn't find any representatives for that address. Double-check the
      street number and try again, or pick a point on the map.
    </div>

    <WardCard
      v-if="aldermanGroup && result.ward"
      :group="aldermanGroup"
      :ward="result.ward"
    />

    <div class="grid gap-6 lg:grid-cols-2">
      <RepresentativeGroup
        v-for="group in otherGroups"
        :key="group.category"
        :group="group"
      />
    </div>
  </div>
</template>
