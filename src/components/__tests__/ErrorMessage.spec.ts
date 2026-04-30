import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import ErrorMessage from '../ErrorMessage.vue'

describe('ErrorMessage.vue', () => {
  it('renders the message correctly', () => {
    const wrapper = mount(ErrorMessage, {
      props: {
        message: 'Invalid address provided'
      }
    })
    
    expect(wrapper.text()).toContain('Invalid address provided')
    // Hint should not be rendered if not provided
    expect(wrapper.findAll('p').length).toBe(1)
  })

  it('renders the hint when provided', () => {
    const wrapper = mount(ErrorMessage, {
      props: {
        message: 'Search failed',
        hint: 'Please try again later'
      }
    })
    
    expect(wrapper.text()).toContain('Search failed')
    expect(wrapper.text()).toContain('Please try again later')
    expect(wrapper.findAll('p').length).toBe(2)
  })
})
