import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import CreateInstitution from './CreateInstitution.vue'
import { idApi } from '../api'

vi.mock('../api', () => ({
  idApi: {
    createInstitution: vi.fn(),
    myInstitutions: vi.fn(() => Promise.resolve([{ id: 'inst-1', name: 'Empresa Exemplo', role: 'admin' }])),
  },
}))

const pushMock = vi.fn()
vi.mock('vue-router', () => ({
  useRouter: () => ({ push: pushMock }),
}))

function fillValidForm(wrapper: ReturnType<typeof mount>) {
  wrapper.find('#name').setValue('Empresa Exemplo')
  wrapper.find('#document').setValue('11222333000181')
  wrapper.find('#kind').setValue('company')
  wrapper.find('#address').setValue('Rua Teste, 123')
  wrapper.find('#phone').setValue('21999999999')
  wrapper.find('#city').setValue('Rio de Janeiro')
  wrapper.find('#state').setValue('RJ')
}

describe('CreateInstitution', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('mostra erro de validação quando o CNPJ não tem 14 dígitos', async () => {
    const wrapper = mount(CreateInstitution)
    fillValidForm(wrapper)
    wrapper.find('#document').setValue('123')

    await wrapper.find('form').trigger('submit.prevent')

    expect(wrapper.text()).toContain('CNPJ deve ter 14 dígitos')
    expect(idApi.createInstitution).not.toHaveBeenCalled()
  })

  it('mostra erro de validação quando o estado não tem 2 caracteres', async () => {
    const wrapper = mount(CreateInstitution)
    fillValidForm(wrapper)
    wrapper.find('#state').setValue('Rio')

    await wrapper.find('form').trigger('submit.prevent')

    expect(wrapper.text()).toContain('Estado deve ter 2 caracteres')
    expect(idApi.createInstitution).not.toHaveBeenCalled()
  })

  it('envia o payload correto e navega para o dashboard em caso de sucesso', async () => {
    vi.mocked(idApi.createInstitution).mockResolvedValue({
      message: 'ok',
      institution: { id: 'inst-1', name: 'Empresa Exemplo' },
    })

    const wrapper = mount(CreateInstitution)
    fillValidForm(wrapper)

    await wrapper.find('form').trigger('submit.prevent')
    await flushPromises()

    expect(idApi.createInstitution).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Empresa Exemplo',
        document: '11222333000181',
        kind: 'company',
        address: 'Rua Teste, 123',
        phone: '21999999999',
        city: 'Rio de Janeiro',
        state: 'RJ',
        createdVia: 'self_service_instituicoes',
        website: '',
      })
    )
    expect(pushMock).toHaveBeenCalledWith('/')
  })

  it('mostra a mensagem de erro da API quando o cadastro falha', async () => {
    vi.mocked(idApi.createInstitution).mockRejectedValue(new Error('CNPJ inválido'))

    const wrapper = mount(CreateInstitution)
    fillValidForm(wrapper)

    await wrapper.find('form').trigger('submit.prevent')
    await flushPromises()

    expect(wrapper.text()).toContain('CNPJ inválido')
  })

  it('inclui um campo honeypot invisível chamado website', () => {
    const wrapper = mount(CreateInstitution)
    const honeypot = wrapper.find('input[name="website"]')

    expect(honeypot.exists()).toBe(true)
    expect(honeypot.attributes('aria-hidden')).toBe('true')
    expect(honeypot.attributes('tabindex')).toBe('-1')
  })
})

function flushPromises() {
  return new Promise((resolve) => setTimeout(resolve, 0))
}
