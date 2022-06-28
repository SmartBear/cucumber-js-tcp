import { walkGherkinDocument } from '@cucumber/gherkin-utils'
import { GherkinDocument } from '@cucumber/messages'

import { parseGherkinDocument } from '../src/parseGherkinDocument.js'
import { TcpResponse } from '../src/TcpResponse.js'

export function convertToRerun(
  tcpResponse: TcpResponse,
  gherkinSources: readonly string[]
): readonly string[] {
  let lineNumberByName: Record<string, number> = {}
  const parseResults = gherkinSources.map(parseGherkinDocument)
  for (const { gherkinDocument } of parseResults) {
    if (gherkinDocument) {
      lineNumberByName = buildLineNumberByName(gherkinDocument, lineNumberByName)
    }
  }

  const rerun = []
  for (const { path } of tcpResponse.organization.tests.nodes) {
    const segments = path.split('/')
    const scenarioName = segments[segments.length - 1]
    const lineNumber = lineNumberByName[scenarioName]
    if (lineNumber) {
      rerun.push(`${segments.slice(0, segments.length - 1).join('/')}:${lineNumber}`)
    }
  }

  return rerun
}

function buildLineNumberByName(
  gherkinDocument: GherkinDocument,
  lineNumberByName: Record<string, number>
): Record<string, number> {
  return walkGherkinDocument(gherkinDocument, lineNumberByName, {
    scenario(scenario, lineNumberByName) {
      return { ...lineNumberByName, [scenario.name]: scenario.location.line }
    },
  })
}
