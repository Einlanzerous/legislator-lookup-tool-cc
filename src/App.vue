<script setup lang="ts">
import { computed, ref } from 'vue'
import { Map as MapIcon, ChevronDown, Sun, Moon } from 'lucide-vue-next'
import AddressSearch from './components/AddressSearch.vue'
import ResultsDisplay from './components/ResultsDisplay.vue'
import LoadingSpinner from './components/LoadingSpinner.vue'
import ErrorMessage from './components/ErrorMessage.vue'
import MapPicker from './components/MapPicker.vue'
import { lookupRepresentatives } from './services/civicApi'
import { CivicApiError, type LookupResult } from './types'

const workerUrl = import.meta.env.VITE_WORKER_URL

const address = ref('')
const loading = ref(false)
const result = ref<LookupResult | null>(null)
const error = ref<{ message: string; hint?: string } | null>(null)
const showMap = ref(false)
const isDark = ref(localStorage.getItem('theme') === 'dark')

let currentRequest: AbortController | null = null

const canShowMap = computed(() => !!workerUrl)

function toggleDark() {
  isDark.value = !isDark.value
  document.documentElement.classList.toggle('dark', isDark.value)
  localStorage.setItem('theme', isDark.value ? 'dark' : 'light')
}

async function runLookup() {
  if (!address.value.trim()) return

  currentRequest?.abort()
  currentRequest = new AbortController()

  loading.value = true
  error.value = null
  try {
    result.value = await lookupRepresentatives(
      address.value,
      currentRequest.signal
    )
  } catch (err) {
    if ((err as Error).name === 'AbortError') return
    result.value = null
    if (err instanceof CivicApiError) {
      error.value = { message: err.message, hint: err.hint }
    } else {
      error.value = { message: 'Something went wrong looking up that address.' }
    }
  } finally {
    loading.value = false
  }
}

function reset() {
  currentRequest?.abort()
  address.value = ''
  result.value = null
  error.value = null
  loading.value = false
}

function onMapPick(picked: string) {
  address.value = picked
  runLookup()
}
</script>

<template>
  <div class="stc-root min-h-full w-full bg-slate-50 dark:bg-slate-950 py-8 px-4 sm:px-6">
    <div class="mx-auto max-w-5xl">
      <header class="mb-6 sm:mb-8 flex items-start justify-between gap-4">
        <div>
          <p class="text-xs font-semibold uppercase tracking-[0.18em] text-brand-600 dark:text-brand-400">
            Strong Towns Chicago
          </p>
          <h1 class="mt-1 text-2xl sm:text-3xl font-bold text-brand-900 dark:text-slate-100">
            Find your elected officials
          </h1>
          <p class="mt-2 text-slate-600 dark:text-slate-400 max-w-xl">
            Enter your Chicago address to see your Ward Alderman and your state
            and federal legislators.
          </p>
        </div>
        <button
          type="button"
          @click="toggleDark"
          class="stc-btn-ghost mt-1 flex-shrink-0"
          :aria-label="isDark ? 'Switch to light mode' : 'Switch to dark mode'"
        >
          <Sun v-if="isDark" class="h-5 w-5" aria-hidden="true" />
          <Moon v-else class="h-5 w-5" aria-hidden="true" />
        </button>
      </header>

      <section class="stc-card p-5 sm:p-6 space-y-5">
        <AddressSearch
          v-model="address"
          :loading="loading"
          :has-results="!!result || !!error"
          @submit="runLookup"
          @reset="reset"
        />

        <div v-if="canShowMap" class="-mt-1">
          <button
            type="button"
            @click="showMap = !showMap"
            class="stc-btn-ghost !px-2 !py-1 text-sm"
            :aria-expanded="showMap"
          >
            <MapIcon class="h-4 w-4" aria-hidden="true" />
            <span>{{ showMap ? 'Hide map' : 'Or pick a location on the map' }}</span>
            <ChevronDown
              class="h-4 w-4 transition-transform"
              :class="{ 'rotate-180': showMap }"
              aria-hidden="true"
            />
          </button>
          <div v-if="showMap" class="mt-3">
            <MapPicker @pick="onMapPick" />
          </div>
        </div>
      </section>

      <div class="mt-6">
        <LoadingSpinner v-if="loading" />
        <ErrorMessage
          v-else-if="error"
          :message="error.message"
          :hint="error.hint"
        />
        <ResultsDisplay v-else-if="result" :result="result" />
      </div>

      <footer class="mt-10 text-xs text-slate-500 dark:text-slate-500 text-center">
        Data from
        <a
          href="https://openstates.org"
          target="_blank"
          rel="noopener noreferrer"
          class="underline hover:text-brand-700 dark:hover:text-brand-400"
          >OpenStates</a
        >
        and the
        <a
          href="https://data.cityofchicago.org"
          target="_blank"
          rel="noopener noreferrer"
          class="underline hover:text-brand-700 dark:hover:text-brand-400"
          >Chicago Data Portal</a
        >. No cookies, no tracking, no data stored.
      </footer>
    </div>
  </div>
</template>

<style scoped>
.stc-root {
  /* Self-contained sizing so the component works in an iframe. The parent
     iframe sets its own height; this just ensures we fill whatever we're given. */
  min-height: 100%;
}
</style>
