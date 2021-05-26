import { NotebookContentProvider, workspace, NotebookData, Uri, NotebookDocumentBackup, NotebookCellData, NotebookCellKind, NotebookDocumentMetadata } from 'vscode';

export class CodeQlNotebookProvider implements NotebookContentProvider {
  async openNotebook(uri: Uri): Promise<NotebookData> {
    const content = JSON.parse((await workspace.fs.readFile(uri)).toString());
    const cells = content.cells.map((cell: any) => {
      if (cell.cell_type === 'markdown') {
        return new NotebookCellData(
          NotebookCellKind.Markup,
          cell.source,
          'markdown',
          []
          // TODO: metadata
        );
      } else if (cell.cell_type === 'code') {
        return new NotebookCellData(
          NotebookCellKind.Markup,
          cell.source,
          content.metadata?.language_info?.name || 'python',
          [
            /* not implemented */
          ]
          // TODO: metadata

        );
      } else {
        console.error('Unexpected cell:', cell);
      }
    });
    const metadata = new NotebookDocumentMetadata();
    return new NotebookData(cells, metadata);
  }

  // The following are dummy implementations to be filled in later.
  async resolveNotebook(): Promise<void> {
    // not implemented
  }
  async saveNotebook(): Promise<void> {
    // not implemented
  }
  async saveNotebookAs(): Promise<void> {
    // not implemented
  }
  async backupNotebook(): Promise<NotebookDocumentBackup> {
    return { id: '', delete: () => { /* trivial */ } };
  }
}
