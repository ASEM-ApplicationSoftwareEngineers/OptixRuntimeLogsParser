document.getElementById('logForm').addEventListener('submit', async (event) => {
    event.preventDefault();

    // Retrieve the selected files from the file list
    const fileList = document.getElementById('fileList');
    const selectedFiles = Array.from(fileList.children).map((li) => li.file);
    if (selectedFiles.length === 0) {
        alert('Please upload at least one log file.');
        return;
    }

    const pagesData = {};
    const pageStack = [];
    const pageCounter = {};
    let capturingNested = false;
    const warnings = [];
    const errors = [];
    const licenseInfo = { demoMode: false, demoModeDuration: 0, totalTokens: 0, components: [] };

    // Read and process all files
    for (const file of selectedFiles) {
        const content = await file.text();
        const lines = content.split('\n');
        for (const line of lines) {
            processLine(line, pagesData, pageStack, pageCounter, capturingNested, warnings, errors, licenseInfo);
        }
    }

    // Generate Markdown output
    const markdownOutput = generateMarkdownOutput(Object.values(pagesData), warnings, errors, licenseInfo);
    document.getElementById('output').textContent = markdownOutput;

    // Enable the download button and set up the download functionality
    const downloadButton = document.getElementById('downloadButton');
    downloadButton.onclick = () => downloadMarkdown(markdownOutput);

    // Render the Markdown content
    renderMarkdown(markdownOutput);

    // Hide the file list and show the output area
    document.getElementById('uploadBlock').style.display = 'none';
    document.getElementById('outputBlock').style.display = 'block';
});

