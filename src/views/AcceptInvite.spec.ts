import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import AcceptInvite from './AcceptInvite.vue'
import { idApi } from '../api'
import * as auth from '../auth'

vi.mock('../api', () => ({
  idApi: { getInvite: vi.fn(), acceptInvite: vi.fn() },
}))

vi.mock('vue-router', async (importOriginal) => {
  const actual = await importOriginal<typeof import('vue-router')>()
  return { ...actual, useRoute: () => ({ params: { token: 'plain-token' } }) }
})

describe('AcceptInvite', () => {
  beforeEach(() => {
    vi.mocked(idApi.getInvite).mockReset()
    vi.mocked(idApi.acceptInvite).mockReset()
    vi.mocked(idApi.getInvite).mockResolvedValue({ targetType: 'institution', targetId: 'inst-1', role: 'staff' })
  })

  it('mostra o contexto do convite', async () => {
    vi.spyOn(auth, 'isAuthenticated').mockReturnValue(false)
    const wrapper = mount(AcceptInvite)
    await flushPromises()
    expect(wrapper.text()).toContain('staff')
  })

  it('mostra botões de login/cadastro quando não autenticado', async () => {
    vi.spyOn(auth, 'isAuthenticated').mockReturnValue(false)
    const wrapper = mount(AcceptInvite)
    await flushPromises()
    expect(wrapper.find('[data-testid="invite-login-link"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="invite-signup-link"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="invite-accept-button"]').exists()).toBe(false)
  })

  it('mostra botão de aceitar quando já autenticado', async () => {
    vi.spyOn(auth, 'isAuthenticated').mockReturnValue(true)
    const wrapper = mount(AcceptInvite)
    await flushPromises()
    expect(wrapper.find('[data-testid="invite-accept-button"]').exists()).toBe(true)
  })

  it('chama acceptInvite ao clicar em aceitar', async () => {
    vi.spyOn(auth, 'isAuthenticated').mockReturnValue(true)
    vi.mocked(idApi.acceptInvite).mockResolvedValue({ targetType: 'institution', targetId: 'inst-1' })
    const wrapper = mount(AcceptInvite)
    await flushPromises()

    await wrapper.get('[data-testid="invite-accept-button"]').trigger('click')
    await flushPromises()

    expect(idApi.acceptInvite).toHaveBeenCalledWith('plain-token')
  })

  it('404: mostra mensagem de convite inválido', async () => {
    vi.mocked(idApi.getInvite).mockRejectedValue(new Error('not found'))
    const wrapper = mount(AcceptInvite)
    await flushPromises()
    expect(wrapper.find('[data-testid="invite-error"]').exists()).toBe(true)
  })
})
