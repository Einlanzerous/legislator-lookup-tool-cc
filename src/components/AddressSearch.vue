<script setup lang="ts">
import { ref, watch } from 'vue'
import { Search, X } from 'lucide-vue-next'

const props = defineProps<{
  modelValue: string
  loading?: boolean
  hasResults?: boolean
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', v: string): void
  (e: 'submit'): void
  (e: 'reset'): void
}>()

const local = ref(props.modelValue)

watch(
  () => props.modelValue,
  (v) => {
    local.value = v
  }
)

function onInput(e: Event) {
  const v = (e.target as HTMLInputElement).value
  local.value = v
  emit('update:modelValue', v)
}

function onSubmit(e: Event) {
  e.preventDefault()
  emit('submit')
}
</script>

<template>
  <form @submit="onSubmit" class="w-full">
    <label for="stc-address" class="sr-only">Street address</label>
    <div class="relative">
      <Search
        class="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400"
        aria-hidden="true"
      />
      <input
        id="stc-address"
        type="text"
        :value="local"
        @input="onInput"
        :disabled="loading"
        autocomplete="street-address"
        inputmode="text"
        placeholder="e.g. 121 N LaSalle St"
        class="stc-input pl-11 pr-28 py-4 text-base sm:text-lg"
      />
      <div class="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
        <button
          v-if="hasResults || local"
          type="button"
          @click="emit('reset')"
          class="stc-btn-ghost !px-2 !py-2"
          aria-label="Clear address and reset"
        >
          <X class="h-4 w-4" aria-hidden="true" />
        </button>
        <button
          type="submit"
          :disabled="loading || !local.trim()"
          class="stc-btn-primary"
        >
          <span v-if="!loading">Look up</span>
          <span v-else>Searching…</span>
        </button>
      </div>
    </div>
    <p class="mt-2 text-xs text-slate-500 pl-1">
      Chicago addresses only — you don't need to add the city or state.
    </p>
  </form>
</template>
