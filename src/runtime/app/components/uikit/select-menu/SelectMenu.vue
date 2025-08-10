<script setup lang="ts">
import { Check, ChevronsUpDown, Search } from "lucide-vue-next"
import { ref, computed } from "vue"
import { cn } from "#smile/internal"
import { Button } from "#smile:app/components/uikit/button"
import { Combobox, ComboboxAnchor, ComboboxEmpty, ComboboxGroup, ComboboxInput, ComboboxItem, ComboboxItemIndicator, ComboboxList, ComboboxTrigger } from "#smile:app/components/uikit/combobox"

type SelectMenuItem = {
  value: string;
  label: string;
}
interface SelectMenuProps {
  placeholder: string;
  items: SelectMenuItem[];
  value: string;
}

const {
  placeholder, items, value,
} = defineProps<SelectMenuProps>();

const currentValue = ref<typeof items[0]>();
</script>

<template>
  <Combobox v-model="value" by="label">
    <ComboboxAnchor as-child>
      <ComboboxTrigger as-child>
        <Button variant="outline" class="justify-between">
          {{ currentValue?.label ?? placeholder }}

          <ChevronsUpDown class="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </ComboboxTrigger>
    </ComboboxAnchor>

    <ComboboxList>
      <div class="relative w-full max-w-sm items-center">
        <ComboboxInput class="pl-9 focus-visible:ring-0 border-0 border-b rounded-none h-10"
          placeholder="Select framework..." />
        <span class="absolute start-0 inset-y-0 flex items-center justify-center px-3">
          <Search class="size-4 text-muted-foreground" />
        </span>
      </div>

      <ComboboxEmpty>
        No framework found.
      </ComboboxEmpty>

      <ComboboxGroup>
        <ComboboxItem v-for="item in items" :key="item.value" :value="item">
          {{ item.label }}

          <ComboboxItemIndicator>
            <Check :class="cn('ml-auto h-4 w-4')" />
          </ComboboxItemIndicator>
        </ComboboxItem>
      </ComboboxGroup>
    </ComboboxList>
  </Combobox>
</template>
