import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import Members from './Members.vue'
import { idApi } from '../api'
import { activeInstitutionId, institutions, setInstitutions } from '../institution'

vi.mock('../api', () => ({
  idApi: {
    myInstitutions: vi.fn(),
    getMembers: vi.fn(),
    listInvites: vi.fn(),
    inviteMember: vi.fn(),
    updateMemberRole: vi.fn(),
    removeMember: vi.fn(),
    revokeInvite: vi.fn(),
  },
}))

vi.mock('vue-router', async (importOriginal) => {
  const actual = await importOriginal<typeof import('vue-router')>()
  return {
    ...actual,
    useRoute: () => ({ params: { institutionId: 'inst-1' } }),
  }
})

describe('Members', () => {
  beforeEach(() => {
    localStorage.clear()
    institutions.value = []
    activeInstitutionId.value = null
    vi.mocked(idApi.myInstitutions).mockReset()
    vi.mocked(idApi.getMembers).mockReset()
    vi.mocked(idApi.listInvites).mockReset()
    vi.mocked(idApi.myInstitutions).mockResolvedValue([{ id: 'inst-1', name: 'Escola Um', role: 'admin' }])
    vi.mocked(idApi.getMembers).mockResolvedValue({
      members: [
        {
          id: 'role-1',
          userId: 'user-1',
          role: 'admin',
          user: { id: 'user-1', givenName: 'Ana', surName: 'Silva', email: 'ana@b.com' },
        },
      ],
    })
    vi.mocked(idApi.listInvites).mockResolvedValue({ invites: [] })
  })

  it('lista os membros e mostra o papel de cada um', async () => {
    setInstitutions([{ id: 'inst-1', name: 'Escola Um', role: 'admin' }])
    const wrapper = mount(Members)
    await flushPromises()

    expect(wrapper.text()).toContain('Ana')
    expect(wrapper.text()).toContain('admin')
  })

  it('envia convite ao submeter o formulário', async () => {
    vi.mocked(idApi.inviteMember).mockResolvedValue({ message: 'ok' })
    setInstitutions([{ id: 'inst-1', name: 'Escola Um', role: 'admin' }])
    const wrapper = mount(Members)
    await flushPromises()

    await wrapper.get('[data-testid="invite-email-input"]').setValue('novo@b.com')
    await wrapper.get('[data-testid="invite-role-select"]').setValue('staff')
    await wrapper.get('[data-testid="invite-form"]').trigger('submit.prevent')
    await flushPromises()

    expect(idApi.inviteMember).toHaveBeenCalledWith('inst-1', 'novo@b.com', 'staff')
  })

  it('mostra sempre a mesma mensagem de sucesso, nunca distingue o resultado do convite', async () => {
    vi.mocked(idApi.inviteMember).mockResolvedValue({ message: 'Convite processado com sucesso.' })
    setInstitutions([{ id: 'inst-1', name: 'Escola Um', role: 'admin' }])
    const wrapper = mount(Members)
    await flushPromises()

    await wrapper.get('[data-testid="invite-email-input"]').setValue('novo@b.com')
    await wrapper.get('[data-testid="invite-form"]').trigger('submit.prevent')
    await flushPromises()

    expect(wrapper.get('[data-testid="invite-feedback"]').text()).toBe('Convite processado com sucesso.')
  })

  it('confirma antes de remover um membro', async () => {
    vi.mocked(idApi.removeMember).mockResolvedValue({ message: 'ok' })
    setInstitutions([{ id: 'inst-1', name: 'Escola Um', role: 'admin' }])
    const wrapper = mount(Members)
    await flushPromises()

    await wrapper.get('[data-testid="remove-member-user-1"]').trigger('click')
    expect(wrapper.get('[data-testid="confirm-remove-user-1"]').exists()).toBe(true)

    await wrapper.get('[data-testid="confirm-remove-user-1"]').trigger('click')
    await flushPromises()

    expect(idApi.removeMember).toHaveBeenCalledWith('inst-1', 'user-1')
  })

  it('muda o papel de um membro', async () => {
    vi.mocked(idApi.updateMemberRole).mockResolvedValue({ message: 'ok', member: {} })
    setInstitutions([{ id: 'inst-1', name: 'Escola Um', role: 'admin' }])
    const wrapper = mount(Members)
    await flushPromises()

    await wrapper.get('[data-testid="role-select-user-1"]').setValue('staff')
    await flushPromises()

    expect(idApi.updateMemberRole).toHaveBeenCalledWith('inst-1', 'user-1', 'staff')
  })

  it('lista convites pendentes e revoga um deles', async () => {
    vi.mocked(idApi.listInvites).mockResolvedValue({
      invites: [
        {
          id: 'inv-1',
          invitedEmail: 'pendente@b.com',
          role: 'staff',
          expiresAt: '2026-09-19T00:00:00Z',
          createdAt: '2026-09-16T00:00:00Z',
        },
      ],
    })
    vi.mocked(idApi.revokeInvite).mockResolvedValue({ message: 'ok' })
    setInstitutions([{ id: 'inst-1', name: 'Escola Um', role: 'admin' }])
    const wrapper = mount(Members)
    await flushPromises()

    expect(wrapper.text()).toContain('pendente@b.com')

    await wrapper.get('[data-testid="revoke-invite-inv-1"]').trigger('click')
    await flushPromises()

    expect(idApi.revokeInvite).toHaveBeenCalledWith('inst-1', 'inv-1')
  })
})
