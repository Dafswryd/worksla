import request from 'supertest'
import type express from 'express'

export type Agent = ReturnType<typeof request.agent>

/** Returns a supertest agent that carries the session cookie. */
export async function loginAs(app: express.Express, email: string, password: string): Promise<Agent> {
  const agent = request.agent(app)
  const res = await agent.post('/auth/login').send({ email, password })
  if (res.status !== 200) throw new Error(`Login failed for ${email}: ${JSON.stringify(res.body)}`)
  return agent
}
