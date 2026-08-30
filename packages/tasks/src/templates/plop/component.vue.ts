export default `<script setup lang="ts">
defineProps<{
  title: string
}>()
</script>

<template>
  <section class="{{kebabCase name}}">
    <h2>{{ title }}</h2>
  </section>
</template>
`;
