import * as vscode from 'vscode';

import PlaygroundEditor from "./playground_editor";

let playgroundEditors: Map<vscode.Uri, PlaygroundEditor> = new Map();


function runPlayground(context: vscode.ExtensionContext, editor: vscode.TextEditor) {
	const playgroundEditor = playgroundEditors.get(editor.document.uri) || new PlaygroundEditor(context, editor);
	playgroundEditors.set(editor.document.uri, playgroundEditor);
	playgroundEditor.run();
}


export function activate(context: vscode.ExtensionContext) {
	context.subscriptions.push(vscode.commands.registerCommand('swiftplayground.start', () => {
		const lastEditor = vscode.window.activeTextEditor;
		if (!lastEditor) {
			return; // FIXME: Show warning that editor could not be activated
		}

		runPlayground(context, lastEditor);
	}));

	vscode.workspace.onDidSaveTextDocument(document => {
		console.log("Document saved", event);
		const editor = playgroundEditors.get(document.uri);
		if (editor) {
			editor.run();
		}
	});

	vscode.workspace.onDidChangeTextDocument(event => {
		console.log("Document changed", event);
		// FIXME: Should respond to changes
	});

	vscode.workspace.onDidCloseTextDocument(event => {
		console.log("Document closed");
	});
}

export function deactivate() {
	playgroundEditors.clear(); // Release
}
