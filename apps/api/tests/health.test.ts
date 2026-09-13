import { describe, expect, it } from 'vitest'
import request from 'supertest'
import { createApp } from '../src/app'

describe('GET /health', () => {
  it('menjawab ok', async () => {
    const res = await request(createApp()).get('/health')
    expect(res.status).toBe(200)
    expect(res.body).toEqual({ status: 'ok' })
  })
})

describe('rute tak dikenal', () => {
  it('menjawab 404 dengan bentuk error yang baku', async () => {
    const res = await request(createApp()).get('/tidak-ada')
    expect(res.status).toBe(404)
    expect(res.body.error.code).toBe('not_found')
  })
})
