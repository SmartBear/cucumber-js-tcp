import dotenv from 'dotenv'
import fg from 'fast-glob'
import fs from 'fs'
import { promisify } from 'util'

import { convertToRerun } from '../src/convertToRerun'
import { Fetch } from '../src/Fetch.js'
import { TcpResponse } from '../src/TcpResponse.js'
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import { makeFetch } from '../utils/makeFetch.cjs'

const writeFile = promisify(fs.writeFile)
const readFile = promisify(fs.readFile)

dotenv.config()

const query = `
query GetOrderedTests($organizationId: UUID!) {
  organization: organizationById(id: $organizationId) {
    tests: testsByOrganizationId(orderBy: [FAILURE_FREQUENCY_DESC, PATH_ASC]) {
      nodes {
        failureFrequency
        path
      }
    }
  }
}
`

async function main() {
  const fetch = (await makeFetch()) as Fetch
  const variables = { organizationId: process.env.ONE_REPORT_ORGANIZATION }
  const res = await fetch('http://127.0.0.1:8080/api/postgraphile/graphql', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.ONE_REPORT_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query, variables }),
  })

  if (!res.ok) {
    throw new Error(`${res.status} ${res.statusText}`)
  }
  const body: { data: TcpResponse } = await res.json()

  const gherkinPaths = await fg(['features/**/*.feature'])
  const gherkinSources = await Promise.all(gherkinPaths.map((path) => readFile(path, 'utf8')))

  const parsedPaths = convertToRerun(body.data, gherkinSources)

  const fileLocation = '@rerun.txt'
  await writeFile(fileLocation, parsedPaths.join('\n'))
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
