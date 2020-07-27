import { injectable, inject } from "inversify";
import URI from "@theia/core/lib/common/uri";
import { CommandContribution, CommandRegistry, MenuContribution, MenuModelRegistry } from "@theia/core/lib/common";

import { CommonMenus, StatusBarEntry, StatusBar } from "@theia/core/lib/browser";
import { KeybindingContribution, KeybindingRegistry } from "@theia/core/lib/browser";
import {  QuickOpenModel, QuickOpenItem, QuickOpenOptions, QuickOpenMode } from "@theia/core/lib/browser";
import { QuickOpenHandler, QuickOpenService, QuickOpenContribution, QuickOpenHandlerRegistry } from "@theia/core/lib/browser";
import { open, FrontendApplicationContribution, Endpoint, OpenerService } from "@theia/core/lib/browser";

import { WorkspaceService } from "@theia/workspace/lib/browser";


export const OpenQuickFileCommand = {
    id: 'open.quick.file.command',
    label: "Open Quick File..."
};

export enum StatusBarAlignment {
    LEFT, RIGHT
};

export class StatusBarItem implements StatusBarEntry {
    text: string;
    alignment: StatusBarAlignment;
    color?: string;
    className?: string;
    tooltip?: string;
    command?: string;
    arguments?: any[];
    priority?: number;
    onclick?: (e: MouseEvent) => void;
};

@injectable()
export class TheiaTrainingFrontendContribution implements QuickOpenHandler, CommandContribution, MenuContribution, KeybindingContribution, FrontendApplicationContribution, QuickOpenContribution {

    readonly prefix = 'file';
    readonly description = 'Quick File';
    readonly items: QuickOpenItem[];


    @inject(StatusBar)
    protected readonly statusBar: StatusBar;

    @inject(QuickOpenService)
    protected readonly quickOpenService: QuickOpenService;

    @inject(WorkspaceService)
    protected readonly workspaceService: WorkspaceService;

    @inject(OpenerService)
    protected readonly openereService: OpenerService;

    registerCommands(registry: CommandRegistry): void {
        // TODO: Add `Open Quick File...` command.
        // Use `CommandRegistry.registerCommand` to register a new command.
        // The command should call `this.open` for the first workspace root, i.e. `this.workspaceService.tryGetRoots()[0]`.
        // if there is no workspace root then the command should not be visible and enabled.
        registry.registerCommand(OpenQuickFileCommand, {
            execute: () => {
                if (this.workspaceService.tryGetRoots()[0]) {
                    this.open('/workspace');
                }
            }
        });
    }

    registerKeybindings(registry: KeybindingRegistry): void {
        // TODO: Add `ctrlcmd+k` keybinding for `Open Quick File...` command.
        // Use `KeybindingRegistry.registerKeybinding` to register a new keybinding.
        registry.registerKeybinding({
            command: OpenQuickFileCommand.id,
            context: 'Keybinding',
            keybinding: "ctrlcmd+k"
        });
    }

    registerMenus(registry: MenuModelRegistry): void {
        // TODO: Add `Open Quick File...` menu item in `CommonMenus.FILE_OPEN` menu path.
        // Use `MenuModelRegistry.registerMenuAction` to register a new menu action.
        registry.registerMenuAction(CommonMenus.FILE_OPEN, {
            commandId: OpenQuickFileCommand.id,
            label: OpenQuickFileCommand.label
        });
    }

    onStart(): void {
        // TODO: Add `Open Quick File...` status bar item with file icon aligned left
        // Use `StatusBar.setElement` to add a new status bar entry.
        const statusBarItem = new StatusBarItem();
        statusBarItem.alignment = StatusBarAlignment.LEFT;
        statusBarItem.text = 'Status Bar Text';
        this.statusBar.setElement(OpenQuickFileCommand.id, statusBarItem);
    }

    getModel(): QuickOpenModel {
        return {
            onType: (lookFor: string, acceptor: (items: QuickOpenItem[]) => void) => {
                acceptor(this.items);
            }
        };
    }

    getOptions(): QuickOpenOptions {
        return {};
    }

    registerQuickOpenHandlers(handlers: QuickOpenHandlerRegistry): void {
        /* BONUS: reimplement like QuickOpenHandler */
        // Use IDE features like content assist, reference navigation and hover to learn how to use `QuickOpenHandler`.
        // handlers.registerHandler(this);
        handlers.registerHandler(this);
    }

    protected async open(current: string, path: string[] = []): Promise<void> {
        const listFilesUrl = new Endpoint({ path: 'listFiles' }).getRestUrl();
        const url = listFilesUrl.withQuery(current).toString();
        const response = await fetch(url);
        const files: string[] = await response.json();
        const items: QuickOpenItem[] = files.map(file => new QuickOpenItem({
            label: file,
            run: mode => {
                if (mode === QuickOpenMode.OPEN) {
                    const currentUri = new URI(current);
                    const fileUri = currentUri.withPath(currentUri.path.join(file));
                    if (fileUri.path.ext && fileUri.path.name) {
                        open(this.openereService, fileUri);
                    } else {
                        path.push(current);
                        this.open(fileUri.toString(true), path);
                    }
                    return true;
                }
                return false;
            }
        }));
        if (path.length) {
            items.unshift(new QuickOpenItem({
                label: '..',
                run: mode => {
                    if (mode === QuickOpenMode.OPEN) {
                        this.open(path.pop()!, path);
                        return true;
                    }
                    return false;
                }
            }));
        }
        this.quickOpenService.open({
            onType: (_, acceptor) => acceptor(items)
        }, {
            fuzzyMatchLabel: true,
            placeholder: 'Type file name...'
        });
    }

}