<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { activeInstitution, activeInstitutionId, institutions, setActiveInstitution } from '../institution'
import InstitutionKindIcon from './InstitutionKindIcon.vue'

const props = withDefaults(
  defineProps<{
    collapsed?: boolean
  }>(),
  { collapsed: false }
)

const switcherRoot = ref<HTMLElement | null>(null)
const menuOpen = ref(false)
const menuPosition = ref({ top: 0, left: 0 })
const currentInstitution = computed(() => activeInstitution())
const canSwitchInstitution = computed(() => institutions.value.length > 1)

watch(
  () => props.collapsed,
  (value) => {
    if (value) menuOpen.value = false
  }
)

function toggleMenu() {
  if (!canSwitchInstitution.value) return
  menuOpen.value = !menuOpen.value
  if (menuOpen.value) {
    nextTick(positionMenu)
  }
}

function selectInstitution(id: string) {
  setActiveInstitution(id)
  menuOpen.value = false
}

function closeMenu(event: MouseEvent) {
  if (!switcherRoot.value?.contains(event.target as Node)) {
    menuOpen.value = false
  }
}

function positionMenu() {
  const trigger = switcherRoot.value?.querySelector('.org-trigger')
  if (!(trigger instanceof HTMLElement)) return

  const rect = trigger.getBoundingClientRect()
  const menuWidth = 220
  const horizontalPadding = 8
  const maxLeft = Math.max(horizontalPadding, window.innerWidth - menuWidth - horizontalPadding)
  menuPosition.value = {
    top: rect.bottom + 8,
    left: Math.min(Math.max(rect.left, horizontalPadding), maxLeft),
  }
}

onMounted(() => {
  document.addEventListener('click', closeMenu)
  window.addEventListener('resize', positionMenu)
})
onUnmounted(() => {
  document.removeEventListener('click', closeMenu)
  window.removeEventListener('resize', positionMenu)
})
</script>

