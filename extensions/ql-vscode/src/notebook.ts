/* eslint-disable @typescript-eslint/camelcase */
import { NotebookContentProvider, workspace, NotebookData, Uri, NotebookDocumentBackup, NotebookCellData, NotebookCellKind, NotebookCellOutput, NotebookDocumentMetadata, NotebookDocument, CancellationToken } from 'vscode';
import { TextDecoder } from 'util';

export class CodeQlNotebookProvider implements NotebookContentProvider {

  private _notebooks: Map<string, { cells: {}; metadata: {} }> = new Map();

  async openNotebook(uri: Uri): Promise<NotebookData> {
    const content = JSON.parse((await workspace.fs.readFile(uri)).toString());

    this._notebooks.set(uri.toString(), content);

    return new NotebookData(
      content.cells.map((cell: any) => {
        if (cell.cell_type === 'markdown') {
          return new NotebookCellData(
            NotebookCellKind.Markup,
            cell.source instanceof Array ? cell.source.join('\n') : cell.source,
            'markdown'
          );
        }
        if (cell.cell_type === 'code') {
          return new NotebookCellData(
            NotebookCellKind.Code,
            cell.source instanceof Array ? cell.source.join('\n') : cell.source,
            content.metadata?.language_info?.name || 'python'
          );
        }
        console.error('Unexpected cell:', cell);
        return null;
      }),
      new NotebookDocumentMetadata()
    );
  }

  // The following are dummy implementations to be filled in later.
  async resolveNotebook(): Promise<void> {
    // not implemented
  }

  async saveNotebook(document: NotebookDocument, token: CancellationToken): Promise<void> {
    this._save(document, document.uri, token);
  }

  async saveNotebookAs(targetResource: Uri, document: NotebookDocument, token: CancellationToken): Promise<void> {
    this._save(document, targetResource, token);
  }

  async backupNotebook(): Promise<NotebookDocumentBackup> {
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    return { id: '', delete: () => { } };
  }

  async _save(document: NotebookDocument, targetResource: Uri, _token: CancellationToken): Promise<void> {
    const cells: {}[] = [];

    document.getCells().forEach(cell => {
      const source = cell.document.getText().split(/\r|\n|\r\n/g);
      if (cell.kind === NotebookCellKind.Markup) {
        cells.push({
          source: source,
          metadata: {
            language_info: {
              name: cell.document.languageId || 'markdown'
            }
          },
          cell_type: 'markdown'
        });
      } else {
        cells.push({
          source: source,
          metadata: {
            language_info: {
              name: cell.document.languageId || 'markdown'
            }
          },
          cell_type: 'code',
          outputs: cell.outputs.map(output => serializeOutput(output)),
          execution_count: cell.metadata?.executionOrder
        });
      }
    });

    const content = this._notebooks.get(document.uri.toString()) || { cells: null };
    content.cells = cells;
    await workspace.fs.writeFile(targetResource, Buffer.from(JSON.stringify(content, null, 4)));
  }
}

interface CellStreamOutput {
  output_type: 'stream';
  text: string;
}

interface CellErrorOutput {
  output_type: 'error';
  /**
   * Exception Name
   */
  ename: string;
  /**
   * Exception Value
   */
  evalue: string;
  /**
   * Exception call stack
   */
  traceback: string[];
}

interface CellDisplayOutput {
  output_type: 'display_data';
  data: { [key: string]: any };
}

export type RawCellOutput = CellStreamOutput | CellErrorOutput | CellDisplayOutput;

function serializeOutput(output: NotebookCellOutput): RawCellOutput {
  let op = output.outputs.find(op => op.mime === 'application/x.notebook.stream');
  if (op) {
    return {
      output_type: 'stream',
      text: new TextDecoder().decode(op?.data)
    };
  }
  op = output.outputs.find(op => op.mime === 'application/x.notebook.error-traceback');
  if (op) {
    return {
      output_type: 'error',
      ename: (op as any).ename,
      evalue: (op as any).evalue,
      traceback: (op as any).traceback
    };
  }

  const data: { [key: string]: unknown } = {};
  output.outputs.forEach(op => {
    data[op.mime] = data.value;
  });
  return {
    output_type: 'display_data',
    data: data
  };
}
