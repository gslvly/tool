<template>
  <div class="v-input">
    <el-input
      v-bind="$attrs"
      :class="{ 'error-input': error }"
      v-on="{ ...$listeners, input, focus, blur }"
      :value="value"
    ></el-input>
    <span class="error" v-if="error">{{ error }}</span>
  </div>
</template>

<script lang="ts" setup name="VInput">
const props = defineProps<{
  value: string
  error?: string
}>()

const emit = defineEmits<{
  (e: 'input', v: string): void
  (e: 'update:error', v: ''): void
  (e: 'focus'): void
  (e: 'blur'): void
}>()

const blur = () => {
  emit('blur')
}

const focus = () => {
  emit('update:error', '')
  emit('focus')
}

const input = (v: string) => {
  emit('input', v)
}
</script>

<style lang="scss">
.v-input {
  width: 100%;
  position: relative;
  display: flex;
  gap: 4px;

  .el-input {
    width: 100%;
    &.error-input .el-input__inner {
      border: 1px solid var(--error) !important;
    }
  }

  .error {
    position: absolute;
    color: var(--error);
    bottom: 0;
    left: 0;
    transform: translateY(100%);
  }
}
</style>