<template>
  <div
    ref="switcherRoot"
    class="org-switcher"
    :class="{ 'org-switcher--collapsed': props.collapsed }"
    data-testid="org-switcher"
    @click.stop
  >
    <button
      v-if="currentInstitution && canSwitchInstitution"
      type="button"
      class="org-trigger"
      data-testid="org-switcher-trigger"
      :aria-label="`Instituição ativa: ${currentInstitution.name}. Trocar instituição`"
      aria-haspopup="listbox"
      :aria-expanded="menuOpen"
      :title="props.collapsed ? currentInstitution.name : undefined"
      @click="toggleMenu"
    >
      <span class="org-avatar" aria-hidden="true">
        <img
          v-if="currentInstitution.logo"
          :src="currentInstitution.logo"
          :alt="`Logo de ${currentInstitution.name}`"
          data-testid="active-institution-logo"
        />
        <InstitutionKindIcon v-else :kind="currentInstitution.kind" />
      </span>
      <span v-if="!props.collapsed" class="org-name" data-testid="active-institution-name">
        {{ currentInstitution.name }}
      </span>
      <svg
        v-if="canSwitchInstitution"
        class="org-switcher-chevron"
        data-testid="org-switcher-chevron"
        viewBox="0 0 24 24"
        fill="none"
        aria-hidden="true"
      >
        <path d="m6 9 6 6 6-6" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" />
      </svg>
    </button>

    <div v-else-if="currentInstitution" class="org-static" :title="currentInstitution.name">
      <span class="org-avatar" aria-hidden="true">
        <img
          v-if="currentInstitution.logo"
          :src="currentInstitution.logo"
          :alt="`Logo de ${currentInstitution.name}`"
          data-testid="active-institution-logo"
        />
        <InstitutionKindIcon v-else :kind="currentInstitution.kind" />
      </span>
      <span v-if="!props.collapsed" class="org-name" data-testid="active-institution-name">
        {{ currentInstitution.name }}
      </span>
    </div>

    <span v-else class="org-empty" title="Nenhuma instituição selecionada">
      <span class="org-avatar org-avatar--empty" aria-hidden="true">
        <svg viewBox="0 0 24 24" fill="none">
          <path d="M12 21s-6-4.35-6-9.5a6 6 0 0 1 12 0C18 16.65 12 21 12 21Z" fill="currentColor" />
        </svg>
      </span>
      <span v-if="!props.collapsed" class="org-name">Nenhuma instituição</span>
    </span>

    <Teleport to="body">
      <div
        v-if="canSwitchInstitution && menuOpen"
        class="org-menu"
        role="listbox"
        aria-label="Instituições disponíveis"
        :style="{ top: `${menuPosition.top}px`, left: `${menuPosition.left}px` }"
      >
        <button
          v-for="institution in institutions"
          :key="institution.id"
          type="button"
          class="org-option"
          :data-testid="`institution-option-${institution.id}`"
          role="option"
          :aria-selected="institution.id === activeInstitutionId"
          @click="selectInstitution(institution.id)"
        >
          <span class="org-avatar" aria-hidden="true">
            <img
              v-if="institution.logo"
              :src="institution.logo"
              :alt="`Logo de ${institution.name}`"
            />
            <InstitutionKindIcon v-else :kind="institution.kind" />
          </span>
          <span class="org-option-name">{{ institution.name }}</span>
          <svg v-if="institution.id === activeInstitutionId" class="org-option-check" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="m5 12 4 4L19 6" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" />
          </svg>
        </button>
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
.org-switcher {
  position: relative;
  min-width: 0;
  width: 100%;
}
.org-trigger,
.org-static,
.org-empty {
  display: flex;
  align-items: center;
  width: 100%;
  min-width: 0;
  min-height: 40px;
  gap: var(--hemo-space-2);
  padding: 5px 6px;
  border-radius: var(--hemo-radius);
}
.org-trigger {
  border: 1px solid transparent;
  background: transparent;
  color: var(--hemo-color-black-100);
  text-align: left;
  cursor: pointer;
  transition: background-color 0.15s ease, border-color 0.15s ease;
}
.org-trigger:hover,
.org-trigger:focus-visible {
  border-color: var(--hemo-color-black-15);
  background: var(--hemo-color-black-5);
}
.org-static,
.org-empty {
  color: var(--hemo-color-black-100);
}
.org-avatar {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  flex: 0 0 auto;
  overflow: hidden;
  border: 1px solid rgba(187, 10, 8, 0.14);
  border-radius: var(--hemo-radius-sm);
  background: rgba(187, 10, 8, 0.08);
  color: var(--hemo-color-primary);
}
.org-avatar img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.org-avatar :deep(.institution-kind-icon) {
  width: 20px;
  height: 20px;
}
.org-avatar--empty svg {
  width: 18px;
  height: 18px;
}
.org-name {
  min-width: 0;
  overflow: hidden;
  color: var(--hemo-color-black-100);
  font-size: 13px;
  font-weight: 600;
  line-height: 1.25;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.org-switcher-chevron {
  width: 17px;
  height: 17px;
  flex: 0 0 auto;
  margin-left: auto;
  color: var(--hemo-color-black-60);
}
.org-switcher--collapsed .org-trigger,
.org-switcher--collapsed .org-static,
.org-switcher--collapsed .org-empty {
  justify-content: center;
  padding-inline: 0;
}
.org-switcher--collapsed .org-switcher-chevron {
  display: none;
}
.org-menu {
  position: fixed;
  z-index: 30;
  width: max-content;
  min-width: 220px;
  max-width: 250px;
  padding: var(--hemo-space-1);
  border: 1px solid var(--hemo-color-black-15);
  border-radius: var(--hemo-radius);
  background: var(--hemo-color-white);
  box-shadow: var(--hemo-shadow-card-hover);
}
.org-option {
  display: flex;
  align-items: center;
  width: 100%;
  min-width: 0;
  gap: var(--hemo-space-2);
  padding: var(--hemo-space-2);
  border: 0;
  border-radius: var(--hemo-radius-sm);
  background: transparent;
  color: var(--hemo-color-black-100);
  text-align: left;
  cursor: pointer;
}
.org-option:hover,
.org-option[aria-selected='true'] {
  background: var(--hemo-color-black-5);
}
.org-option .org-avatar {
  width: 28px;
  height: 28px;
}
.org-option-name {
  min-width: 0;
  overflow: hidden;
  font-size: 13px;
  font-weight: 600;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.org-option-check {
  width: 17px;
  height: 17px;
  flex: 0 0 auto;
  margin-left: auto;
  color: var(--hemo-color-primary);
}

@media (max-width: 768px) {
  .org-menu {
    max-width: min(250px, calc(100vw - var(--hemo-space-6)));
  }
}
</style>
