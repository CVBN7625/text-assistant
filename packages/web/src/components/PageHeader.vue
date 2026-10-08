<template>
  <header class="ctp-page-header" :class="`ctp-page-header--${decor}`">
    <div class="ctp-page-header__copy">
      <h1>{{ title }}</h1>
    </div>
    <div v-if="$slots.meta || $slots.actions" class="ctp-page-header__aside">
      <div v-if="$slots.meta" class="ctp-page-header__meta">
        <slot name="meta" />
      </div>
      <div v-if="$slots.actions" class="ctp-page-header__actions">
        <slot name="actions" />
      </div>
    </div>
  </header>
</template>

<script setup lang="ts">
withDefaults(
  defineProps<{
    title: string;
    decor?: 'none' | 'paint' | 'settings';
  }>(),
  {
    decor: 'paint'
  }
);
</script>
