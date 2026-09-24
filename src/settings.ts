import { App, debounce, PluginSettingTab, Setting } from 'obsidian';
import SyntaxTreeGenerator from './main';

export interface SyntaxTreeGeneratorSettings {
	terminal_lines: boolean;
}

export const DEFAULT_SETTINGS: SyntaxTreeGeneratorSettings = {
	terminal_lines: true,
};

export class SyntaxTreeGeneratorSettingsTab extends PluginSettingTab {
	plugin: SyntaxTreeGenerator;

	constructor(app: App, plugin: SyntaxTreeGenerator) {
		super(app, plugin);
		this.plugin = plugin;
	}

	getSettingDefinitions() {
		return [
			{
				name: 'Terminal lines',
				desc: 'If enabled, terminal nodes are treated exactly the same as non-terminals with respect to placement and line drawing. Otherwise terminal nodes are placed on a new line after their parents, and no lines will be drawn between them.',
				default: DEFAULT_SETTINGS.terminal_lines,
				render: (setting) =>{
					setting
			 		.addToggle((toggle) =>
			 			toggle
			 				.setValue(this.plugin.settings.terminal_lines)
			 				.onChange(async (value: boolean) => {
			 					this.plugin.settings.terminal_lines = value;
        						await this.plugin.saveData(this.plugin.settings);
			 					this.plugin.refreshDiagrams();
			 				})
					)
					
				},
				
			},
		];
	}
}
