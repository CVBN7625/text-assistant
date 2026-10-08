<template>
  <div class="ctp-empty-state" :class="`ctp-empty-state--${variant}`">
    <div class="ctp-empty-state__art" aria-hidden="true"></div>
    <div class="ctp-empty-state__copy">
      <h2>{{ title }}</h2>
      <p>{{ description }}</p>
      <div v-if="$slots.action" class="ctp-empty-state__action">
        <slot name="action" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
withDefaults(
  defineProps<{
    variant?: 'plain' | 'history' | 'specimen' | 'technical';
    title: string;
    description: string;
  }>(),
  {
    variant: 'plain'
  }
);
</script>
