<script setup lang="ts">
import { ref, computed } from 'vue'
import { Phone, Mail, Globe, ExternalLink } from 'lucide-vue-next'
import type { Representative } from '../types'
import PlaceholderAvatar from './PlaceholderAvatar.vue'

const props = defineProps<{ rep: Representative }>()

// If the photo URL 404s after load, fall back to initials avatar.
const imageFailed = ref(false)
const hasPhoto = computed(() => !!props.rep.photoUrl && !imageFailed.value)

const partyColor = computed(() => {
  const p = props.rep.party?.toLowerCase() ?? ''
  if (p.includes('democrat')) return 'bg-blue-50 text-blue-700 ring-1 ring-blue-200 dark:bg-blue-950/50 dark:text-blue-300 dark:ring-blue-800'
  if (p.includes('republic')) return 'bg-red-50 text-red-700 ring-1 ring-red-200 dark:bg-red-950/50 dark:text-red-300 dark:ring-red-800'
  if (p.includes('independent')) return 'bg-purple-50 text-purple-700 ring-1 ring-purple-200 dark:bg-purple-950/50 dark:text-purple-300 dark:ring-purple-800'
  if (p) return 'bg-slate-100 text-slate-700 ring-1 ring-slate-200 dark:bg-slate-700 dark:text-slate-300 dark:ring-slate-600'
  return ''
})
</script>

<template>
  <article class="stc-card p-5 h-full flex flex-col">
    <div class="flex items-start gap-4">
      <img
        v-if="hasPhoto"
        :src="rep.photoUrl"
        :alt="`Photo of ${rep.name}`"
        loading="lazy"
        referrerpolicy="no-referrer"
        @error="imageFailed = true"
        class="h-16 w-16 rounded-full object-cover ring-1 ring-slate-200 dark:ring-slate-700 bg-slate-100 dark:bg-slate-700 flex-shrink-0"
      />
      <PlaceholderAvatar
        v-else
        :name="rep.name"
        class="h-16 w-16 text-lg flex-shrink-0"
      />

      <div class="min-w-0 flex-1">
        <h3 class="font-semibold text-slate-900 dark:text-slate-100 leading-tight truncate">
          {{ rep.name }}
        </h3>
        <p class="text-sm text-slate-600 dark:text-slate-400 mt-0.5">{{ rep.officeName }}</p>
        <span v-if="rep.party" :class="['stc-chip mt-2', partyColor]">
          {{ rep.party }}
        </span>
      </div>
    </div>

    <ul
      v-if="rep.phone || rep.email || rep.website || rep.socials.length"
      class="mt-4 space-y-2 text-sm"
    >
      <li v-if="rep.phone" class="flex items-center gap-2 text-slate-700 dark:text-slate-300">
        <Phone class="h-4 w-4 text-slate-400 dark:text-slate-500 flex-shrink-0" aria-hidden="true" />
        <a :href="`tel:${rep.phone}`" class="hover:text-brand-700 dark:hover:text-brand-400">{{ rep.phone }}</a>
      </li>
      <li v-if="rep.email" class="flex items-center gap-2 text-slate-700 dark:text-slate-300 min-w-0">
        <Mail class="h-4 w-4 text-slate-400 dark:text-slate-500 flex-shrink-0" aria-hidden="true" />
        <a :href="`mailto:${rep.email}`" class="hover:text-brand-700 dark:hover:text-brand-400 truncate">{{ rep.email }}</a>
      </li>
      <li v-if="rep.website" class="flex items-center gap-2 text-slate-700 dark:text-slate-300 min-w-0">
        <Globe class="h-4 w-4 text-slate-400 dark:text-slate-500 flex-shrink-0" aria-hidden="true" />
        <a
          :href="rep.website"
          target="_blank"
          rel="noopener noreferrer"
          class="hover:text-brand-700 dark:hover:text-brand-400 truncate inline-flex items-center gap-1"
        >
          <span class="truncate">Official website</span>
          <ExternalLink class="h-3 w-3 flex-shrink-0" aria-hidden="true" />
        </a>
      </li>
    </ul>

    <div v-if="rep.socials.length" class="mt-auto pt-4 flex flex-wrap gap-2">
      <a
        v-for="s in rep.socials"
        :key="s.type + s.id"
        :href="s.url"
        target="_blank"
        rel="noopener noreferrer"
        class="stc-chip bg-slate-100 text-slate-700 hover:bg-slate-200
               dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600"
      >
        {{ s.type }}
      </a>
    </div>
  </article>
</template>
