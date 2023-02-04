# Extensio CLI Util

Extensio.js is a utility cli program, designed to handle browser extension development with some batteries included :) .

## Features and limitations
* Load extension just from development directory.
* Reload all extensions by pressing R
* Currently, this tool only supports installed chrome and microsoft edge browser.
* Previous limitation means also that for now is advisable to use this software only on windows, linux will be also compatible but some additional work required :)

## Basic Usage

extensio.js dev <path_to_extension> [--browser|-b]=<browser_name> [--verbose|-v]

Example:
```batch
@echo off
"C:\Program Files\nodejs\node.exe" ./scripts/extensio.js dev C:\Path\To\Your\Extension
```

## AC's & ideas
* Firefox is compatible on linux and windows
* Tool can load initial extension stats.
* Tool can generate boilerplate for new extension.
* Realtime collaboration.
* Virtual filesystem changes with extension.
* Automate extension development with snippets ad triggers.
* Tool can automatically pack extension.
* Extension package can be published via CLI.
* Tool can be used to testing extensions in Playwright (epic)