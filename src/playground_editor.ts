import * as vscode from 'vscode';
import * as os from 'os';
import * as fs from 'fs';
import * as math from 'mathjs';

import Playground from "./playground";
import { LogRecord, LineIndex } from "./models";


const colorMap = {
	default: "#ff1111"
};


export default class PlaygroundEditor {

    playground: Playground;

	context: vscode.ExtensionContext;
    textEditor: vscode.TextEditor;
    outputChannel: vscode.OutputChannel;
    decorationType: vscode.TextEditorDecorationType;

    records: LogRecord[] = [];

	hasProducedOutput = false;

    constructor(context: vscode.ExtensionContext, textEditor: vscode.TextEditor) {
		this.context = context;
        this.textEditor = textEditor;
        this.outputChannel = vscode.window.createOutputChannel("Swift Playground Output");
        this.decorationType = this.createDecorationType();

        this.playground = this.createPlayground(context, textEditor);
    }

    run() {
        this.clear();

		this.playground.run(
			(json) => {
				console.log(json);
				this.handlePlaygroundOutput(json as unknown as LogRecord);
			},
			(stdout) => {
				this.appendToOutput(stdout.toString());
			},
			(stderr) => {
				this.appendToOutput(stderr);
			}
		)
		.then(() => {
			console.log("Playground exited");
		})
		.catch((error: any) => {
			console.error("Playground failed to execute", error);
		});
    }

	handlePlaygroundOutput(json: LogRecord) {
		console.log(json);
		const record = json as LogRecord;
		this.records.push(record);

		const lines = Line.forRecords(this.records);
		const decorations = lines.map(line => line.decoration());

		this.textEditor.setDecorations(this.decorationType, decorations);
	}

    clear() {
		this.records = [];

        this.outputChannel.clear();
		this.hasProducedOutput = false;

        this.textEditor.setDecorations(this.decorationType, []);
    }

	appendToOutput(content: string) {
		if (!this.hasProducedOutput) { this.outputChannel.show(); }
		this.hasProducedOutput = true;
		this.outputChannel.append(content);
	}

    createDecorationType(): vscode.TextEditorDecorationType {
        return vscode.window.createTextEditorDecorationType({
			after: {
				margin: `0 0 0 3em`,
				textDecoration: "none"
			},
			isWholeLine: true,
			rangeBehavior: 1,
			overviewRulerLane: 1
		});
    }

    createPlayground(context: vscode.ExtensionContext, editor: vscode.TextEditor): Playground {
		const storagePath = context.storagePath || os.tmpdir();
		if (!fs.existsSync(storagePath)) {
			fs.mkdirSync(storagePath);
		}
		const playground = new Playground(editor.document.fileName, context.extensionPath, storagePath);
		return playground;
    }

}

export class Line {
    index: LineIndex;
    records: LogRecord[] = [];

	static forRecords(records: LogRecord[]): Line[] {
		let lines: Map<LineIndex, Line> = new Map();
		records.forEach(record => {
			// Subtract 1 from 'sl' because it is a line number, not an index
			const recordLineIndices = math.range(record.range.sl-1, record.range.el);
			recordLineIndices.forEach(index => {
				const line = lines.get(index);
				if (line) {
					line.records.push(record);
				} else {
					const newLine = new Line(index);
					lines.set(index, newLine);
					newLine.records.push(record);
				}
			});
		});

		console.log(records, lines);

		return Array.from(lines.values());
	}

    constructor(index: LineIndex) {
        this.index = index;
    }

	get stringRepresentation(): string {
		const ellipsis = " ...";

		let truncLength: number = math.max(
			vscode.workspace
				.getConfiguration("swift-playgrounds")
				.get("truncationLength") || 0,
			ellipsis.length
		);
		
		var representation = this.extendedStringRepresentation;
		if (representation.length > truncLength) {
			// Representation too long: try a short representation
			representation = this.shortStringRepresentation;
		}
		if (representation.length > truncLength) {
			// Representation still too long: truncate
			representation = representation.slice(0, truncLength - ellipsis.length) + ellipsis;
		}

		return representation;
	}

	get extendedStringRepresentation(): string {
		const clean = (string: string): string => {
			return string
				.replace(/(\r\n|\n|\r)/gm, "") // Remove linebreaks
				.replace(/\s{2,}/g, ' '); // Remove extraneous whitespace
		};

		return this.records.map(record => {
			if (record.name && record.object) {
				return clean(record.object);
				// return `${record.name}: ${record.object}`;
			} else if (record.name) {
				return record.name;
			} else if (record.object) {
				return clean(record.object);
			} else {
				return null;
			}
		})
		.filter(e => e) // Remove null elements
		.join(', ');
	}

	get shortStringRepresentation(): string {
		const logRecords = this.records.filter(r => r.api === "builtin_log");
		if (logRecords.length > 1) {
			return `(${logRecords.length} times)`;
		}

		// No short representation exists
		return this.extendedStringRepresentation;
	}

	decoration(): vscode.DecorationOptions {
		return {
			// hoverMessage: "Swift Playground output",
			range: new vscode.Range(this.index, 0, this.index, 0),
			renderOptions: {
				after: {
					contentText: this.stringRepresentation,
					fontWeight: "normal",
					fontStyle: "normal",
					color: colorMap["default"]
				}
			}
		};
	}
}
