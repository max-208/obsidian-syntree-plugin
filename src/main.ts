import { Plugin } from 'obsidian';
import {
	DEFAULT_SETTINGS,
	SyntaxTreeGeneratorSettings,
	SyntaxTreeGeneratorSettingsTab,
} from './settings';
import go from './syntree';

export default class SyntaxTreeGenerator extends Plugin {
	settings!: SyntaxTreeGeneratorSettings;
	private diagramRenderers = new Map<HTMLCanvasElement, () => void>();

	async onload() {
		await this.loadSettings();

		this.addSettingTab(new SyntaxTreeGeneratorSettingsTab(this.app, this));

		function generateDiagram(settings:SyntaxTreeGeneratorSettings, canvas:HTMLCanvasElement, source:string ){
			
			// we use the css vars to fit theme
			function getCssVar(name: string): string {
    			return getComputedStyle(document.body)
    			    .getPropertyValue(name)
    			    .trim();
			}
			// filter to get actual font
			const font = getCssVar("--font-text")
				.replaceAll("'??'",'')
				.replaceAll(',','')
				.trim()
				.split(" ")[0] ?? "Sans-Serif"; 
			const font_size = Number.parseInt(getCssVar("--font-text-size").replace('px',''));
			const node_color = getCssVar("--text-normal");
			const node_terminal_color = getCssVar("--text-accent");
			const line_color = getCssVar("--text-faint");
			const background_color = getCssVar("--background-secondary-alt");
			go(
				canvas,
				source,
				font_size, 
				font,
				settings.terminal_lines,
				node_color, 
				node_terminal_color,
				line_color,
				background_color
			)	
		}

		this.registerMarkdownCodeBlockProcessor('syntree', (source, el, ctx) => {

			const scoller = el.createDiv({cls: 'syntree-scroller-container'})
			const canvas : HTMLCanvasElement = scoller.createEl('canvas',{cls: 'syntree-canvas'});
			const render = () => generateDiagram(this.settings, canvas, source);

			this.diagramRenderers.set(canvas, render);
			render();

		})
		// dynamically reload when the theme has changed
		this.app.workspace.on("css-change", () => {
			this.refreshDiagrams();
		})
	}

	onunload() {}

	refreshDiagrams() {
		for (const [canvas, render] of this.diagramRenderers) {
			if (!canvas.isConnected) {
				this.diagramRenderers.delete(canvas);
				continue;
			}
			render();
		}
	}

	async loadSettings() {
		this.settings = Object.assign(
			{},
			DEFAULT_SETTINGS,
			(await this.loadData()) as Partial<SyntaxTreeGeneratorSettings>,
		);
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}

