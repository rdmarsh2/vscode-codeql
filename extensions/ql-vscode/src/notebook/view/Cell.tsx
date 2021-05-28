import * as React from 'react';
import * as Rdom from 'react-dom';
import { ActivationFunction, CellInfo } from 'vscode-notebook-renderer';

export function Cell(props: any): JSX.Element {
  const results: { resultSet: any; queryWithResults: any } = JSON.parse(props.bqrs);
  return <><div>
    {results.resultSet.rows.map((rows: any, idx: number) => {
      return (<table key={idx}>
        <tr>
          <th>Label</th>
          {typeof rows[0] === 'object' ? Object.keys(rows[0]?.url).map((urlKey: string, urlKeyIdx: number) => {
            return (<th key={urlKeyIdx}>{urlKey}</th>);
          }) : null}
        </tr>
        {rows.map((row: Record<string, any>, index: number) => {
          if (typeof row === 'string') {
            return (<tr key={index}><td>{row}</td></tr>);
          }
          return (<tr key={index}>
            <td>{row.label}</td>
            {Object.keys(row.url).map((key: string) => {
              return (<td key={key}>{JSON.stringify(row.url[key])}</td>);
            })}
          </tr>
          );
        })}
      </table>);
    })}
  </div></>;
}

function renderOutput(cellInfo: CellInfo) {
  Rdom.render(
    <Cell bqrs={cellInfo.text()} />,
    cellInfo.element,
  );
  // TODO: how do we make this interactive?
}

export const activate: ActivationFunction = () => ({
  renderCell: (_id, cellInfo: CellInfo) => {
    renderOutput(cellInfo);
  }
});

console.log('in Cell.tsx...');
console.log(typeof activate);
