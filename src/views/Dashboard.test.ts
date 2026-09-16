import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import Dashboard from './Dashboard.vue'
import { institutions } from '../institution'

vi.mock('../api', () => ({
  idApi: { myInstitutions: vi.fn(() => Promise.resolve([])), listInterestCampaigns: vi.fn() },
  coletaApi: { listCollectionRequests: vi.fn() },
}))

describe('Dashboard — CTA de cadastro quando não há instituição', () => {
  beforeEach(() => {
    institutions.value = []
  })

  it('mostra um link para /instituicoes/nova no estado vazio', async () => {
    const wrapper = mount(Dashboard, {
      global: { stubs: { RouterLink: { template: '<a><slot /></a>', props: ['to'] } } },
    })
    await new Promise((resolve) => setTimeout(resolve, 0))
    await wrapper.vm.$nextTick()

    expect(wrapper.html()).toContain('Cadastrar minha instituição')
  })
})