function downloadMarkdown(content) {
    const blob = new Blob([content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'log_output.md';
    a.click();
    URL.revokeObjectURL(url);
}

function renderMarkdown(content) {
    const renderedMarkdown = document.getElementById('renderedMarkdown');
    renderedMarkdown.innerHTML = marked.parse(content); // Use a Markdown library like "marked.js"
}

function trimmedTextOrNull(text) {
    return text.trim().length > 0 ? text.trim() : null;
}

function processLine(line, pagesData, pageStack, pageCounter, capturingNested, warnings, errors, licenseInfo) {
    try {
        const rootMatch = line.match(/AddItem begin \(root\);;([^;]+)/);
        const nestedMatch = line.match(/AddItem begin \(nested root\);;([^;]+)/);
        const endRootMatch = line.match(/AddItem end \(root\);;([^;]+)/);
        const endNestedMatch = line.match(/AddItem end \(nested root\);;([^;]+)/);

        if (rootMatch) {
            const pageName = rootMatch[1].split('/').pop();
            const uniqueName = getUniquePageName(pageName, pageCounter);
            pagesData[uniqueName] = createPageInstance(pageName);
            pageStack.push(uniqueName);
            lastPage = uniqueName;
            capturingNested = false;
        } else if (nestedMatch) {
            const pageName = nestedMatch[1].split('/').pop();
            const uniqueName = getUniquePageName(pageName, pageCounter);
            pagesData[uniqueName] = createPageInstance(pageName);
            pageStack.push(uniqueName);
            capturingNested = true;
        }

        // 08-04-2025 15:44:21.663;DEBUG;urn:FTOptix:WebUI;;Start [Module],0,0,0.000;;
        addPerformanceData(line, pagesData, pageStack, capturingNested);

        if (endNestedMatch) {
            const nestedPage = endNestedMatch[1].split('/').pop();
            if (pageStack.length && pageStack[pageStack.length - 1].startsWith(nestedPage)) {
                pageStack.pop();
            }
        }

        if (endRootMatch) {
            const rootPage = endRootMatch[1].split('/').pop();
            if (pageStack.length && pageStack[pageStack.length - 1].startsWith(rootPage)) {
                pageStack.pop();
            }
        }

        // NativeUI generates an entry for each nested root (+1 for the root page)
        // 05-03-2025 09:34:24.902;DEBUG;urn:FTOptix:NativeUI;;AddItem,1271;;
        const addItemNativeMatch = line.match(/urn:FTOptix:NativeUI;;AddItem,(\d+);;/);
        if (addItemNativeMatch) {
            for (const key in pagesData) {
                if (pagesData[key].totalLoadTime === null) {
                    pagesData[key].totalLoadTime = parseInt(addItemNativeMatch[1], 10);
                    break;
                }
            }
        }

        // WebUI generates a single entry for the root page
        // 08-04-2025 15:44:21.730;DEBUG;urn:FTOptix:WebUI;;AddItem,230;;
        const addItemWebMatch = line.match(/urn:FTOptix:WebUI;;AddItem,(\d+);;/);
        if (addItemWebMatch) {
            for (const key in pagesData) {
                if (pagesData[key].totalLoadTime === null && pagesData[key].nested === false) {
                    pagesData[key].totalLoadTime = parseInt(addItemWebMatch[1], 10);
                    break;
                }
            }
        }

        // Extract warnings
        // 09-04-2025 09:58:03.219;WARNING;urn:FTOptix:CoreBase;;[Message];;[Object]
        const warningMatch = line.match(/WARNING;(.*?);([^;]*);([^;]*);;(.*)/);
        if (warningMatch) {
            warnings.push({
                module: trimmedTextOrNull(warningMatch[1]),
                code: trimmedTextOrNull(warningMatch[2]),
                details: trimmedTextOrNull(warningMatch[3]),
                stack_trace: trimmedTextOrNull(warningMatch[4]),
            });
        }

        // Extract errors
        const errorMatch = line.match(/ERROR;(.*?);([^;]*);([^;]*);(.*);/);
        if (errorMatch) {
            errors.push({
                module: trimmedTextOrNull(errorMatch[1]),
                code: trimmedTextOrNull(errorMatch[2]),
                details: trimmedTextOrNull(errorMatch[3]),
                stack_trace: trimmedTextOrNull(errorMatch[4]),
            });
        }

        // Extract license information
        const demoModeMatch = line.match(/Demo mode started\. FactoryTalk Optix Runtime will be closed in (\d+) minutes/);
        if (demoModeMatch) {
            licenseInfo.demoMode = true;
            licenseInfo.demoModeDuration = parseInt(demoModeMatch[1], 10);
        }

        // 08-04-2025 17:04:11.074;INFO;urn:FTOptix:LicenseManager;;FactoryTalk Optix Runtime is currently using 1 feature token	Component: Native presentation engine consumes 1 feature token	;;
        const tokensMatch = line.match(/FactoryTalk Optix Runtime is currently using (\d+) feature token(?:s)?\s+([^;]*);([^;]*);/);
        if (tokensMatch) {
            const totalTokens = parseInt(tokensMatch[1], 10);
            const components = tokensMatch[2].split('\t').map((component) => component.trim()).filter((component) => component);

            // Add this license entry to the licenseInfo array
            if (!licenseInfo.entries) {
                licenseInfo.entries = [];
            }
            licenseInfo.entries.push({
                totalTokens,
                components,
            });
        }

        // 05-03-2025 09:34:30.771;DEBUG;urn:FTOptix:NativeUI;;Qt create,711;;
        const qtCreateMatch = line.match(/Qt create,(\d+);;/);
        if (qtCreateMatch) {
            for (const key in pagesData) {
                if (pagesData[key].qtCreate === null) {
                    pagesData[key].qtCreate = parseInt(qtCreateMatch[1], 10);
                    break;
                }
            }
        }

        // 05-03-2025 09:34:30.790;DEBUG;urn:FTOptix:NativeUI;;Qt model completed,8;;
        const qtModelMatch = line.match(/Qt model completed,(\d+);;/);
        if (qtModelMatch) {
            for (const key in pagesData) {
                if (pagesData[key].qtModel === null) {
                    pagesData[key].qtModel = parseInt(qtModelMatch[1], 10);
                    break;
                }
            }
        }

        // 05-03-2025 09:34:30.790;DEBUG;urn:FTOptix:NativeUI;;Qt before before rendering,731;;
        const qtTotalMatch = line.match(/Qt before before rendering,(\d+);;/);
        if (qtTotalMatch) {
            for (const key in pagesData) {
                if (pagesData[key].qtTotal === null) {
                    pagesData[key].qtTotal = parseInt(qtTotalMatch[1], 10);
                    break;
                }
            }
        }
    } catch (error) {
        console.error('Error processing line:', error);
    }
}

function getUniquePageName(pageName, pageCounter) {
    if (!pageCounter[pageName]) {
        pageCounter[pageName] = 0;
    }
    pageCounter[pageName]++;
    return `${pageName}_${pageCounter[pageName]}`;
}

function createPageInstance(pageName) {
    return {
        pageName: pageName,
        totalLoadTime: null,
        createNodes: 0,
        uiObjects: 0,
        nodesTime: 0,
        uiTime: 0,
        entries: [],
        nested: false,
        qtCreate: null,
        qtModel: null,
        qtTotal: null
    };
}

function addPerformanceData(line, pagesData, pageStack, capturingNested) {
    if (!pageStack.length) return;

    const currentPage = pageStack[pageStack.length - 1];

    const match = line.match(/Start ([^,]+),(\d+),(\d+),([\d.]+)/);
    if (match) {
        const moduleName = match[1];
        const benchmark1 = parseInt(match[2], 10);
        const benchmark2 = parseInt(match[3], 10);
        if (benchmark1 > 0 || benchmark2 > 0) {
            pagesData[currentPage].entries.push([moduleName, benchmark1, benchmark2]);
        }
    }

    const createMatch = line.match(/Create nodes,(\d+),(\d+),([\d.]+),UI objects,(\d+),(\d+),([\d.]+)/);
    if (createMatch) {
        pagesData[currentPage].createNodes = parseInt(createMatch[2], 10);
        pagesData[currentPage].nodesTime = parseFloat(createMatch[1]);
        pagesData[currentPage].uiObjects = parseInt(createMatch[5], 10);
        pagesData[currentPage].uiTime = parseFloat(createMatch[4]);
    }

    if (capturingNested) {
        pagesData[currentPage].nested = true;
    }
}

function generateMarkdownOutput(pageInstances, warnings, errors, licenseInfo) {
    let output = '# Log files analysis\n\n';

    // Add license information
    if (licenseInfo.demoMode) {
        output += `## License Information\n\n`;
        output += `- **Demo Mode**: Enabled (will close in ${licenseInfo.demoModeDuration} minutes)\n`;
    } else {
        output += `## License Information\n\n`;
        output += `- **Demo Mode**: Disabled\n`;
    }

    if (licenseInfo.entries && licenseInfo.entries.length > 0) {
        output += `### License Entries\n\n`;
        licenseInfo.entries.forEach((entry, index) => {
            output += `#### Entry ${index + 1}\n`;
            output += `- **Total Tokens Used**: ${entry.totalTokens}\n`;
            output += `- **Components**:\n`;
            entry.components.forEach((component) => {
                output += `  - ${component}\n`;
            });
            output += '\n';
        });
    }

    output += '\n';

    for (const instance of pageInstances) {
        const cleanPageName = instance.pageName.replace(/_\d+$/, '');

        if (instance.nested) {
            output += `### Nested page: ${cleanPageName}\n\n`;
            output += `(results might be inaccurate as the page is nested)\n\n`;
        } else {
            output += `## Page: ${cleanPageName}\n\n`;
        }

        output += `Load time: `;
        if (instance.totalLoadTime === null) {
            output += 'n/a\n\n';
        } else {
            output += `${formattedValue(instance.totalLoadTime)} ms\n\n`;
        }

        output += `- Nodes: ${instance.createNodes} (${formattedValue(instance.nodesTime)} ms)\n`;
        output += `- UI Objects: ${instance.uiObjects} (${formattedValue(instance.uiTime)} ms)\n\n`;

        if (instance.entries.length) {
            for (const [moduleName, benchmark1, benchmark2] of instance.entries) {
                output += `- ${moduleName}: ${formattedValue(benchmark2)} (${formattedValue(benchmark1)} ms)\n\n`;
            }
        }

        // Add Qt performance data
        if (instance.qtCreate !== null) {
            output += `- Qt create: ${formattedValue(instance.qtCreate)} ms\n`;
        }
        if (instance.qtModel !== null) {
            output += `- Qt model: ${formattedValue(instance.qtModel)} ms\n`;
        }
        if (instance.qtTotal !== null) {
            output += `- Qt total: ${formattedValue(instance.qtTotal)} ms\n`;
        }
        output += '\n';
    }

    // Add warnings section
    if (warnings.length > 0) {
        output += '## Warnings\n\n';
        warnings.forEach((warning, index) => {
            output += `### Warning ${index + 1}\n`;
            if (warning.module) {
                output += `- **Module**: ${warning.module}`;
                if (!warning.module.includes('urn:FTOptix')) {
                    output += ` (not a FactoryTalk Optix module)`;
                }
                output += `\n\n`;
            }
            if (warning.code) {
                output += `- **Code**: ${warning.code}\n\n`;
            }
            if (warning.details) {
                output += `- **Message**: ${warning.details}\n\n`;
            }
            if (warning.stack_trace) {
                output += `- **Stack Trace**: ${warning.stack_trace}\n\n`;
            }
        });
    }

    // Add errors section
    if (errors.length > 0) {
        output += '## Errors\n\n';
        errors.forEach((error, index) => {
            output += `### Error ${index + 1}\n`;
            output += `- **Module**: ${error.module}`;
            if (!error.module.includes('urn:FTOptix')) {
                output += ` (not a FactoryTalk Optix module)`;
            }
            output += `\n\n`;
            if (error.code) {
                output += `- **Code**: ${error.code}\n\n`;
            }
            if (error.details) {
                output += `- **Message**: ${error.details}\n\n`;
            }
            if (error.stack_trace) {
                output += `- **Stack Trace**: ${error.stack_trace}\n\n`;
            }
        });
    }

    return output;
}

function formattedValue(value) {
    return value % 1 === 0 ? value.toString() : value.toFixed(2).replace(/\.?0+$/, '');
}