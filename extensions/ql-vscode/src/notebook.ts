/* eslint-disable @typescript-eslint/camelcase */
import { TextDecoder } from 'util';
import { CancellationToken, notebook, NotebookCell, NotebookCellData, NotebookCellKind, NotebookCellOutput, NotebookCellOutputItem, NotebookContentProvider, NotebookController, NotebookData, NotebookDocument, NotebookDocumentBackup, NotebookDocumentMetadata, Uri, workspace } from 'vscode';
import { CodeQLCliServer } from './cli';
import { DatabaseItem } from './databases';
import { QueryServerClient } from './queryserver-client';
import { compileAndRunNotebookAgainstDatabase } from './run-queries';

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
            cell.metadata?.language_info?.name || 'QL'
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

export class CodeQlNotebookController {

  private _controller: NotebookController;
  private _cliServer: CodeQLCliServer;
  private _queryServerClient: QueryServerClient;
  private _dbm: DatabaseItem;

  constructor(cliServer: CodeQLCliServer, queryServerClient: QueryServerClient, dbm: DatabaseItem) {
    this._cliServer = cliServer;
    this._queryServerClient = queryServerClient;
    this._dbm = dbm;

    this._controller = notebook.createNotebookController('codeql-notebook-controller', 'codeql-notebook-provider', 'codeql-notebook',
      (cells: NotebookCell[], _notebook: NotebookDocument, _controller: NotebookController) => {
        cells.forEach((cell, index) => {
          const exec = this._controller.createNotebookCellExecutionTask(cell);
          exec.executionOrder = index;
          exec.start({ startTime: Date.now() });
          compileAndRunNotebookAgainstDatabase(
            this._cliServer, this._queryServerClient, this._dbm, [cell.document.getText()], _notebook.uri,
            () => { null; }, // TODO: use a real ProgressCallback
            exec.token
          ).then((results) => {
            const resultPathOutputItem = NotebookCellOutputItem.text(results.query.resultsPaths.resultsPath);
            resultPathOutputItem.mime = 'github.codeql-notebook/bqrs-ref';
            exec.replaceOutput([new NotebookCellOutput(
              [resultPathOutputItem,
                NotebookCellOutputItem.text(results.query.resultsPaths.resultsPath)] // TODO: use a meaningful result here
            )]);
            exec.end({ success: true });
          }, (reason) => {
            exec.replaceOutput([new NotebookCellOutput([NotebookCellOutputItem.error(reason)])]);
            exec.end({ success: false });
          });
        });
      });
  }

  dispose(): void {
    this._controller.dispose();
  }
}

export class CodeQlBQRSRefRenderer {

}

