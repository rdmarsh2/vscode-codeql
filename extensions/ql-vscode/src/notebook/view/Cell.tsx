import * as React from 'react';
import * as Rdom from 'react-dom';
import { ActivationFunction, CellInfo, RendererContext } from 'vscode-notebook-renderer';

export function Cell(props: any): JSX.Element {
  const results: { resultSet: any; queryWithResults: any } = JSON.parse(props.bqrs);
  return <><div>
    <table className='vscode-codeql__result-table'>
      <thead>
        <tr>
          <th className='sort-none'>#</th>
          <th className='sort-none'>Label</th>
        </tr>
      </thead>
      <tbody>
        {results.resultSet.rows.map((rows: any, idx: number) => {
          console.log(rows);
          return rows.map((row: any, index: number) => {
            console.log(row);
            if (
              typeof row === 'string'
              || typeof row === 'number'
              || typeof row === 'boolean'
            ) {
              return (<tr key={index}>
                <td>{(idx + 1) * rows.length + index}</td>
                <td>{row.toString()}</td>
              </tr>);
            }
            if (row.url) {
              return (<tr key={index}>
                <td>{(idx + 1) * rows.length + index}</td>
                <td>
                  <a href={row.url.uri}
                    className="vscode-codeql__result-table-location-link"
                    title={row.label}
                    onClick={() => { jumpTo(row.url, results.queryWithResults.database.databaseUri, props.context); }}
                  >{row.label}</a>
                </td>
              </tr>);
            }
            return (<tr key={index}>
              <td>{(idx + 1) * rows.length + index}</td>
              <td>{row.label}</td>
            </tr>);
          });
        })}
      </tbody>
    </table>
  </div></>;
}


function jumpTo(loc: any, databaseUri: string, context: RendererContext<any>) {
  context.postMessage ? context.postMessage({
    t: 'FromNotebookRendererMessage',
    loc: loc,
    databaseUri: databaseUri
  }) : null;
}

function renderOutput(cellInfo: CellInfo, context: RendererContext<any>) {
  Rdom.render(
    <Cell bqrs={cellInfo.text()} context={context} />,
    cellInfo.element,
  );
}

export const activate: ActivationFunction<any> = (context: RendererContext<any>) => ({
  renderCell: (_id, cellInfo: CellInfo) => {
    renderOutput(cellInfo, context);
    context.onDidReceiveMessage ? context.onDidReceiveMessage((e: any) => {
      console.log(e);
    }) : null;
  }
});

console.log('in Cell.tsx...');
console.log(typeof activate);
