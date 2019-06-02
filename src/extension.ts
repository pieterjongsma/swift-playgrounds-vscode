import * as vscode from 'vscode';

import PlaygroundEditor from "./playground_editor";

let playgroundEditors: Map<vscode.Uri, PlaygroundEditor> = new Map();


function runPlayground(context: vscode.ExtensionContext, editor: vscode.TextEditor) {
	const playgroundEditor = playgroundEditors.get(editor.document.uri) || new PlaygroundEditor(context, editor);
	playgroundEditors.set(editor.document.uri, playgroundEditor);
	playgroundEditor.run();
}


export function activate(context: vscode.ExtensionContext) {
	vscode.workspace.onDidSaveTextDocument(document => {
		const editor = playgroundEditors.get(document.uri);
		if (editor) {
			editor.run();
		}
	});

	vscode.workspace.onDidChangeTextDocument(event => {
		// FIXME: Should respond to changes
	});

	context.subscriptions.push(vscode.commands.registerCommand('swiftplayground.start', () => {
		const lastEditor = vscode.window.activeTextEditor;
		if (!lastEditor) {
			return; // FIXME: Raise error
		}

		runPlayground(context, lastEditor);
	}));

	// FIXME: During debug, activate immediately
	// vscode.commands.executeCommand("swiftplayground.start");
}

export function deactivate() {
	playgroundEditors.clear(); // Release
}
