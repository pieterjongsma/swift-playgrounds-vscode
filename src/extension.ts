import * as vscode from 'vscode';

import * as path from 'path';
import * as fs from 'fs';

import PlaygroundEditor from "./playground_editor";
import { parentDirMatching } from 'util/file';
import { PLAYGROUND_REGEX } from 'playground';

let playgroundEditors: Map<vscode.Uri, PlaygroundEditor> = new Map();


function runPlayground(context: vscode.ExtensionContext, editor: vscode.TextEditor) {
	const playgroundEditor = playgroundEditors.get(editor.document.uri) || new PlaygroundEditor(context, editor);
	playgroundEditors.set(editor.document.uri, playgroundEditor);
	playgroundEditor.run();
}

function copyPlaygroundTemplateFile(context: vscode.ExtensionContext, editor: vscode.TextEditor | undefined, file: string) {
	if (!editor) {
		vscode.window.showErrorMessage("No playground is opened");
		return;
	}

	const playgroundDirectory = parentDirMatching(editor.document.uri.fsPath, PLAYGROUND_REGEX);
	if (playgroundDirectory) {
		fs.copyFileSync(
			path.join(context.extensionPath, "build", "template.playground", file),
			path.join(playgroundDirectory, file)
		);
	} else {
		vscode.window.showErrorMessage("Current file is not inside a .playground folder");
	}
}


export function activate(context: vscode.ExtensionContext) {
	context.subscriptions.push(vscode.commands.registerCommand('swiftplayground.start', () => {
		const lastEditor = vscode.window.activeTextEditor;
		if (!lastEditor) {
			vscode.window.showErrorMessage("Failed to activate Swift Playgrounds");
			return;
		}

		runPlayground(context, lastEditor);
	}));

	context.subscriptions.push(vscode.commands.registerCommand("swiftplayground.copy.manifest", () => {
		copyPlaygroundTemplateFile(context, vscode.window.activeTextEditor, "Package.swift");
	}));

	vscode.workspace.onDidSaveTextDocument(document => {
		console.log("Document saved", event);
		const editor = playgroundEditors.get(document.uri);
		if (editor) {
			editor.run();
		}
	});

	vscode.workspace.onDidChangeTextDocument(event => {
		// console.log("Document changed", event);
		// TODO: Should respond to changes
	});

	vscode.workspace.onDidCloseTextDocument(event => {
		console.log("Document closed");
	});
}

export function deactivate() {
	playgroundEditors.clear(); // Release
}
