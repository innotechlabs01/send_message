import { describe, expect, it } from 'vitest'
import { getPaymentStatusCopy } from './payment-status'

describe('getPaymentStatusCopy', () => {
  it('returns success copy for SUCCESS status', () => {
    const copy = getPaymentStatusCopy('SUCCESS')
    expect(copy.state).toBe('success')
    expect(copy.title).toBeTruthy()
    expect(copy.message).toBeTruthy()
    expect(copy.errorCode).toBeUndefined()
  })

  it('matches status case-insensitively', () => {
    expect(getPaymentStatusCopy('success').state).toBe('success')
    expect(getPaymentStatusCopy('Pending').state).toBe('pending')
    expect(getPaymentStatusCopy('failed').state).toBe('failure')
  })

  it('returns pending for pending-ish states', () => {
    expect(getPaymentStatusCopy('PENDING').state).toBe('pending')
    expect(getPaymentStatusCopy('PROCESSING').state).toBe('pending')
    expect(getPaymentStatusCopy('IN_PROGRESS').state).toBe('pending')
  })

  it('returns failure for known failure states', () => {
    const failureStates = [
      'FAILED',
      'ERROR',
      'CANCELLED',
      'DECLINED',
      'EXPIRED',
      'VOIDED',
      'ABANDONED',
      'REJECTED',
    ]
    for (const status of failureStates) {
      expect(getPaymentStatusCopy(status).state).toBe('failure')
    }
  })

  it('returns failure with errorCode when error is provided, even on success status', () => {
    const copy = getPaymentStatusCopy('SUCCESS', 'network_error')
    expect(copy.state).toBe('failure')
    expect(copy.errorCode).toBe('network_error')
  })

  it('returns pending (safe default) for unknown or empty status', () => {
    expect(getPaymentStatusCopy('UNKNOWN_STATUS').state).toBe('pending')
    expect(getPaymentStatusCopy('').state).toBe('pending')
  })
})