import fg from 'fast-glob'
import fs from 'fs'
import fetch from 'node-fetch'
import { promisify } from 'util'

import { convertToRerun } from '../convertToRerun'
import { TcpResponse } from '../TcpResponse.js'

const writeFile = promisify(fs.writeFile)
const readFile = promisify(fs.readFile)

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
  if (process.env.ONE_REPORT_ORGANIZATION === undefined) {
    throw new Error('ONE_REPORT_ORGANIZATION is not set')
  }
  if (process.env.ONE_REPORT_URL === undefined) {
    throw new Error('ONE_REPORT_URL is not set')
  }
  if (process.env.ONE_REPORT_TOKEN === undefined) {
    throw new Error('ONE_REPORT_TOKEN is not set')
  }

  const variables = { organizationId: process.env.ONE_REPORT_ORGANIZATION }
  const url = new URL('/api/postgraphile/graphql', process.env.ONE_REPORT_URL)
  const res = await fetch(url.href, {
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
  const body = (await res.json()) as { data: TcpResponse }

  const gherkinPaths = await fg(['features/**/*.feature'])
  const gherkinSources = await Promise.all(gherkinPaths.map((path) => readFile(path, 'utf8')))

  const parsedPaths = convertToRerun(body.data, gherkinSources)

  const fileLocation = '@rerun.txt'
  await writeFile(fileLocation, parsedPaths.join('\n'))
  console.log(
    `You can now run the tests in prioritized order with the following command:
    cucumber-js --order rerun @rerun.txt`
  )
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
