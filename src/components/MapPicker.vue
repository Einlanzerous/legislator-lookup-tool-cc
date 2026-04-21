<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, shallowRef } from 'vue'
import L from 'leaflet'
import { MapPinned } from 'lucide-vue-next'
import { reverseGeocode } from '../services/geocoding'

const emit = defineEmits<{
  (e: 'pick', address: string): void
}>()

// Chicago centroid + a generous bounding box covering the city + near suburbs.
const CHICAGO_CENTER: L.LatLngTuple = [41.8781, -87.6298]
const CHICAGO_BOUNDS: L.LatLngBoundsLiteral = [
  [41.6445, -87.9401],
  [42.023, -87.5237]
]

const mapsKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY

const mapEl = ref<HTMLDivElement | null>(null)
const map = shallowRef<L.Map | null>(null)
const marker = shallowRef<L.Marker | null>(null)

const status = ref<'idle' | 'locating' | 'error' | 'outside'>('idle')
const pickedAddress = ref<string | null>(null)

onMounted(() => {
  if (!mapEl.value) return

  const instance = L.map(mapEl.value, {
    center: CHICAGO_CENTER,
    zoom: 12,
    maxBounds: L.latLngBounds(CHICAGO_BOUNDS).pad(0.25),
    maxBoundsViscosity: 0.7,
    zoomControl: true,
    attributionControl: true
  })

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
  }).addTo(instance)

  const m = L.marker(CHICAGO_CENTER, {
    draggable: true,
    autoPan: true,
    title: 'Drag to pick an address'
  }).addTo(instance)

  m.on('dragend', () => handlePick(m.getLatLng()))
  instance.on('click', (ev) => {
    m.setLatLng(ev.latlng)
    handlePick(ev.latlng)
  })

  map.value = instance
  marker.value = m
})

onBeforeUnmount(() => {
  map.value?.remove()
  map.value = null
  marker.value = null
})

let lastReq: AbortController | null = null

async function handlePick(latlng: L.LatLng) {
  lastReq?.abort()
  lastReq = new AbortController()
  status.value = 'locating'
  try {
    const result = await reverseGeocode(
      latlng.lat,
      latlng.lng,
      mapsKey,
      lastReq.signal
    )
    if (!result) {
      status.value = 'error'
      return
    }
    if (!result.isChicago) {
      status.value = 'outside'
      pickedAddress.value = result.formattedAddress
      return
    }
    status.value = 'idle'
    pickedAddress.value = result.streetAddress
    emit('pick', result.streetAddress)
  } catch (err) {
    if ((err as Error).name === 'AbortError') return
    status.value = 'error'
  }
}
</script>

<template>
  <div class="space-y-3">
    <div
      ref="mapEl"
      class="h-72 sm:h-80 w-full rounded-xl ring-1 ring-slate-200 bg-slate-100"
      role="application"
      aria-label="Map of Chicago. Drag the pin or tap to pick an address."
    />
    <div class="flex items-start gap-2 text-xs text-slate-600">
      <MapPinned class="h-4 w-4 mt-0.5 text-brand-600 flex-shrink-0" aria-hidden="true" />
      <p v-if="status === 'idle' && !pickedAddress">
        Drag the pin or tap the map to select an address within Chicago.
      </p>
      <p v-else-if="status === 'locating'">Finding the address for that spot…</p>
      <p v-else-if="status === 'outside'" class="text-alert-700">
        That pin is outside Chicago city limits. Try moving it within the city.
      </p>
      <p v-else-if="status === 'error'" class="text-alert-700">
        Couldn't reverse geocode that location. Try another spot.
      </p>
      <p v-else-if="pickedAddress" class="text-slate-700">
        Picked: <span class="font-medium text-slate-900">{{ pickedAddress }}</span>
      </p>
    </div>
  </div>
</template>
