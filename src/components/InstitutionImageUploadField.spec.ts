import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import InstitutionImageUploadField from './InstitutionImageUploadField.vue'
import { token } from '../auth'

type MockImageDimensions = { width: number; height: number }

let imageDimensions: MockImageDimensions = { width: 100, height: 100 }

class MockImage {
  naturalWidth = imageDimensions.width
  naturalHeight = imageDimensions.height
  onload: (() => void) | null = null
  onerror: (() => void) | null = null

  set src(_value: string) {
    queueMicrotask(() => this.onload?.())
  }
}

function response(body: unknown, ok = true, status = 200) {
  return {
    ok,
    status,
    json: vi.fn().mockResolvedValue(body),
  }
}

function fileWithSize(name: string, size: number, type = 'image/png') {
  const file = new File(['image'], name, { type })
  Object.defineProperty(file, 'size', { value: size })
  return file
}

async function selectFile(wrapper: ReturnType<typeof mount>, file: File) {
  const input = wrapper.get('[data-testid="image-input"]')
  Object.defineProperty(input.element, 'files', { configurable: true, value: [file] })
  await input.trigger('change')
}

describe('InstitutionImageUploadField', () => {
  let fetchMock: ReturnType<typeof vi.fn>

  beforeEach(() => {
    token.value = 'test-token'
    imageDimensions = { width: 100, height: 100 }
    fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    vi.stubGlobal('Image', MockImage)
    vi.stubGlobal('URL', {
      createObjectURL: vi.fn().mockReturnValue('blob:test-image'),
      revokeObjectURL: vi.fn(),
    })
  })

  it('uploads the image, updates the institution, and emits the returned URL', async () => {
    const imageUrl = 'https://cdn.hemocione.com.br/logo.png'
    fetchMock
      .mockResolvedValueOnce(response({ url: imageUrl }))
      .mockResolvedValueOnce(response({ success: true }))

    const wrapper = mount(InstitutionImageUploadField, {
      props: { institutionId: 'institution-1', kind: 'logo' },
    })
    const file = fileWithSize('logo.png', 1000)

    await selectFile(wrapper, file)
    await flushPromises()

    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      'https://coleta.test/api/v1/me/institutions/logo',
      expect.objectContaining({
        method: 'POST',
        headers: { Authorization: 'Bearer test-token' },
      })
    )

    const uploadOptions = fetchMock.mock.calls[0][1] as RequestInit
    expect((uploadOptions.body as FormData).get('image')).toBe(file)
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      'https://id-api.test/institutions/institution-1',
      {
        method: 'PATCH',
        headers: {
          Authorization: 'Bearer test-token',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ logo: imageUrl }),
      }
    )
    expect(wrapper.emitted('update:modelValue')).toEqual([[imageUrl]])
  })

  it('shows the upload error and does not patch the institution when upload fails', async () => {
    fetchMock.mockResolvedValueOnce(response({ statusMessage: 'Imagem inválida' }, false, 400))

    const wrapper = mount(InstitutionImageUploadField, {
      props: { institutionId: 'institution-1', kind: 'banner' },
    })

    await selectFile(wrapper, fileWithSize('banner.png', 1000))
    await flushPromises()

    expect(wrapper.get('[data-testid="error-message"]').text()).toContain('Imagem inválida')
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(wrapper.emitted('update:modelValue')).toBeUndefined()
  })

  it.each([
    ['logo', 2 * 1024 * 1024 + 1, '2 MB'],
    ['banner', 4 * 1024 * 1024 + 1, '4 MB'],
  ] as const)('rejects a %s file above the client-side limit', async (kind, size, limit) => {
    const wrapper = mount(InstitutionImageUploadField, {
      props: { institutionId: 'institution-1', kind },
    })

    await selectFile(wrapper, fileWithSize(`${kind}.png`, size))
    await flushPromises()

    expect(wrapper.get('[data-testid="error-message"]').text()).toContain(limit)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('rejects a non-square logo before uploading it', async () => {
    imageDimensions = { width: 100, height: 80 }
    const wrapper = mount(InstitutionImageUploadField, {
      props: { institutionId: 'institution-1', kind: 'logo' },
    })

    await selectFile(wrapper, fileWithSize('logo.png', 1000))
    await flushPromises()

    expect(wrapper.get('[data-testid="error-message"]').text()).toContain('quadrada')
    expect(fetchMock).not.toHaveBeenCalled()
  })
})
