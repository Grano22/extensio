/*const chalk = require('chalk');
const { Command } = require('commander');
const figlet = require("figlet");
const readline = require('readline');*/

import ExtensionEnvManager from "./extensionEnvManager";
import * as readline from "readline";
import chalk from "chalk";
import {Command} from "commander";
import figlet from 'figlet';
import os from "os";

(async () => {
    const program = new Command();

    program
        .name('extensio')
        .addHelpText('beforeAll', figlet.textSync("Exensio"))
        .description('CLI to handle developing browser extensions')
        .version('0.0.1');

    program.command('dev')
        .description('Create extension development environment')
        .usage(chalk.green('dev <extensionPath> [-v Verbose]'))
        .addHelpCommand('h', 'Hello')
        .argument('<extensionPath>', 'Extension path or name')
        .option('-v, --verbose', 'Run with verbose logging')
        .option(
            '-b, --browser <browser>',
            'Switch browser',
            os.type().toLowerCase().startsWith('windows') ?
                'MicrosoftEdge' :
                'Firefox'
        )
        .action(
            async (extensionPath, options) => {
                try {
                    if (options.verbose)
                        console.info('Starting extension development env...');

                    const extensionEnvManager = new ExtensionEnvManager({
                        extensionPath,
                        browserName: options.browser || 'none'
                    });
                    console.info(extensionPath);

                    await extensionEnvManager.start();

                    console.info(`Press R to reload extension, or press Q to quit`);

                    readline.emitKeypressEvents(process.stdin);

                    process.stdin.on('keypress', (ch, key) => {
                        if (key && key.name === 'r') {
                            console.log('Reloading extensions...');

                            void extensionEnvManager.reloadAllExtensions();
                        } else if (key && key.name === 'q') {
                            process.exit();
                        }
                    });

                    process.stdin.setRawMode(true);
                    process.stdin.resume();
                } catch(err) {
                    console.error(err.message);

                    process.exit(1);
                }
            }
        );

    program.parse(process.argv);
})();