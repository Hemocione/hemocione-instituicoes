import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import InstitutionKindIcon from './InstitutionKindIcon.vue'

const expectedPaths = {
  school: 'M14 21v-3a2 2 0 0 0-4 0v3',
  university: 'M21.42 10.922a1 1 0 0 0-.019-1.838L12.83 5.18a2 2 0 0 0-1.66 0L2.6 9.08a1 1 0 0 0 0 1.832l8.57 3.908a2 2 0 0 0 1.66 0z',
  company: 'M10 12h4',
} as const

describe('InstitutionKindIcon', () => {
  it.each(Object.entries(expectedPaths))('renders the Lucide path for %s', (kind, expectedPath) => {
    const wrapper = mount(InstitutionKindIcon, { props: { kind: kind as 'school' | 'university' | 'company' } })

    expect(wrapper.get('svg').find(`path[d="${expectedPath}"]`).exists()).toBe(true)
  })

  it('renders no icon when the institution kind is absent', () => {
    const wrapper = mount(InstitutionKindIcon)

    expect(wrapper.find('svg').exists()).toBe(false)
  })
})
