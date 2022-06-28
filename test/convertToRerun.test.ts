import assert from 'assert'

import { convertToRerun } from '../src/convertToRerun.js'
import { TcpResponse } from '../src/TcpResponse.js'

describe('convertToReRun', () => {
  it('convert a TCP response to rerun paths', () => {
    const tcpResponse: TcpResponse = {
      organization: {
        tests: {
          nodes: [
            {
              path: 'features/foo.feature/foo3',
              failureFrequency: 0.9,
            },
            {
              path: 'features/foo.feature/foo1',
              failureFrequency: 0.8,
            },
            {
              path: 'features/bar.feature/bar1',
              failureFrequency: 0.7,
            },
            {
              path: 'features/foo.feature/foo2',
              failureFrequency: 0.6,
            },
          ],
        },
      },
    }

    const foo = `Feature: foo
Scenario: foo1
Scenario: foo2
Scenario: foo3
`

    const bar = `Feature: bar
Scenario: bar1
`
    const rerun = convertToRerun(tcpResponse, [foo, bar])

    const expected = [
      'features/foo.feature:4',
      'features/foo.feature:2',
      'features/bar.feature:2',
      'features/foo.feature:3',
    ]
    assert.deepStrictEqual(rerun, expected)
  })
})
