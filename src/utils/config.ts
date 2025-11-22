import * as fs from 'fs';
import * as path from 'path';
import { DocPlsConfig } from '../types';

export class ConfigLoader {
    private static readonly CONFIG_FILE = '.docsplsrc';
    private static readonly DEFAULT_CONFIG: DocPlsConfig = {
        mcpServer: '',
        defaultDocumentationFormat: 'markdown'
    };

    static loadConfig(projectPath: string = process.cwd()): DocPlsConfig {
        const configPath = path.join(projectPath, this.CONFIG_FILE);

        if (fs.existsSync(configPath)) {
            try {
                const configFile = fs.readFileSync(configPath, 'utf-8');
                const userConfig = JSON.parse(configFile);
                return { ...this.DEFAULT_CONFIG, ...userConfig };
            } catch (error) {
                console.warn(`Failed to parse ${this.CONFIG_FILE}, using defaults:`, error);
                return this.DEFAULT_CONFIG;
            }
        }

        return this.DEFAULT_CONFIG;
    }

    static createDefaultConfig(projectPath: string = process.cwd()): void {
        const configPath = path.join(projectPath, this.CONFIG_FILE);

        if (!fs.existsSync(configPath)) {
            try {
                fs.writeFileSync(
                    configPath,
                    JSON.stringify(this.DEFAULT_CONFIG, null, 2),
                    'utf-8'
                );
                console.log(`Created default configuration at ${configPath}`);
            } catch (error) {
                console.error(`Failed to create ${this.CONFIG_FILE}:`, error);
            }
        }
    }
}
