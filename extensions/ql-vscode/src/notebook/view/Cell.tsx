import * as React from 'react';
// import { useState, useEffect } from 'react';
import * as Rdom from 'react-dom';
import { ActivationFunction, CellInfo } from 'vscode-notebook-renderer';



export function Cell(props: any): JSX.Element {
  return <><div>
    <p>Running from inside the cell!</p>
    <p>BQRS path is {props.bqrsPath}</p>
  </div>
  </>;
}

function renderOutput(cellInfo: CellInfo) {
  Rdom.render(
    <Cell bqrsPath={cellInfo.text()} />,
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
