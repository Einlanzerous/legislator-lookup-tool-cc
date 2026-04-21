<script setup lang="ts">
import { MapPin } from 'lucide-vue-next'
import type { LookupResult } from '../types'
import RepresentativeGroup from './RepresentativeGroup.vue'

defineProps<{ result: LookupResult }>()
</script>

<template>
  <div class="space-y-6">
    <div class="flex items-start gap-2 text-slate-600 text-sm">
      <MapPin class="h-4 w-4 mt-0.5 flex-shrink-0 text-brand-600" aria-hidden="true" />
      <p>
        Results for
        <span class="font-medium text-slate-900">{{ result.normalizedAddress }}</span>
      </p>
    </div>

    <div v-if="result.groups.length === 0" class="stc-card p-6 text-slate-600 text-sm">
      We couldn't find any representatives for that address. Double-check the
      street number and try again, or pick a point on the map.
    </div>

    <RepresentativeGroup
      v-for="(group, idx) in result.groups"
      :key="group.category"
      :group="group"
      :highlight="idx === 0 && group.category === 'alderman'"
    />
  </div>
</template>
